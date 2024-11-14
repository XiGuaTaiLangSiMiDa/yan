const express = require('express');
const router = express.Router();
const binanceService = require('../services/binanceService');
const timePatternService = require('../services/timePatternService');

// GET /api/analysis
router.get('/analysis', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'GMTUSDT';
        const analysis = await binanceService.getMarketAnalysis(symbol);
        res.json(analysis);
    } catch (error) {
        console.error('Analysis route error:', error);
        res.status(500).json({ 
            error: 'Analysis failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// GET /api/time-patterns
router.get('/time-patterns', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'GMTUSDT';
        console.log(`Processing time patterns request for symbol: ${symbol}`);
        
        const patterns = await timePatternService.getTimePatternAnalysis(symbol);
        
        if (!patterns || !patterns.hourlyPatterns) {
            throw new Error('Invalid pattern analysis result');
        }
        
        console.log(`Successfully analyzed patterns for ${symbol}`);
        res.json(patterns);
    } catch (error) {
        console.error('Time pattern analysis error:', error);
        
        // 发送更详细的错误信息给客户端
        res.status(500).json({ 
            error: 'Time pattern analysis failed',
            message: error.message,
            symbol: req.query.symbol || 'GMTUSDT',
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                timestamp: new Date().toISOString()
            } : undefined
        });
    }
});

// GET /api/symbols/validate
router.get('/symbols/validate', async (req, res) => {
    try {
        const symbol = req.query.symbol;
        if (!symbol) {
            return res.status(400).json({ 
                valid: false, 
                message: 'Symbol is required',
                details: 'Please provide a trading pair symbol (e.g., BTCUSDT)'
            });
        }

        // 尝试获取价格来验证交易对是否存在
        const prices = await binanceService.binance.futuresPrices();
        const valid = symbol in prices;

        res.json({
            valid,
            message: valid ? 'Valid trading pair' : 'Invalid trading pair',
            symbol: symbol,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Symbol validation error:', error);
        res.status(500).json({ 
            error: 'Validation failed',
            message: error.message,
            symbol: req.query.symbol,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

module.exports = router;
