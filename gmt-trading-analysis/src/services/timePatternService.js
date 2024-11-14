const Binance = require('node-binance-api');
const binance = new Binance();

class TimePatternService {
    constructor() {
        this.hoursInDay = 24;
        this.maxLimit = 1000;
    }

    async getHistoricalKlines(symbol, interval, totalLimit) {
        const chunks = Math.ceil(totalLimit / this.maxLimit);
        let allKlines = [];
        
        for (let i = 0; i < chunks; i++) {
            const limit = Math.min(this.maxLimit, totalLimit - (i * this.maxLimit));
            const endTime = Date.now() - (i * this.maxLimit * 3600000);
            
            try {
                const klines = await binance.futuresCandles(symbol, interval, {
                    limit: limit,
                    endTime: endTime
                });
                
                if (Array.isArray(klines)) {
                    allKlines = [...klines, ...allKlines];
                    console.log(`Received ${klines.length} klines for chunk ${i + 1}`);
                }
                
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
            noChange: 0,
            totalGainPercent: 0,
            totalLossPercent: 0,
            maxGainPercent: 0,
            maxLossPercent: 0,
            avgVolume: 0,
            totalVolume: 0,
            priceChanges: [] // 存储所有价格变化以计算中位数
        }));

        console.log(`Analyzing ${klines.length} klines`);

        klines.forEach(kline => {
            try {
                const timestamp = parseInt(kline[0]);
                const open = parseFloat(kline[1]);
                const high = parseFloat(kline[2]);
                const low = parseFloat(kline[3]);
                const close = parseFloat(kline[4]);
                const volume = parseFloat(kline[5]);
                
                if (isNaN(timestamp) || isNaN(open) || isNaN(close) || isNaN(volume)) {
                    return;
                }

                const hour = new Date(timestamp).getHours();
                const changePercent = ((close - open) / open) * 100;
                const highLowRange = ((high - low) / low) * 100;

                hourlyStats[hour].priceChanges.push(changePercent);
                hourlyStats[hour].totalVolume += volume;

                if (changePercent > 0) {
                    hourlyStats[hour].gains++;
                    hourlyStats[hour].totalGainPercent += changePercent;
                    hourlyStats[hour].maxGainPercent = Math.max(hourlyStats[hour].maxGainPercent, changePercent);
                } else if (changePercent < 0) {
                    hourlyStats[hour].losses++;
                    hourlyStats[hour].totalLossPercent += Math.abs(changePercent);
                    hourlyStats[hour].maxLossPercent = Math.max(hourlyStats[hour].maxLossPercent, Math.abs(changePercent));
                } else {
                    hourlyStats[hour].noChange++;
                }
            } catch (error) {
                console.warn('Error processing kline:', error);
            }
        });

        return hourlyStats.map((stats, hour) => {
            const totalCandles = stats.gains + stats.losses + stats.noChange;
            const gainProbability = totalCandles > 0 ? (stats.gains / totalCandles) * 100 : 0;
            const lossProbability = totalCandles > 0 ? (stats.losses / totalCandles) * 100 : 0;
            const noChangeProbability = totalCandles > 0 ? (stats.noChange / totalCandles) * 100 : 0;
            
            // 计算平均值和中位数
            const avgGainPercent = stats.gains > 0 ? stats.totalGainPercent / stats.gains : 0;
            const avgLossPercent = stats.losses > 0 ? stats.totalLossPercent / stats.losses : 0;
            const avgVolume = totalCandles > 0 ? stats.totalVolume / totalCandles : 0;
            
            // 计算中位数涨跌幅
            const sortedChanges = stats.priceChanges.sort((a, b) => a - b);
            const medianChange = sortedChanges.length > 0 
                ? sortedChanges[Math.floor(sortedChanges.length / 2)]
                : 0;

            return {
                hour,
                gainProbability: gainProbability.toFixed(2),
                lossProbability: lossProbability.toFixed(2),
                noChangeProbability: noChangeProbability.toFixed(2),
                avgGainPercent: avgGainPercent.toFixed(2),
                avgLossPercent: avgLossPercent.toFixed(2),
                maxGainPercent: stats.maxGainPercent.toFixed(2),
                maxLossPercent: stats.maxLossPercent.toFixed(2),
                medianChange: medianChange.toFixed(2),
                avgVolume: avgVolume.toFixed(2),
                totalTrades: totalCandles,
                gains: stats.gains,
                losses: stats.losses,
                noChange: stats.noChange
            };
        });
    }

    async getTimePatternAnalysis(symbol) {
        try {
            console.log('Starting time pattern analysis for', symbol);
            
            // 获取小时K线数据
            const klines = await this.getHistoricalKlines(symbol, '1h', 4380);
            
            if (!klines || !Array.isArray(klines) || klines.length === 0) {
                throw new Error('Failed to fetch historical klines data');
            }

            console.log(`Successfully fetched ${klines.length} klines for analysis`);

            const hourlyPatterns = this.analyzeHourlyPatterns(klines);

            // 找出最佳交易时间
            const bestGainHour = hourlyPatterns.reduce((best, current) => 
                parseFloat(current.gainProbability) > parseFloat(best.gainProbability) ? current : best
            );

            const bestVolumeHour = hourlyPatterns.reduce((best, current) => 
                parseFloat(current.avgVolume) > parseFloat(best.avgVolume) ? current : best
            );

            return {
                hourlyPatterns,
                summary: {
                    bestGainHour: {
                        hour: bestGainHour.hour,
                        probability: bestGainHour.gainProbability,
                        avgGain: bestGainHour.avgGainPercent
                    },
                    bestVolumeHour: {
                        hour: bestVolumeHour.hour,
                        volume: bestVolumeHour.avgVolume
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
