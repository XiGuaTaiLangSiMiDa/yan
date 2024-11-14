const express = require('express');
const path = require('path');
const Binance = require('node-binance-api');
const { RSI } = require('technicalindicators');

const app = express();
const binance = new Binance();
const port = 3000;

// 服务静态文件
app.use(express.static(path.join(__dirname)));

// 分析订单簿深度数据
function analyzeOrderBookLevels(depth, currentPrice, sensitivity = 0.001) {
    const volumeMap = new Map();
    
    depth.bids.forEach(([price, volume]) => {
        price = parseFloat(price);
        volume = parseFloat(volume);
        const roundedPrice = Math.round(price / sensitivity) * sensitivity;
        volumeMap.set(roundedPrice, (volumeMap.get(roundedPrice) || 0) + volume);
    });
    
    depth.asks.forEach(([price, volume]) => {
        price = parseFloat(price);
        volume = parseFloat(volume);
        const roundedPrice = Math.round(price / sensitivity) * sensitivity;
        volumeMap.set(roundedPrice, (volumeMap.get(roundedPrice) || 0) + volume);
    });
    
    const significantLevels = Array.from(volumeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([price, volume]) => ({
            price,
            volume,
            type: price < currentPrice ? 'support' : 'resistance'
        }));
    
    return significantLevels;
}

// 计算支撑位和阻力位
function findSupportResistanceLevels(klines, sensitivity = 0.02) {
    const levels = new Map();
    
    klines.forEach(kline => {
        const high = parseFloat(kline[2]);
        const low = parseFloat(kline[3]);
        const volume = parseFloat(kline[5]);
        
        const roundedHigh = Math.round(high * 100) / 100;
        const roundedLow = Math.round(low * 100) / 100;
        
        levels.set(roundedHigh, (levels.get(roundedHigh) || 0) + volume);
        levels.set(roundedLow, (levels.get(roundedLow) || 0) + volume);
    });
    
    const significantLevels = Array.from(levels.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([price, volume]) => ({
            price: parseFloat(price),
            volume
        }));
    
    return significantLevels;
}

// API endpoint for analysis data
app.get('/api/analysis', async (req, res) => {
    try {
        // 获取K线数据
        const klines = await binance.futuresCandles('GMTUSDT', '4h', { limit: 200 });
        
        // 获取当前价格
        const ticker = await binance.futuresPrices();
        const currentPrice = parseFloat(ticker.GMTUSDT);
        
        // 获取深度订单簿数据
        const depth = await binance.futuresDepth('GMTUSDT', { limit: 500 });
        
        // 计算历史支撑位和阻力位
        const historicalLevels = findSupportResistanceLevels(klines);
        
        // 分析订单簿深度
        const orderBookLevels = analyzeOrderBookLevels(depth, currentPrice);
        
        // 计算RSI
        const closes = klines.map(k => parseFloat(k[4]));
        const rsiInput = {
            values: closes,
            period: 14
        };
        const rsiValues = RSI.calculate(rsiInput);
        const currentRSI = rsiValues[rsiValues.length - 1];
        
        // 计算建议交易区间
        const nearestSupport = orderBookLevels
            .filter(level => level.type === 'support')
            .slice(0, 1)[0];
        const nearestResistance = orderBookLevels
            .filter(level => level.type === 'resistance')
            .slice(0, 1)[0];
        
        const tradingRange = {
            min: nearestSupport ? nearestSupport.price : currentPrice * 0.99,
            max: nearestResistance ? nearestResistance.price : currentPrice * 1.01
        };

        res.json({
            currentPrice,
            rsi: currentRSI,
            historicalLevels,
            orderBookLevels,
            tradingRange
        });
    } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
