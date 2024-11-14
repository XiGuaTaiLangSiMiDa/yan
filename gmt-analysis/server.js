const express = require('express');
const Binance = require('node-binance-api');
const path = require('path');

const app = express();
const binance = new Binance().options({
    APIKEY: '',      // Not required for public data
    APISECRET: '',   // Not required for public data
    useServerTime: true,
    recvWindow: 60000,
    family: 4        // Use IPv4
});

// Serve static files from public directory
app.use(express.static('public'));

// Endpoint to get GMT/USDT klines (candlestick) data
app.get('/api/klines', async (req, res) => {
    try {
        const interval = req.query.interval || '1h';  // Default to 1 hour candles
        const limit = parseInt(req.query.limit) || 500;  // 增加获取的K线数量以便更好地分析
        
        // 使用Promise方式调用API
        const klines = await new Promise((resolve, reject) => {
            binance.candlesticks("GMTUSDT", interval, (error, ticks) => {
                if (error) return reject(error);
                resolve(ticks);
            }, {limit: limit});
        });
        
        if (!Array.isArray(klines)) {
            throw new Error('Invalid klines data received');
        }

        // 格式化数据，确保数值类型正确
        const formattedData = klines.map(candle => ({
            time: Math.floor(candle[0] / 1000), // 转换为秒级时间戳
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
        }));

        // 计算支撑位和压力位
        const levels = calculateKeyLevels(formattedData);

        // 返回K线数据和关键价格水平
        res.json({
            klines: formattedData,
            levels: levels
        });

    } catch (error) {
        console.error('Error fetching klines:', error);
        res.status(500).json({ 
            error: 'Failed to fetch data', 
            details: error.message,
            stack: error.stack 
        });
    }
});

// 计算关键价格水平
function calculateKeyLevels(data) {
    const levels = new Map();
    const volumeProfile = new Map();
    let totalVolume = 0;

    // 计算价格区间的成交量分布
    data.forEach(candle => {
        const priceRange = Math.floor(candle.close * 1000) / 1000; // 保留3位小数
        const volume = candle.volume;
        volumeProfile.set(priceRange, (volumeProfile.get(priceRange) || 0) + volume);
        totalVolume += volume;
    });

    // 找出高成交量价格区域
    const significantVolumeThreshold = totalVolume / data.length * 2; // 高于平均成交量2倍
    
    // 分析价格波动
    for (let i = 10; i < data.length - 10; i++) {
        const current = data[i];
        const prevCandles = data.slice(i - 10, i);
        const nextCandles = data.slice(i + 1, i + 11);

        // 检查是否形成局部高点或低点
        const isHigh = prevCandles.every(c => c.high <= current.high) && 
                      nextCandles.every(c => c.high <= current.high);
        const isLow = prevCandles.every(c => c.low >= current.low) && 
                     nextCandles.every(c => c.low >= current.low);

        if (isHigh) {
            const price = Math.floor(current.high * 1000) / 1000;
            const volume = volumeProfile.get(price) || 0;
            const strength = volume > significantVolumeThreshold ? 'strong' : 'weak';
            
            levels.set(price, {
                price,
                type: 'resistance',
                strength,
                volume,
                touches: (levels.get(price)?.touches || 0) + 1
            });
        }

        if (isLow) {
            const price = Math.floor(current.low * 1000) / 1000;
            const volume = volumeProfile.get(price) || 0;
            const strength = volume > significantVolumeThreshold ? 'strong' : 'weak';
            
            levels.set(price, {
                price,
                type: 'support',
                strength,
                volume,
                touches: (levels.get(price)?.touches || 0) + 1
            });
        }
    }

    // 转换为数组并按价格排序
    const sortedLevels = Array.from(levels.values())
        .sort((a, b) => b.touches - a.touches) // 首先按照触及次数排序
        .filter((level, index) => index < 10); // 只保留最重要的10个水平

    return sortedLevels;
}

// Endpoint to get volume profile data
app.get('/api/volume-profile', async (req, res) => {
    try {
        // 使用Promise方式调用API
        const klines = await new Promise((resolve, reject) => {
            binance.candlesticks("GMTUSDT", "15m", (error, ticks) => {
                if (error) return reject(error);
                resolve(ticks);
            }, {limit: 1000});
        });
        
        if (!Array.isArray(klines)) {
            throw new Error('Invalid klines data received');
        }

        // Calculate volume profile
        const volumeProfile = calculateVolumeProfile(klines);
        
        res.json(volumeProfile);
    } catch (error) {
        console.error('Error fetching volume profile:', error);
        res.status(500).json({ 
            error: 'Failed to fetch volume profile', 
            details: error.message 
        });
    }
});

function calculateVolumeProfile(klines) {
    const priceVolumes = new Map();
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let totalVolume = 0;

    klines.forEach(candle => {
        const price = Math.floor(((parseFloat(candle[2]) + parseFloat(candle[3])) / 2) * 1000) / 1000;
        const volume = parseFloat(candle[5]);
        
        minPrice = Math.min(minPrice, price);
        maxPrice = Math.max(maxPrice, price);
        totalVolume += volume;
        
        priceVolumes.set(price, (priceVolumes.get(price) || 0) + volume);
    });

    // 创建价格区间
    const levels = 20;
    const step = (maxPrice - minPrice) / levels;
    const profile = [];

    for (let i = 0; i < levels; i++) {
        const levelPrice = Math.floor((minPrice + (i * step)) * 1000) / 1000;
        let levelVolume = 0;

        // 汇总该价格区间的成交量
        priceVolumes.forEach((volume, price) => {
            if (price >= levelPrice && price < levelPrice + step) {
                levelVolume += volume;
            }
        });

        if (levelVolume > 0) {
            profile.push({
                price: levelPrice,
                volume: levelVolume,
                percentage: (levelVolume / totalVolume) * 100
            });
        }
    }

    return profile;
}

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to view the chart`);
});
