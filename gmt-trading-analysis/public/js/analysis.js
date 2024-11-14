class MarketAnalysis {
    constructor() {
        this.updateInterval = null;
    }

    formatNumber(num) {
        return new Intl.NumberFormat('zh-CN').format(Math.round(num));
    }

    updateTradingRanges(data) {
        const supports = data.orderBookLevels.filter(l => l.type === 'support');
        const resistances = data.orderBookLevels.filter(l => l.type === 'resistance');
        const currentPrice = data.currentPrice;
        const rsi = data.rsi;
        
        let html = '';

        // 短期操作区间
        const shortTermSupport = supports[0]?.price;
        const shortTermResistance = resistances[0]?.price;
        if (shortTermSupport && shortTermResistance) {
            html += `
                <div class="range-item">
                    <span class="range-type">短期区间</span>
                    <span class="range-description">
                        建议在 ${shortTermSupport} 附近买入，${shortTermResistance} 附近卖出
                        ${rsi > 70 ? '（注意超买风险）' : rsi < 30 ? '（可能存在超卖机会）' : ''}
                    </span>
                    <span class="range-price">${shortTermSupport} - ${shortTermResistance}</span>
                </div>
            `;
        }

        // 中期操作区间
        const midTermSupport = supports[1]?.price;
        const midTermResistance = resistances[1]?.price;
        if (midTermSupport && midTermResistance) {
            html += `
                <div class="range-item">
                    <span class="range-type">中期区间</span>
                    <span class="range-description">
                        中期支撑位 ${midTermSupport}，阻力位 ${midTermResistance}
                        ${data.trend.direction === 'uptrend' ? '（上升趋势）' : '（下降趋势）'}
                    </span>
                    <span class="range-price">${midTermSupport} - ${midTermResistance}</span>
                </div>
            `;
        }

        // 长期操作区间
        const longTermSupport = Math.min(...data.historicalLevels.filter(l => l.type === 'support').map(l => l.price));
        const longTermResistance = Math.max(...data.historicalLevels.filter(l => l.type === 'resistance').map(l => l.price));
        if (longTermSupport && longTermResistance) {
            html += `
                <div class="range-item">
                    <span class="range-type">长期区间</span>
                    <span class="range-description">
                        历史支撑位 ${longTermSupport}，阻力位 ${longTermResistance}
                        趋势强度: ${data.trend.strength.toFixed(2)}%
                    </span>
                    <span class="range-price">${longTermSupport} - ${longTermResistance}</span>
                </div>
            `;
        }

        document.getElementById('tradingRanges').innerHTML = html;
    }

    generateAnalysisSummary(data) {
        const rsi = data.rsi;
        const currentPrice = data.currentPrice;
        const supports = data.orderBookLevels.filter(l => l.type === 'support').slice(0, 3);
        const resistances = data.orderBookLevels.filter(l => l.type === 'resistance').slice(0, 3);
        
        let summary = `<div class="analysis-text">`;
        summary += `<p>当前价格: <span class="key-level">${currentPrice}</span></p>`;
        summary += `<p>RSI(14): <span class="key-level">${rsi.toFixed(2)}</span>`;
        
        if (rsi > 70) {
            summary += ` - 超买区间，可能面临回调风险</p>`;
        } else if (rsi < 30) {
            summary += ` - 超卖区间，可能出现反弹机会</p>`;
        } else {
            summary += ` - 中性区间</p>`;
        }

        summary += `<p>主要支撑位：${supports.map(s => s.price).join(', ')}</p>`;
        summary += `<p>主要阻力位：${resistances.map(r => r.price).join(', ')}</p>`;
        summary += `</div>`;

        // 趋势分析
        let trendAnalysis = `<p><strong>趋势分析：</strong></p>`;
        const nearestSupport = supports[0];
        const nearestResistance = resistances[0];
        
        if (nearestSupport && nearestResistance) {
            const distanceToSupport = currentPrice - nearestSupport.price;
            const distanceToResistance = nearestResistance.price - currentPrice;
            
            if (distanceToSupport < distanceToResistance) {
                trendAnalysis += `当前价格距离支撑位 ${nearestSupport.price} 较近，可能获得支撑。`;
                if (rsi < 40) {
                    trendAnalysis += ` RSI处于低位，可以考虑逢低买入。`;
                }
            } else {
                trendAnalysis += `当前价格接近阻力位 ${nearestResistance.price}，需要注意突破情况。`;
                if (rsi > 60) {
                    trendAnalysis += ` RSI处于高位，可以考虑分批减仓。`;
                }
            }
        }

        document.getElementById('analysisText').innerHTML = summary;
        document.getElementById('trendAnalysis').innerHTML = trendAnalysis;
    }

    updatePriceLevels(data) {
        // 更新支撑位
        const supportLevels = data.orderBookLevels
            .filter(level => level.type === 'support')
            .slice(0, 5);
        const maxSupportVolume = Math.max(...supportLevels.map(l => l.volume));
        
        document.getElementById('supportLevels').innerHTML = supportLevels
            .map(level => `
                <div class="level-item support">
                    <span>${level.price}</span>
                    <span>${this.formatNumber(level.volume)}张</span>
                    <div class="volume-bar">
                        <div class="volume-bar-fill" style="width: ${level.volume / maxSupportVolume * 100}%"></div>
                    </div>
                </div>
            `).join('');

        // 更新阻力位
        const resistanceLevels = data.orderBookLevels
            .filter(level => level.type === 'resistance')
            .slice(0, 5);
        const maxResistanceVolume = Math.max(...resistanceLevels.map(l => l.volume));
        
        document.getElementById('resistanceLevels').innerHTML = resistanceLevels
            .map(level => `
                <div class="level-item resistance">
                    <span>${level.price}</span>
                    <span>${this.formatNumber(level.volume)}张</span>
                    <div class="volume-bar">
                        <div class="volume-bar-fill" style="width: ${level.volume / maxResistanceVolume * 100}%"></div>
                    </div>
                </div>
            `).join('');

        // 更新历史水平
        const historicalLevels = data.historicalLevels;
        const maxHistVolume = Math.max(...historicalLevels.map(l => l.volume));
        
        document.getElementById('historicalLevels').innerHTML = historicalLevels
            .map(level => `
                <div class="level-item ${level.type}">
                    <span>${level.price}</span>
                    <span>${this.formatNumber(Math.round(level.volume / 10000))}万</span>
                    <div class="volume-bar">
                        <div class="volume-bar-fill" style="width: ${level.volume / maxHistVolume * 100}%"></div>
                    </div>
                </div>
            `).join('');

        document.getElementById('lastUpdate').textContent = 
            `最后更新时间: ${new Date().toLocaleString('zh-CN')}`;
    }

    async fetchAndUpdateData(symbol) {
        try {
            const response = await fetch(`/api/analysis?symbol=${symbol}`);
            const data = await response.json();
            this.updatePriceLevels(data);
            this.generateAnalysisSummary(data);
            this.updateTradingRanges(data);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    startAutoUpdate(symbol) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.fetchAndUpdateData(symbol);
        this.updateInterval = setInterval(() => this.fetchAndUpdateData(symbol), 60000);
    }

    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
}

// Export for use in other modules
window.MarketAnalysis = MarketAnalysis;
