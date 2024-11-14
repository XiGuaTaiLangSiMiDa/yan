class TimePatternAnalysis {
    constructor() {
        this.updateInterval = null;
        this.charts = {
            hourly: null,
            volume: null
        };
    }

    formatTime(hour) {
        return `${hour.toString().padStart(2, '0')}:00`;
    }

    createHourlyChart(patterns) {
        const ctx = document.getElementById('hourlyPatternChart').getContext('2d');
        
        if (this.charts.hourly) {
            this.charts.hourly.destroy();
        }

        const labels = patterns.map(p => this.formatTime(p.hour));
        const gainData = patterns.map(p => parseFloat(p.gainProbability));
        const avgGainData = patterns.map(p => parseFloat(p.avgGainPercent));
        const avgLossData = patterns.map(p => -parseFloat(p.avgLossPercent));

        this.charts.hourly = new Chart(ctx, {
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
                    },
                    {
                        label: '平均跌幅 (%)',
                        data: avgLossData,
                        type: 'line',
                        borderColor: 'rgba(54, 162, 235, 1)',
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
                            text: '概率 (%)'
                        }
                    },
                    y1: {
                        position: 'right',
                        title: {
                            display: true,
                            text: '涨跌幅 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '24小时交易模式分析'
                    }
                }
            }
        });
    }

    createVolumeChart(patterns) {
        const ctx = document.getElementById('volumePatternChart').getContext('2d');
        
        if (this.charts.volume) {
            this.charts.volume.destroy();
        }

        const labels = patterns.map(p => this.formatTime(p.hour));
        const volumeData = patterns.map(p => parseFloat(p.avgVolume));
        const totalTradesData = patterns.map(p => p.totalTrades);

        this.charts.volume = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '平均成交量',
                        data: volumeData,
                        backgroundColor: 'rgba(153, 102, 255, 0.5)',
                        borderColor: 'rgba(153, 102, 255, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '交易次数',
                        data: totalTradesData,
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
                            text: '成交量'
                        }
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '交易次数'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: '成交量分布'
                    }
                }
            }
        });
    }

    updateHourlyTable(patterns) {
        const tbody = document.getElementById('hourlyPatternTableBody');
        tbody.innerHTML = patterns.map(p => `
            <tr>
                <td>${this.formatTime(p.hour)}</td>
                <td>${p.gainProbability}%</td>
                <td>${p.lossProbability}%</td>
                <td>${p.noChangeProbability}%</td>
                <td>${p.avgGainPercent}%</td>
                <td>${p.maxGainPercent}%</td>
                <td>${p.avgLossPercent}%</td>
                <td>${p.maxLossPercent}%</td>
                <td>${p.medianChange}%</td>
                <td>${Math.round(parseFloat(p.avgVolume)).toLocaleString()}</td>
                <td>${p.totalTrades}</td>
            </tr>
        `).join('');
    }

    updateSummary(summary) {
        document.getElementById('timePatternSummary').innerHTML = `
            <div class="summary-item">
                <h4>最佳上涨时段</h4>
                <p>时间: ${this.formatTime(summary.bestGainHour.hour)}</p>
                <p>上涨概率: ${summary.bestGainHour.probability}%</p>
                <p>平均涨幅: ${summary.bestGainHour.avgGain}%</p>
            </div>
            <div class="summary-item">
                <h4>最高成交量时段</h4>
                <p>时间: ${this.formatTime(summary.bestVolumeHour.hour)}</p>
                <p>平均成交量: ${Math.round(parseFloat(summary.bestVolumeHour.volume)).toLocaleString()}</p>
            </div>
        `;
    }

    async fetchAndUpdatePatterns(symbol) {
        try {
            const response = await fetch(`/api/time-patterns?symbol=${symbol}`);
            const data = await response.json();
            
            this.createHourlyChart(data.hourlyPatterns);
            this.createVolumeChart(data.hourlyPatterns);
            this.updateHourlyTable(data.hourlyPatterns);
            this.updateSummary(data.summary);
            
            document.getElementById('lastTimeUpdate').textContent = 
                `最后更新时间: ${new Date().toLocaleString('zh-CN')}`;
        } catch (error) {
            console.error('Error fetching time patterns:', error);
        }
    }

    startAutoUpdate(symbol) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.fetchAndUpdatePatterns(symbol);
        // 每小时更新一次时间模式分析
        this.updateInterval = setInterval(() => this.fetchAndUpdatePatterns(symbol), 3600000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Export for use in other modules
window.TimePatternAnalysis = TimePatternAnalysis;
