class PeriodPatternAnalysis {
    constructor() {
        this.updateInterval = null;
        this.charts = {
            weekday: null,
            monthDay: null,
            yearWeek: null,
            yearMonth: null
        };
    }

    createWeekdayChart(patterns) {
        const ctx = document.getElementById('weekdayPatternChart').getContext('2d');
        
        if (this.charts.weekday) {
            this.charts.weekday.destroy();
        }

        const labels = patterns.map(p => p.dayName);
        const gainData = patterns.map(p => parseFloat(p.gainProbability));
        const avgGainData = patterns.map(p => parseFloat(p.avgGainPercent));

        this.charts.weekday = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '上涨概率 (%)',
                        data: gainData,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '平均涨幅 (%)',
                        data: avgGainData,
                        type: 'line',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '上涨概率 (%)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '平均涨幅 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '每周交易日分析'
                    }
                }
            }
        });
    }

    createMonthDayChart(patterns) {
        const ctx = document.getElementById('monthDayPatternChart').getContext('2d');
        
        if (this.charts.monthDay) {
            this.charts.monthDay.destroy();
        }

        const labels = patterns.map(p => `${p.day}日`);
        const gainData = patterns.map(p => parseFloat(p.gainProbability));
        const avgGainData = patterns.map(p => parseFloat(p.avgGainPercent));

        this.charts.monthDay = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '上涨概率 (%)',
                        data: gainData,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '平均涨幅 (%)',
                        data: avgGainData,
                        type: 'line',
                        borderColor: 'rgba(255, 159, 64, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '上涨概率 (%)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '平均涨幅 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '每月日期分析'
                    }
                }
            }
        });
    }

    createYearWeekChart(patterns) {
        const ctx = document.getElementById('yearWeekPatternChart').getContext('2d');
        
        if (this.charts.yearWeek) {
            this.charts.yearWeek.destroy();
        }

        const labels = patterns.map(p => `第${p.week}周`);
        const gainData = patterns.map(p => parseFloat(p.gainProbability));
        const avgGainData = patterns.map(p => parseFloat(p.avgGainPercent));

        this.charts.yearWeek = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '上涨概率 (%)',
                        data: gainData,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '平均涨幅 (%)',
                        data: avgGainData,
                        type: 'line',
                        borderColor: 'rgba(255, 206, 86, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '上涨概率 (%)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '平均涨幅 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '年度周数分析'
                    }
                }
            }
        });
    }

    createYearMonthChart(patterns) {
        const ctx = document.getElementById('yearMonthPatternChart').getContext('2d');
        
        if (this.charts.yearMonth) {
            this.charts.yearMonth.destroy();
        }

        const labels = patterns.map(p => p.monthName);
        const gainData = patterns.map(p => parseFloat(p.gainProbability));
        const avgGainData = patterns.map(p => parseFloat(p.avgGainPercent));

        this.charts.yearMonth = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '上涨概率 (%)',
                        data: gainData,
                        backgroundColor: 'rgba(255, 99, 132, 0.5)',
                        borderColor: 'rgba(255, 99, 132, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '平均涨幅 (%)',
                        data: avgGainData,
                        type: 'line',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        position: 'left',
                        title: {
                            display: true,
                            text: '上涨概率 (%)'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '平均涨幅 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '年度月份分析'
                    }
                }
            }
        });
    }

    updateMetadata(metadata) {
        document.getElementById('periodPatternMetadata').innerHTML = `
            <div class="metadata-item">
                <span>分析周期：</span>
                <span>${new Date(metadata.startDate).toLocaleDateString()} - ${new Date(metadata.endDate).toLocaleDateString()}</span>
            </div>
            <div class="metadata-item">
                <span>数据点数：</span>
                <span>${metadata.dataPoints} 天</span>
            </div>
        `;
    }

    async fetchAndUpdatePatterns(symbol) {
        try {
            const response = await fetch(`/api/period-patterns?symbol=${symbol}`);
            const data = await response.json();
            
            this.createWeekdayChart(data.weekdayPatterns);
            this.createMonthDayChart(data.monthDayPatterns);
            this.createYearWeekChart(data.yearWeekPatterns);
            this.createYearMonthChart(data.yearMonthPatterns);
            this.updateMetadata(data.metadata);
            
            document.getElementById('lastPeriodUpdate').textContent = 
                `最后更新时间: ${new Date().toLocaleString('zh-CN')}`;
        } catch (error) {
            console.error('Error fetching period patterns:', error);
        }
    }

    startAutoUpdate(symbol) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.fetchAndUpdatePatterns(symbol);
        // 每天更新一次周期模式分析
        this.updateInterval = setInterval(() => this.fetchAndUpdatePatterns(symbol), 20000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Export for use in other modules
window.PeriodPatternAnalysis = PeriodPatternAnalysis;
