class MarketAnalysis {
    constructor() {
        this.updateInterval = null;
    }

    formatNumber(num) {
        return new Intl.NumberFormat('zh-CN').format(Math.round(num));
    }

    formatPrice(price) {
        return parseFloat(price).toFixed(6);
    }

    getRsiStatus(rsi) {
        if (rsi > 70) {
            return '<span class="rsi-status rsi-overbought">超买区间</span>';
        } else if (rsi < 30) {
            return '<span class="rsi-status rsi-oversold">超卖区间</span>';
        } else {
            return '<span class="rsi-status rsi-neutral">中性区间</span>';
        }
    }

    generateAnalysisSummary(data) {
        const rsi = data.rsi;
        const currentPrice = data.currentPrice;
        const supports = data.orderBookLevels.filter(l => l.type === 'support').slice(0, 3);
        const resistances = data.orderBookLevels.filter(l => l.type === 'resistance').slice(0, 3);
        
        let summary = `<div class="analysis-text">`;
        summary += `<p>当前价格: <span class="key-level">${this.formatPrice(currentPrice)}</span></p>`;
        summary += `<p>RSI(14): <span class="key-level">${rsi.toFixed(2)}</span>${this.getRsiStatus(rsi)}</p>`;
        
        // 支撑位列表
        summary += `<p>主要支撑位：<div class="price-list">`;
        summary += supports.map(s => 
            `<span class="price-item support-price">${this.formatPrice(s.price)}</span>`
        ).join('');
        summary += `</div></p>`;

        // 阻力位列表
        summary += `<p>主要阻力位：<div class="price-list">`;
        summary += resistances.map(r => 
            `<span class="price-item resistance-price">${this.formatPrice(r.price)}</span>`
        ).join('');
        summary += `</div></p>`;
        summary += `</div>`;

        // 趋势分析
        let trendAnalysis = `<strong>趋势分析</strong>`;
        const nearestSupport = supports[0];
        const nearestResistance = resistances[0];
        
        if (nearestSupport && nearestResistance) {
            const distanceToSupport = currentPrice - nearestSupport.price;
            const distanceToResistance = nearestResistance.price - currentPrice;
            
            if (distanceToSupport < distanceToResistance) {
                trendAnalysis += `<p>当前价格距离支撑位 <span class="key-level">${this.formatPrice(nearestSupport.price)}</span> 较近，可能获得支撑。`;
                if (rsi < 40) {
                    trendAnalysis += ` RSI处于低位，可以考虑逢低买入。</p>`;
                } else {
                    trendAnalysis += `</p>`;
                }
            } else {
                trendAnalysis += `<p>当前价格接近阻力位 <span class="key-level">${this.formatPrice(nearestResistance.price)}</span>，需要注意突破情况。`;
                if (rsi > 60) {
                    trendAnalysis += ` RSI处于高位，可以考虑分批减仓。</p>`;
                } else {
                    trendAnalysis += `</p>`;
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
            .map((level, index) => `
                <div class="level-item support ${index === 0 ? 'active' : ''}">
                    <div class="level-item-header">
                        <div class="price">
                            ${this.formatPrice(level.price)}
                            <span class="badge">S${index + 1}</span>
                        </div>
                        <div class="volume">${this.formatNumber(level.volume)}张</div>
                    </div>
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
            .map((level, index) => `
                <div class="level-item resistance ${index === 0 ? 'active' : ''}">
                    <div class="level-item-header">
                        <div class="price">
                            ${this.formatPrice(level.price)}
                            <span class="badge">R${index + 1}</span>
                        </div>
                        <div class="volume">${this.formatNumber(level.volume)}张</div>
                    </div>
                    <div class="volume-bar">
                        <div class="volume-bar-fill" style="width: ${level.volume / maxResistanceVolume * 100}%"></div>
                    </div>
                </div>
            `).join('');

        // 更新历史水平
        const historicalLevels = data.historicalLevels;
        const maxHistVolume = Math.max(...historicalLevels.map(l => l.volume));
        
        document.getElementById('historicalLevels').innerHTML = historicalLevels
            .map((level, index) => `
                <div class="level-item historical">
                    <div class="level-item-header">
                        <div class="price">
                            ${this.formatPrice(level.price)}
                            <span class="badge">${level.type === 'support' ? 'HS' : 'HR'}${index + 1}</span>
                        </div>
                        <div class="volume">${this.formatNumber(Math.round(level.volume / 10000))}万</div>
                    </div>
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
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    startAutoUpdate(symbol) {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        this.fetchAndUpdateData(symbol);
        this.updateInterval = setInterval(() => this.fetchAndUpdateData(symbol), 20000);
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
