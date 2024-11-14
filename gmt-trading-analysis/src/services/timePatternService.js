const Binance = require('node-binance-api');
const binance = new Binance();

class TimePatternService {
    constructor() {
        this.hoursInDay = 24;
        this.maxLimit = 1000; // Binance API 单次请求最大限制
    }

    // 获取历史K线数据
    async getHistoricalKlines(symbol, interval, totalLimit) {
        const chunks = Math.ceil(totalLimit / this.maxLimit);
        let allKlines = [];
        
        for (let i = 0; i < chunks; i++) {
            const limit = Math.min(this.maxLimit, totalLimit - (i * this.maxLimit));
            const endTime = Date.now() - (i * this.maxLimit * 3600000); // 每小时3600000毫秒
            
            console.log(`Fetching chunk ${i + 1}/${chunks}, limit: ${limit}, endTime: ${new Date(endTime).toISOString()}`);
            
            try {
                const klines = await binance.futuresCandles(symbol, interval, {
                    limit: limit,
                    endTime: endTime
                });
                
                if (Array.isArray(klines)) {
                    allKlines = [...klines, ...allKlines];
                    console.log(`Received ${klines.length} klines for chunk ${i + 1}`);
                } else {
                    console.error(`Invalid klines data for chunk ${i + 1}:`, klines);
                }
                
                // 添加短暂延迟以避免触发频率限制
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error fetching chunk ${i + 1}:`, error);
            }
        }

        return allKlines;
    }

    // 分析每个小时的价格变化
    analyzeHourlyPatterns(klines) {
        const hourlyStats = Array(this.hoursInDay).fill().map(() => ({
            gains: 0,
            losses: 0,
            totalGainPercent: 0,
            totalLossPercent: 0,
            maxGainPercent: 0,
            maxLossPercent: 0,
            totalVolume: 0
        }));

        console.log(`Analyzing ${klines.length} klines`);

        for (let i = 0; i < klines.length; i++) {
            try {
                const kline = klines[i];
                const timestamp = parseInt(kline[0]);
                const open = parseFloat(kline[1]);
                const close = parseFloat(kline[4]);
                const volume = parseFloat(kline[5]);
                
                if (isNaN(timestamp) || isNaN(open) || isNaN(close) || isNaN(volume)) {
                    continue;
                }

                const hour = new Date(timestamp).getHours();
                const changePercent = ((close - open) / open) * 100;

                hourlyStats[hour].totalVolume += volume;

                if (changePercent > 0) {
                    hourlyStats[hour].gains++;
                    hourlyStats[hour].totalGainPercent += changePercent;
                    hourlyStats[hour].maxGainPercent = Math.max(hourlyStats[hour].maxGainPercent, changePercent);
                } else if (changePercent < 0) {
                    hourlyStats[hour].losses++;
                    hourlyStats[hour].totalLossPercent += Math.abs(changePercent);
                    hourlyStats[hour].maxLossPercent = Math.max(hourlyStats[hour].maxLossPercent, Math.abs(changePercent));
                }
            } catch (error) {
                console.warn('Error processing kline at index', i, ':', error);
            }
        }

        // 计算概率和平均值
        return hourlyStats.map((stats, hour) => {
            const totalCandles = stats.gains + stats.losses;
            const gainProbability = totalCandles > 0 ? (stats.gains / totalCandles) * 100 : 0;
            const avgGainPercent = stats.gains > 0 ? stats.totalGainPercent / stats.gains : 0;
            const avgLossPercent = stats.losses > 0 ? stats.totalLossPercent / stats.losses : 0;

            return {
                hour,
                gainProbability: gainProbability.toFixed(2),
                lossProbability: (100 - gainProbability).toFixed(2),
                avgGainPercent: avgGainPercent.toFixed(2),
                avgLossPercent: avgLossPercent.toFixed(2),
                maxGainPercent: stats.maxGainPercent.toFixed(2),
                maxLossPercent: stats.maxLossPercent.toFixed(2),
                totalVolume: stats.totalVolume,
                totalTrades: totalCandles
            };
        });
    }

    // 获取半年数据的时间模式分析
    async getTimePatternAnalysis(symbol) {
        try {
            console.log('Starting time pattern analysis for', symbol);
            
            // 获取半年的小时K线数据（约4380小时）
            const klines = await this.getHistoricalKlines(symbol, '1h', 4380);
            
            if (!klines || !Array.isArray(klines) || klines.length === 0) {
                throw new Error('Failed to fetch historical klines data');
            }

            console.log(`Successfully fetched ${klines.length} klines for analysis`);

            const patterns = this.analyzeHourlyPatterns(klines);

            // 找出最佳交易时间
            const bestGainHour = patterns.reduce((best, current) => 
                parseFloat(current.gainProbability) > parseFloat(best.gainProbability) ? current : best
            );

            const bestVolumeHour = patterns.reduce((best, current) => 
                current.totalVolume > best.totalVolume ? current : best
            );

            return {
                hourlyPatterns: patterns,
                summary: {
                    bestGainHour: {
                        hour: bestGainHour.hour,
                        probability: bestGainHour.gainProbability,
                        avgGain: bestGainHour.avgGainPercent
                    },
                    bestVolumeHour: {
                        hour: bestVolumeHour.hour,
                        volume: bestVolumeHour.totalVolume
                    }
                }
            };
        } catch (error) {
            console.error('Error analyzing time patterns:', error);
            throw error;
        }
    }
}

module.exports = new TimePatternService();
