const Binance = require('node-binance-api');
const binance = new Binance();

class PeriodPatternService {
    constructor() {
        this.maxLimit = 1000;
        this.daysInWeek = 7;
        this.monthsInYear = 12;
        this.weeksInYear = 53; // 使用53周以确保覆盖所有可能的周数
    }

    async getHistoricalKlines(symbol, interval, totalLimit) {
        const chunks = Math.ceil(totalLimit / this.maxLimit);
        let allKlines = [];
        
        for (let i = 0; i < chunks; i++) {
            const limit = Math.min(this.maxLimit, totalLimit - (i * this.maxLimit));
            const endTime = Date.now() - (i * this.maxLimit * 86400000); // 使用日线间隔
            
            try {
                const klines = await binance.futuresCandles(symbol, interval, {
                    limit: limit,
                    endTime: endTime
                });
                
                if (Array.isArray(klines)) {
                    allKlines = [...klines, ...allKlines];
                } else {
                    console.error(`Invalid klines data for chunk ${i + 1}:`, klines);
                }
                
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Error fetching chunk ${i + 1}:`, error);
            }
        }

        return allKlines;
    }

    // 分析每周每天的模式
    analyzeWeekdayPatterns(klines) {
        const weekdayStats = Array(this.daysInWeek).fill().map(() => ({
            gains: 0,
            losses: 0,
            totalGainPercent: 0,
            totalLossPercent: 0
        }));

        klines.forEach(kline => {
            try {
                const timestamp = parseInt(kline[0]);
                const open = parseFloat(kline[1]);
                const close = parseFloat(kline[4]);
                
                if (isNaN(timestamp) || isNaN(open) || isNaN(close)) return;

                const weekday = new Date(timestamp).getDay();
                const changePercent = ((close - open) / open) * 100;

                if (changePercent > 0) {
                    weekdayStats[weekday].gains++;
                    weekdayStats[weekday].totalGainPercent += changePercent;
                } else if (changePercent < 0) {
                    weekdayStats[weekday].losses++;
                    weekdayStats[weekday].totalLossPercent += Math.abs(changePercent);
                }
            } catch (error) {
                console.warn('Error processing weekday kline:', error);
            }
        });

        return weekdayStats.map((stats, day) => {
            const totalDays = stats.gains + stats.losses;
            const gainProbability = totalDays > 0 ? (stats.gains / totalDays) * 100 : 0;
            const avgGainPercent = stats.gains > 0 ? stats.totalGainPercent / stats.gains : 0;
            const avgLossPercent = stats.losses > 0 ? stats.totalLossPercent / stats.losses : 0;

            return {
                day,
                dayName: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][day],
                gainProbability: gainProbability.toFixed(2),
                lossProbability: (100 - gainProbability).toFixed(2),
                avgGainPercent: avgGainPercent.toFixed(2),
                avgLossPercent: avgLossPercent.toFixed(2),
                totalTrades: totalDays
            };
        });
    }

    // 分析每月每天的模式
    analyzeMonthDayPatterns(klines) {
        const monthDayStats = Array(31).fill().map(() => ({
            gains: 0,
            losses: 0,
            totalGainPercent: 0,
            totalLossPercent: 0
        }));

        klines.forEach(kline => {
            try {
                const timestamp = parseInt(kline[0]);
                const open = parseFloat(kline[1]);
                const close = parseFloat(kline[4]);
                
                if (isNaN(timestamp) || isNaN(open) || isNaN(close)) return;

                const day = new Date(timestamp).getDate() - 1;
                const changePercent = ((close - open) / open) * 100;

                if (changePercent > 0) {
                    monthDayStats[day].gains++;
                    monthDayStats[day].totalGainPercent += changePercent;
                } else if (changePercent < 0) {
                    monthDayStats[day].losses++;
                    monthDayStats[day].totalLossPercent += Math.abs(changePercent);
                }
            } catch (error) {
                console.warn('Error processing month day kline:', error);
            }
        });

        return monthDayStats.map((stats, index) => {
            const totalDays = stats.gains + stats.losses;
            const gainProbability = totalDays > 0 ? (stats.gains / totalDays) * 100 : 0;
            const avgGainPercent = stats.gains > 0 ? stats.totalGainPercent / stats.gains : 0;
            const avgLossPercent = stats.losses > 0 ? stats.totalLossPercent / stats.losses : 0;

            return {
                day: index + 1,
                gainProbability: gainProbability.toFixed(2),
                lossProbability: (100 - gainProbability).toFixed(2),
                avgGainPercent: avgGainPercent.toFixed(2),
                avgLossPercent: avgLossPercent.toFixed(2),
                totalTrades: totalDays
            };
        });
    }

    // 分析每年每周的模式
    analyzeYearWeekPatterns(klines) {
        const weekStats = Array(this.weeksInYear).fill().map(() => ({
            gains: 0,
            losses: 0,
            totalGainPercent: 0,
            totalLossPercent: 0
        }));

        klines.forEach(kline => {
            try {
                const timestamp = parseInt(kline[0]);
                const open = parseFloat(kline[1]);
                const close = parseFloat(kline[4]);
                
                if (isNaN(timestamp) || isNaN(open) || isNaN(close)) return;

                const date = new Date(timestamp);
                const week = this.getWeekNumber(date);
                if (week >= this.weeksInYear) return; // 跳过超出范围的周数

                const changePercent = ((close - open) / open) * 100;

                if (changePercent > 0) {
                    weekStats[week].gains++;
                    weekStats[week].totalGainPercent += changePercent;
                } else if (changePercent < 0) {
                    weekStats[week].losses++;
                    weekStats[week].totalLossPercent += Math.abs(changePercent);
                }
            } catch (error) {
                console.warn('Error processing year week kline:', error);
            }
        });

        return weekStats.map((stats, week) => {
            const totalTrades = stats.gains + stats.losses;
            const gainProbability = totalTrades > 0 ? (stats.gains / totalTrades) * 100 : 0;
            const avgGainPercent = stats.gains > 0 ? stats.totalGainPercent / stats.gains : 0;
            const avgLossPercent = stats.losses > 0 ? stats.totalLossPercent / stats.losses : 0;

            return {
                week: week + 1,
                gainProbability: gainProbability.toFixed(2),
                lossProbability: (100 - gainProbability).toFixed(2),
                avgGainPercent: avgGainPercent.toFixed(2),
                avgLossPercent: avgLossPercent.toFixed(2),
                totalTrades: totalTrades
            };
        }).filter(stats => stats.totalTrades > 0); // 只返回有交易数据的周
    }

    // 分析每年每月的模式
    analyzeYearMonthPatterns(klines) {
        const monthStats = Array(this.monthsInYear).fill().map(() => ({
            gains: 0,
            losses: 0,
            totalGainPercent: 0,
            totalLossPercent: 0
        }));

        klines.forEach(kline => {
            try {
                const timestamp = parseInt(kline[0]);
                const open = parseFloat(kline[1]);
                const close = parseFloat(kline[4]);
                
                if (isNaN(timestamp) || isNaN(open) || isNaN(close)) return;

                const month = new Date(timestamp).getMonth();
                const changePercent = ((close - open) / open) * 100;

                if (changePercent > 0) {
                    monthStats[month].gains++;
                    monthStats[month].totalGainPercent += changePercent;
                } else if (changePercent < 0) {
                    monthStats[month].losses++;
                    monthStats[month].totalLossPercent += Math.abs(changePercent);
                }
            } catch (error) {
                console.warn('Error processing year month kline:', error);
            }
        });

        return monthStats.map((stats, month) => {
            const totalTrades = stats.gains + stats.losses;
            const gainProbability = totalTrades > 0 ? (stats.gains / totalTrades) * 100 : 0;
            const avgGainPercent = stats.gains > 0 ? stats.totalGainPercent / stats.gains : 0;
            const avgLossPercent = stats.losses > 0 ? stats.totalLossPercent / stats.losses : 0;

            return {
                month: month + 1,
                monthName: ['一月', '二月', '三月', '四月', '五月', '六月', 
                           '七月', '八月', '九月', '十月', '十一月', '十二月'][month],
                gainProbability: gainProbability.toFixed(2),
                lossProbability: (100 - gainProbability).toFixed(2),
                avgGainPercent: avgGainPercent.toFixed(2),
                avgLossPercent: avgLossPercent.toFixed(2),
                totalTrades: totalTrades
            };
        });
    }

    getWeekNumber(date) {
        const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
        return Math.min(
            Math.floor((pastDaysOfYear + firstDayOfYear.getDay()) / 7),
            this.weeksInYear - 1
        );
    }

    async getPeriodPatternAnalysis(symbol) {
        try {
            console.log('Starting period pattern analysis for', symbol);
            
            // 获取一年的日线数据
            const klines = await this.getHistoricalKlines(symbol, '1d', 365);
            
            if (!klines || !Array.isArray(klines) || klines.length === 0) {
                throw new Error('Failed to fetch historical klines data');
            }

            console.log(`Successfully fetched ${klines.length} daily klines for analysis`);

            return {
                weekdayPatterns: this.analyzeWeekdayPatterns(klines),
                monthDayPatterns: this.analyzeMonthDayPatterns(klines),
                yearWeekPatterns: this.analyzeYearWeekPatterns(klines),
                yearMonthPatterns: this.analyzeYearMonthPatterns(klines),
                metadata: {
                    symbol,
                    dataPoints: klines.length,
                    startDate: new Date(parseInt(klines[0][0])).toISOString(),
                    endDate: new Date(parseInt(klines[klines.length - 1][0])).toISOString()
                }
            };
        } catch (error) {
            console.error('Error analyzing period patterns:', error);
            throw error;
        }
    }
}

module.exports = new PeriodPatternService();
