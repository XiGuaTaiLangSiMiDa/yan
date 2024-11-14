// 初始化图表配置
const chartContainer = document.getElementById('chart-container');
const chart = LightweightCharts.createChart(chartContainer, {
    layout: {
        background: { color: '#1e222d' },
        textColor: '#d1d4dc',
    },
    grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
    },
    crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: {
            width: 1,
            color: '#9B7DFF',
            style: 0,
            labelBackgroundColor: '#9B7DFF',
        },
        horzLine: {
            width: 1,
            color: '#9B7DFF',
            style: 0,
            labelBackgroundColor: '#9B7DFF',
        },
    },
    rightPriceScale: {
        borderColor: '#2a2e39',
        scaleMargins: {
            top: 0.1,
            bottom: 0.2,
        },
    },
    timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
    },
});

// 创建K线图系列
const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#26a69a',
    downColor: '#ef5350',
    borderVisible: false,
    wickUpColor: '#26a69a',
    wickDownColor: '#ef5350',
});

// 创建成交量系列
const volumeSeries = chart.addHistogramSeries({
    color: '#26a69a',
    priceFormat: {
        type: 'volume',
    },
    priceScaleId: 'volume',
    scaleMargins: {
        top: 0.8,
        bottom: 0,
    },
});

// 存储所有价格线
let priceLines = [];

// 清除所有价格线
function clearPriceLines() {
    priceLines.forEach(line => {
        candlestickSeries.removePriceLine(line);
    });
    priceLines = [];
}

// 添加价格水平线
function addPriceLines(levels, currentPrice) {
    clearPriceLines();
    
    levels.forEach(level => {
        const isNearCurrent = Math.abs(level.price - currentPrice) / currentPrice < 0.05; // 在当前价格5%范围内
        const color = level.type === 'support' ? '#26a69a' : '#ef5350';
        const lineStyle = level.strength === 'strong' ? 0 : 2; // 0是实线，2是虚线
        const lineWidth = level.strength === 'strong' ? 2 : 1;
        
        if (isNearCurrent || level.strength === 'strong') {
            const line = candlestickSeries.createPriceLine({
                price: level.price,
                color: color,
                lineWidth: lineWidth,
                lineStyle: lineStyle,
                axisLabelVisible: true,
                title: `${level.type === 'support' ? '支撑' : '压力'} ${level.strength === 'strong' ? '(强)' : ''} Vol:${Math.round(level.volume)}`,
            });
            
            priceLines.push(line);
        }
    });
}

// 更新图表和指标
async function updateChart() {
    try {
        // 获取K线和价格水平数据
        const response = await fetch('/api/klines?interval=1h');
        const data = await response.json();
        
        if (!data.klines || !Array.isArray(data.klines)) {
            console.error('Invalid klines data received');
            return;
        }

        // 更新K线图
        candlestickSeries.setData(data.klines);

        // 更新成交量
        const volumeData = data.klines.map(d => ({
            time: d.time,
            value: d.volume,
            color: d.close > d.open ? '#26a69a' : '#ef5350'
        }));
        volumeSeries.setData(volumeData);

        // 获取当前价格
        const currentPrice = data.klines[data.klines.length - 1].close;

        // 添加价格水平线
        if (data.levels && Array.isArray(data.levels)) {
            addPriceLines(data.levels, currentPrice);
        }

        // 更新价格信息显示
        const lastData = data.klines[data.klines.length - 1];
        const lastTime = new Date(lastData.time * 1000);

        // 获取最近的支撑位和压力位
        const nearestSupport = data.levels
            .filter(level => level.type === 'support' && level.price < currentPrice)
            .sort((a, b) => b.price - a.price)[0];

        const nearestResistance = data.levels
            .filter(level => level.type === 'resistance' && level.price > currentPrice)
            .sort((a, b) => a.price - b.price)[0];

        // 更新信息面板
        document.getElementById('price-info').innerHTML = `
            <div style="font-size: 16px; margin-bottom: 10px;">
                <strong>GMT/USDT</strong> 
                <span style="color: ${lastData.close >= lastData.open ? '#26a69a' : '#ef5350'}">
                    ${currentPrice.toFixed(4)}
                </span>
            </div>
            <div style="font-size: 14px; color: #9ba6b2;">
                开: ${lastData.open.toFixed(4)} 
                高: ${lastData.high.toFixed(4)} 
                低: ${lastData.low.toFixed(4)} 
                收: ${lastData.close.toFixed(4)}
            </div>
            <div style="font-size: 12px; color: #9ba6b2; margin-top: 5px;">
                更新时间: ${lastTime.toLocaleString('zh-CN')}
            </div>
            <div style="font-size: 13px; margin-top: 10px;">
                <strong>关键价格水平：</strong><br>
                ${nearestResistance ? 
                    `最近压力位: ${nearestResistance.price.toFixed(4)} (${nearestResistance.strength})<br>` : ''}
                ${nearestSupport ? 
                    `最近支撑位: ${nearestSupport.price.toFixed(4)} (${nearestSupport.strength})<br>` : ''}
            </div>
            <div style="font-size: 13px; margin-top: 10px;">
                <strong>图表说明：</strong><br>
                - 绿色K线：上涨（收盘价>开盘价）<br>
                - 红色K线：下跌（收盘价<开盘价）<br>
                - 绿色水平线：支撑位（实线表示强支撑）<br>
                - 红色水平线：压力位（实线表示强压力）<br>
                - 价格水平标注包含成交量信息
            </div>
        `;

        // 自适应图表
        chart.timeScale().fitContent();

    } catch (error) {
        console.error('Error updating chart:', error);
    }
}

// 初始更新
updateChart();

// 每分钟更新一次
setInterval(updateChart, 60000);

// 处理窗口大小变化
window.addEventListener('resize', () => {
    chart.applyOptions({
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight
    });
});

// 添加图表交互提示
chart.subscribeCrosshairMove(param => {
    if (param.time) {
        const data = param.seriesData.get(candlestickSeries);
        if (data) {
            const tooltip = document.getElementById('tooltip') || createTooltip();
            tooltip.style.display = 'block';
            tooltip.style.left = param.point.x + 'px';
            tooltip.style.top = param.point.y + 'px';
            tooltip.innerHTML = `
                <div>时间: ${new Date(param.time * 1000).toLocaleString('zh-CN')}</div>
                <div>开盘: ${data.open}</div>
                <div>最高: ${data.high}</div>
                <div>最低: ${data.low}</div>
                <div>收盘: ${data.close}</div>
                <div>成交量: ${param.seriesData.get(volumeSeries)?.value?.toFixed(2) || 'N/A'}</div>
            `;
        }
    } else {
        const tooltip = document.getElementById('tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }
});

function createTooltip() {
    const tooltip = document.createElement('div');
    tooltip.id = 'tooltip';
    tooltip.style.position = 'absolute';
    tooltip.style.backgroundColor = 'rgba(42, 46, 57, 0.95)';
    tooltip.style.color = 'white';
    tooltip.style.padding = '8px';
    tooltip.style.fontSize = '12px';
    tooltip.style.borderRadius = '4px';
    tooltip.style.zIndex = '1000';
    tooltip.style.pointerEvents = 'none';
    document.body.appendChild(tooltip);
    return tooltip;
}
