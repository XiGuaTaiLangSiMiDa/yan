const Binance = require('node-binance-api');
const { RSI } = require('technicalindicators');
const { klineCache } = require('../cache/cache.js');

class BinanceService {
    constructor() {
        this.binance = new Binance();
    }

    // 获取扩展的深度数据
    async getExtendedDepth(symbol) {
        try {
            // 获取初始深度数据
            const baseDepth = await this.binance.futuresDepth(symbol, { limit: 1000 });
            const { asks, bids } = baseDepth;
            if (!asks || !bids) return {
                asks: asks || [],
                bids: bids || [],
            }

            // 获取当前价格作为参考点
            const ticker = await this.binance.futuresPrices();
            const currentPrice = parseFloat(ticker[symbol]);

            // 计算价格范围以获取更多数据
            const lowestAsk = parseFloat(baseDepth.asks[0][0]);
            const highestBid = parseFloat(baseDepth.bids[0][0]);

            // 获取更高价格范围的深度数据
            const higherDepth = await this.binance.futuresDepth(symbol, {
                limit: 1000,
                price: lowestAsk * 1.2 // 获取高于最低卖单5%的范围
            });

            // 获取更低价格范围的深度数据
            const lowerDepth = await this.binance.futuresDepth(symbol, {
                limit: 1000,
                price: highestBid * 0.8 // 获取低于最高买单5%的范围
            });

            // 合并深度数据
            const combinedDepth = {
                bids: [...new Map([...baseDepth.bids, ...lowerDepth.bids].map(item => [item[0], item])).values()],
                asks: [...new Map([...baseDepth.asks, ...higherDepth.asks].map(item => [item[0], item])).values()]
            };

            // 按价格排序
            combinedDepth.bids.sort((a, b) => parseFloat(b[0]) - parseFloat(a[0]));
            combinedDepth.asks.sort((a, b) => parseFloat(a[0]) - parseFloat(b[0]));

            return combinedDepth;
        } catch (error) {
            console.error('Error in getExtendedDepth:', error);
            throw error;
        }
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
            const { openTime: timestamp, open, high, low, close, volume } = kline;
            //const high = parseFloat(kline[2]);
            //const low = parseFloat(kline[3]);
            //const volume = parseFloat(kline[5]);

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
            // const klines = await this.binance.futuresCandles(symbol, '4h', { limit: 1000 });
            const klines = await klineCache.update(symbol, "4h");

            // 获取当前价格
            const ticker = await this.binance.futuresPrices();
            const currentPrice = parseFloat(ticker[symbol]);

            // 获取扩展的深度数据
            const depth = await this.getExtendedDepth(symbol);

            // 分析订单簿深度
            const orderBookLevels = this.analyzeOrderBookLevels(depth, currentPrice);

            // 计算历史支撑位和阻力位
            const historicalLevels = this.findSupportResistanceLevels(klines)
                .map(level => ({
                    ...level,
                    type: level.price < currentPrice ? 'support' : 'resistance'
                }));

            // 计算RSI
            const closes = klines.map(k => {
                const { openTime: timestamp, open, high, low, close, volume } = k;
                return close;
                //return parseFloat(close);
            });
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
