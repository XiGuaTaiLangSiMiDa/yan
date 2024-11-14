const Binance = require('node-binance-api');
const { SMA, RSI } = require('technicalindicators');

const binance = new Binance();

// 分析订单簿深度数据
function analyzeOrderBookLevels(depth, currentPrice, sensitivity = 0.001) {
    const volumeMap = new Map();
    
    // 分析买单
    depth.bids.forEach(([price, volume]) => {
        price = parseFloat(price);
        volume = parseFloat(volume);
        // 将价格归类到0.001精度的区间
        const roundedPrice = Math.round(price / sensitivity) * sensitivity;
        volumeMap.set(roundedPrice, (volumeMap.get(roundedPrice) || 0) + volume);
    });
    
    // 分析卖单
    depth.asks.forEach(([price, volume]) => {
        price = parseFloat(price);
        volume = parseFloat(volume);
        const roundedPrice = Math.round(price / sensitivity) * sensitivity;
        volumeMap.set(roundedPrice, (volumeMap.get(roundedPrice) || 0) + volume);
    });
    
    // 按成交量排序找出重要价格水平
    const significantLevels = Array.from(volumeMap.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([price, volume]) => ({
            price,
            volume,
            type: price < currentPrice ? 'support' : 'resistance'
        }));
    
    return significantLevels;
}

// 计算支撑位和阻力位（结合K线和成交量）
function findSupportResistanceLevels(klines, sensitivity = 0.02) {
    const levels = new Map();
    
    klines.forEach(kline => {
        const high = parseFloat(kline[2]);
        const low = parseFloat(kline[3]);
        const volume = parseFloat(kline[5]); // 成交量
        
        // 将价格四舍五入到最接近的整数位
        const roundedHigh = Math.round(high * 100) / 100;
        const roundedLow = Math.round(low * 100) / 100;
        
        // 用成交量加权
        levels.set(roundedHigh, (levels.get(roundedHigh) || 0) + volume);
        levels.set(roundedLow, (levels.get(roundedLow) || 0) + volume);
    });
    
    // 过滤出重要的价格水平
    const significantLevels = Array.from(levels.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([price, volume]) => ({
            price: parseFloat(price),
            volume
        }));
    
    return significantLevels;
}

// 分析交易建议
function analyzeTradingSuggestions(currentPrice, historicalLevels, orderBookLevels, rsi) {
    let suggestion = '';
    
    // 找到最近的历史支撑位和阻力位
    const nearestSupport = historicalLevels
        .filter(level => level.price < currentPrice)
        .slice(0, 1)[0];
    const nearestResistance = historicalLevels
        .filter(level => level.price > currentPrice)
        .slice(0, 1)[0];
    
    // 找到最强的订单簿支撑位和阻力位
    const strongestSupport = orderBookLevels
        .filter(level => level.type === 'support')
        .slice(0, 1)[0];
    const strongestResistance = orderBookLevels
        .filter(level => level.type === 'resistance')
        .slice(0, 1)[0];
    
    if (rsi > 70) {
        suggestion += `⚠️ RSI超买 (${rsi.toFixed(2)})，价格可能回调\n`;
    } else if (rsi < 30) {
        suggestion += `💡 RSI超卖 (${rsi.toFixed(2)})，可能存在买入机会\n`;
    }
    
    // 分析历史价格水平
    if (nearestSupport && nearestResistance) {
        const distanceToSupport = currentPrice - nearestSupport.price;
        const distanceToResistance = nearestResistance.price - currentPrice;
        
        if (distanceToSupport < distanceToResistance && distanceToSupport / currentPrice < 0.02) {
            suggestion += `💪 接近历史支撑位 ${nearestSupport.price}，成交量：${nearestSupport.volume.toFixed(2)}\n`;
        } else if (distanceToResistance < distanceToSupport && distanceToResistance / currentPrice < 0.02) {
            suggestion += `📉 接近历史阻力位 ${nearestResistance.price}，成交量：${nearestResistance.volume.toFixed(2)}\n`;
        }
    }
    
    // 分析订单簿
    if (strongestSupport) {
        suggestion += `📊 最强买单支撑位：${strongestSupport.price}，挂单量：${strongestSupport.volume.toFixed(2)}\n`;
    }
    if (strongestResistance) {
        suggestion += `🛑 最强卖单阻力位：${strongestResistance.price}，挂单量：${strongestResistance.volume.toFixed(2)}\n`;
    }
    
    return suggestion || '当前价格在支撑位和阻力位之间，建议观望';
}

async function main() {
    try {
        // 获取K线数据
        console.log('正在获取GMT/USDT K线数据...');
        const klines = await binance.futuresCandles('GMTUSDT', '4h', { limit: 200 });
        
        // 获取当前价格
        const ticker = await binance.futuresPrices();
        const currentPrice = parseFloat(ticker.GMTUSDT);
        
        // 获取深度订单簿数据（获取更多深度）
        console.log('正在获取订单簿数据...');
        const depth = await binance.futuresDepth('GMTUSDT', { limit: 1000 });
        
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
        
        // 输出分析结果
        console.log('\n=== GMT/USDT 深度技术分析报告 ===');
        console.log(`当前价格: ${currentPrice}`);
        console.log(`RSI(14): ${currentRSI.toFixed(2)}`);
        
        console.log('\n历史价格分析（按成交量排序）:');
        console.log('主要支撑位:');
        historicalLevels
            .filter(level => level.price < currentPrice)
            .slice(0, 5)
            .forEach(level => console.log(`- ${level.price} (成交量: ${level.volume.toFixed(2)})`));
        
        console.log('\n主要阻力位:');
        historicalLevels
            .filter(level => level.price > currentPrice)
            .slice(0, 5)
            .forEach(level => console.log(`- ${level.price} (成交量: ${level.volume.toFixed(2)})`));
        
        console.log('\n订单簿深度分析:');
        console.log('主要买单支撑:');
        orderBookLevels
            .filter(level => level.type === 'support')
            .slice(0, 5)
            .forEach(level => console.log(`- ${level.price} (挂单量: ${level.volume.toFixed(2)})`));
        
        console.log('\n主要卖单阻力:');
        orderBookLevels
            .filter(level => level.type === 'resistance')
            .slice(0, 5)
            .forEach(level => console.log(`- ${level.price} (挂单量: ${level.volume.toFixed(2)})`));
        
        console.log('\n交易建议:');
        console.log(analyzeTradingSuggestions(currentPrice, historicalLevels, orderBookLevels, currentRSI));
        
    } catch (error) {
        console.error('分析过程中出现错误:', error);
    }
}

main();
