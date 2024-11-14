# 加密货币交易分析系统

一个基于Web的加密货币交易分析工具，提供多维度的市场分析和交易决策支持。

[English Version](#cryptocurrency-trading-analysis-system)

## 主要功能

### 1. 市场分析
- 实时价格监控
- RSI指标分析
- 支撑位/阻力位识别
- 趋势分析和建议
- 布林带技术指标

### 2. 时间模式分析
- 24小时交易模式
- 最佳交易时段识别
- 成交量分布分析
- 每小时详细统计

### 3. 周期模式分析
- 每周交易日分析
- 每月日期分析
- 年度周数分析
- 年度月份分析

## 快速开始

1. 安装依赖
```bash
npm install
```

2. 启动服务器
```bash
npm start
```

3. 访问应用
```
http://localhost:7777
```

## 使用说明

1. 选择交易对
   - 支持GMT/USDT等主流交易对
   - 可添加自定义交易对

2. 查看分析数据
   - 市场分析总结
   - 时间模式分析
   - 周期模式分析
   - 价格水平分析

3. 技术指标
   - RSI指标
   - 布林带
   - 支撑位/阻力位

---

# Cryptocurrency Trading Analysis System

A web-based cryptocurrency trading analysis tool providing multi-dimensional market analysis and trading decision support.

## Key Features

### 1. Market Analysis
- Real-time price monitoring
- RSI indicator analysis
- Support/Resistance levels
- Trend analysis
- Bollinger Bands

### 2. Time Pattern Analysis
- 24-hour trading patterns
- Best trading time identification
- Volume distribution analysis
- Hourly detailed statistics

### 3. Period Pattern Analysis
- Weekly trading day analysis
- Monthly date analysis
- Yearly week analysis
- Yearly month analysis

## Quick Start

1. Install dependencies
```bash
npm install
```

2. Start server
```bash
npm start
```

3. Access application
```
http://localhost:7777
```

## Usage Guide

1. Select Trading Pair
   - Supports major pairs (GMT/USDT etc.)
   - Custom pair addition

2. View Analysis
   - Market summary
   - Time pattern analysis
   - Period pattern analysis
   - Price level analysis

3. Technical Indicators
   - RSI
   - Bollinger Bands
   - Support/Resistance levels

## Project Structure

```
gmt-trading-analysis/
├── public/
│   ├── css/          # Stylesheets
│   ├── js/           # Frontend JavaScript
│   └── index.html    # Main page
├── src/
│   ├── routes/       # API routes
│   └── services/     # Business logic
├── server.js         # Server entry
└── package.json      # Project config
```

## Technical Stack

- Frontend: HTML5, CSS3, JavaScript
- Charts: Chart.js, TradingView
- Backend: Node.js, Express
- API: Binance API

## Notes

- All analysis and suggestions are for reference only
- Not financial advice
- Be aware of cryptocurrency market risks

## License

MIT License
