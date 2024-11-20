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

    formatNumber(num) {
        return new Intl.NumberFormat('zh-CN').format(Math.round(num));
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
                        backgroundColor: 'rgba(46, 204, 113, 0.5)',
                        borderColor: 'rgba(46, 204, 113, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '平均涨幅 (%)',
                        data: avgGainData,
                        type: 'line',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    },
                    {
                        label: '平均跌幅 (%)',
                        data: avgLossData,
                        type: 'line',
                        borderColor: 'rgba(231, 76, 60, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
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
                        text: '24小时交易模式分析',
                        padding: 20
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
        const tradesData = patterns.map(p => p.totalTrades);

        // 计算成交量的移动平均线
        const movingAvgPeriod = 3;
        const volumeMA = volumeData.map((_, index, array) => {
            const start = Math.max(0, index - movingAvgPeriod + 1);
            const values = array.slice(start, index + 1);
            return values.reduce((sum, val) => sum + val, 0) / values.length;
        });

        this.charts.volume = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '平均成交量',
                        data: volumeData,
                        backgroundColor: 'rgba(52, 152, 219, 0.5)',
                        borderColor: 'rgba(52, 152, 219, 1)',
                        borderWidth: 1,
                        yAxisID: 'y'
                    },
                    {
                        label: '成交量MA3',
                        data: volumeMA,
                        type: 'line',
                        borderColor: 'rgba(155, 89, 182, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y'
                    },
                    {
                        label: '交易次数',
                        data: tradesData,
                        type: 'line',
                        borderColor: 'rgba(230, 126, 34, 1)',
                        borderWidth: 2,
                        fill: false,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
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
                        text: '24小时成交量分布',
                        padding: 20
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.dataset.label === '平均成交量' || context.dataset.label === '成交量MA3') {
                                    label += new Intl.NumberFormat('zh-CN').format(Math.round(context.raw));
                                } else {
                                    label += context.raw;
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });
    }

    updateSummary(summary) {
        document.getElementById('timePatternSummary').innerHTML = `
            <div class="summary-item">
                <h4>最佳上涨时段</h4>
                <p>
                    <span>时间段</span>
                    <span>${this.formatTime(summary.bestGainHour.hour)} - ${this.formatTime((summary.bestGainHour.hour + 1) % 24)}</span>
                </p>
                <p>
                    <span>上涨概率</span>
                    <span class="data-label positive">${summary.bestGainHour.probability}%</span>
                </p>
                <p>
                    <span>平均涨幅</span>
                    <span class="data-label positive">+${summary.bestGainHour.avgGain}%</span>
                </p>
            </div>
            <div class="summary-item">
                <h4>最高成交量时段</h4>
                <p>
                    <span>时间段</span>
                    <span>${this.formatTime(summary.bestVolumeHour.hour)} - ${this.formatTime((summary.bestVolumeHour.hour + 1) % 24)}</span>
                </p>
                <p>
                    <span>平均成交量</span>
                    <span class="data-label neutral">${this.formatNumber(parseFloat(summary.bestVolumeHour.volume))}</span>
                </p>
                <p>
                    <span>活跃度</span>
                    <span class="data-label neutral">100%</span>
                </p>
            </div>
        `;
    }

    updateHourlyTable(patterns) {
        const tbody = document.getElementById('hourlyPatternTableBody');
        tbody.innerHTML = patterns.map(p => `
            <tr>
                <td class="time-cell">${this.formatTime(p.hour)}</td>
                <td>
                    <span class="data-label ${parseFloat(p.gainProbability) > 50 ? 'positive' : 'neutral'}">
                        ${p.gainProbability}%
                    </span>
                </td>
                <td>
                    <span class="data-label ${parseFloat(p.lossProbability) > 50 ? 'negative' : 'neutral'}">
                        ${p.lossProbability}%
                    </span>
                </td>
                <td>${p.noChangeProbability}%</td>
                <td class="positive">${p.avgGainPercent}%</td>
                <td class="positive">${p.maxGainPercent}%</td>
                <td class="negative">${p.avgLossPercent}%</td>
                <td class="negative">${p.maxLossPercent}%</td>
                <td class="${parseFloat(p.medianChange) >= 0 ? 'positive' : 'negative'}">${p.medianChange}%</td>
                <td>${this.formatNumber(parseFloat(p.avgVolume))}</td>
                <td>${p.totalTrades}</td>
            </tr>
        `).join('');
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
window.TimePatternAnalysis = TimePatternAnalysis;
