class TradingViewManager {
    constructor() {
        this.widget = null;
        this.currentSymbol = 'GMTUSDT';
    }

    createWidget(symbol) {
        if (this.widget) {
            this.widget.remove();
        }

        this.widget = new TradingView.widget({
            "width": "100%",
            "height": 500,
            "symbol": "BINANCE:" + symbol,
            "interval": "240",
            "timezone": "Asia/Shanghai",
            "theme": "light",
            "style": "1",
            "locale": "zh_CN",
            "toolbar_bg": "#f1f3f6",
            "enable_publishing": false,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "container_id": "tradingview_chart",
            "studies": [
                {
                    "id": "BB@tv-basicstudies",
                    "inputs": {
                        "length": 20,
                        "stdDev": 2
                    }
                }
            ],
            "studies_overrides": {
                "bollinger bands.median.color": "#606060",
                "bollinger bands.upper.color": "#26a69a",
                "bollinger bands.lower.color": "#ef5350",
                "bollinger bands.median.linewidth": 2,
                "bollinger bands.upper.linewidth": 2,
                "bollinger bands.lower.linewidth": 2,
                "bollinger bands.median.linestyle": 0,
                "bollinger bands.upper.linestyle": 2,
                "bollinger bands.lower.linestyle": 2
            },
        });

        this.currentSymbol = symbol;
    }

    getCurrentSymbol() {
        return this.currentSymbol;
    }
}

class SymbolManager {
    constructor(tradingViewManager, onSymbolChange) {
        this.tradingViewManager = tradingViewManager;
        this.onSymbolChange = onSymbolChange;
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('symbolSelector').addEventListener('click', (e) => {
            if (e.target.classList.contains('symbol-btn')) {
                this.updateActiveSymbol(e.target);
            }
        });
    }

    updateActiveSymbol(buttonElement) {
        // 更新按钮状态
        document.querySelectorAll('.symbol-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        buttonElement.classList.add('active');

        // 更新当前符号和图表
        const symbol = buttonElement.dataset.symbol;
        this.tradingViewManager.createWidget(symbol);
        this.onSymbolChange(symbol);
    }

    addCustomSymbol() {
        const input = document.getElementById('customSymbol');
        const symbol = input.value.toUpperCase();

        if (!symbol.endsWith('USDT')) {
            alert('请输入有效的USDT交易对');
            return;
        }

        // 检查是否已存在
        const existingBtn = document.querySelector(`[data-symbol="${symbol}"]`);
        if (existingBtn) {
            existingBtn.click();
            input.value = '';
            return;
        }

        // 创建新按钮
        const btn = document.createElement('button');
        btn.className = 'symbol-btn';
        btn.setAttribute('data-symbol', symbol);
        btn.textContent = `${symbol.replace('USDT', '')}/USDT`;

        // 插入到输入框之前
        const inputContainer = document.querySelector('.custom-symbol-input');
        inputContainer.parentNode.insertBefore(btn, inputContainer);

        // 清空输入框并触发点击
        input.value = '';
        btn.click();
    }
}

// Export for use in other modules
window.TradingViewManager = TradingViewManager;
window.SymbolManager = SymbolManager;
