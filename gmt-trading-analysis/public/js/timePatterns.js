class TimePatternAnalysis {
    constructor() {
        this.updateInterval = null;
    }

    formatTime(hour) {
        return `${hour.toString().padStart(2, '0')}:00`;
    }

    createHourlyChart(patterns) {
        const ctx = document.getElementById('hourlyPatternChart').getContext('2d');
        
        // 准备数据
        const labels = patterns.map(p => this.formatTime(p.hour));
        const gainData = patterns.map(p => parseFloat(p.gainProbability));
        const volumeData = patterns.map(p => p.totalVolume);

        // 归一化成交量数据以便在同一图表显示
        const maxVolume = Math.max(...volumeData);
        const normalizedVolume = volumeData.map(v => (v / maxVolume) * 100);

        if (window.hourlyChart) {
            window.hourlyChart.destroy();
        }

        window.hourlyChart = new Chart(ctx, {
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
                        label: '成交量',
                        data: normalizedVolume,
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
                        },
                        max: 100
                    },
                    y1: {
                        beginAtZero: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: '相对成交量 (%)'
                        },
                        grid: {
                            drawOnChartArea: false
                        },
                        max: 100
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

    updatePatternTable(patterns) {
        const tbody = document.getElementById('patternTableBody');
        tbody.innerHTML = patterns.map(p => `
            <tr>
                <td>${this.formatTime(p.hour)}</td>
                <td>${p.gainProbability}%</td>
                <td>${p.avgGainPercent}%</td>
                <td>${p.maxGainPercent}%</td>
                <td>${p.avgLossPercent}%</td>
                <td>${p.maxLossPercent}%</td>
                <td>${Math.round(p.totalVolume).toLocaleString()}</td>
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
                <p>成交量: ${Math.round(summary.bestVolumeHour.volume).toLocaleString()}</p>
            </div>
        `;
    }

    async fetchAndUpdatePatterns(symbol) {
        try {
            const response = await fetch(`/api/time-patterns?symbol=${symbol}`);
            const data = await response.json();
            
            this.createHourlyChart(data.hourlyPatterns);
            this.updatePatternTable(data.hourlyPatterns);
            this.updateSummary(data.summary);
            
            document.getElementById('lastPatternUpdate').textContent = 
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
