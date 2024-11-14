const Binance = require('node-binance-api');
const { RSI } = require('technicalindicators');

class BinanceService {
    constructor() {
        this.binance = new Binance();
    }

    // 分析订单簿深度数据
    analyzeOrderBookLevels(depth, currentPrice, sensitivity = 0.001) {
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
    findSupportResistanceLevels(klines, sensitivity = 0.02) {
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

    // 计算趋势强度
    calculateTrend(closes, currentPrice) {
        const recentCloses = closes.slice(-20);
        const averagePrice = recentCloses.reduce((a, b) => a + b, 0) / recentCloses.length;
        const trend = currentPrice > averagePrice ? 'uptrend' : 'downtrend';
        const trendStrength = Math.abs((currentPrice - averagePrice) / averagePrice * 100);

        return {
            direction: trend,
            strength: trendStrength
        };
    }

    // 获取完整的市场分析
    async getMarketAnalysis(symbol) {
        try {
            // 获取K线数据
            const klines = await this.binance.futuresCandles(symbol, '4h', { limit: 200 });
            
            // 获取当前价格
            const ticker = await this.binance.futuresPrices();
            const currentPrice = parseFloat(ticker[symbol]);
            
            // 获取深度订单簿数据
            const depth = await this.binance.futuresDepth(symbol, { limit: 500 });
            
            // 分析订单簿深度
            const orderBookLevels = this.analyzeOrderBookLevels(depth, currentPrice);
            
            // 计算历史支撑位和阻力位
            const historicalLevels = this.findSupportResistanceLevels(klines)
                .map(level => ({
                    ...level,
                    type: level.price < currentPrice ? 'support' : 'resistance'
                }));

            // 计算RSI
            const closes = klines.map(k => parseFloat(k[4]));
            const rsiInput = {
                values: closes,
                period: 14
            };
            const rsiValues = RSI.calculate(rsiInput);
            const currentRSI = rsiValues[rsiValues.length - 1];

            // 计算趋势
            const trend = this.calculateTrend(closes, currentPrice);

            return {
                symbol,
                currentPrice,
                rsi: currentRSI,
                orderBookLevels,
                historicalLevels: historicalLevels.slice(0, 6),
                trend
            };
        } catch (error) {
            console.error('Error in getMarketAnalysis:', error);
            throw error;
        }
    }
}

module.exports = new BinanceService();
