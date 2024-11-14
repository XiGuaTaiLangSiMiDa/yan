const express = require('express');
const router = express.Router();
const binanceService = require('../services/binanceService');

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
            message: error.message
        });
    }
});

// GET /api/symbols/validate
router.get('/symbols/validate', async (req, res) => {
    try {
        const symbol = req.query.symbol;
        if (!symbol) {
            return res.status(400).json({ valid: false, message: 'Symbol is required' });
        }

        // 尝试获取价格来验证交易对是否存在
        const prices = await binanceService.binance.futuresPrices();
        const valid = symbol in prices;

        res.json({
            valid,
            message: valid ? 'Valid trading pair' : 'Invalid trading pair'
        });
    } catch (error) {
        console.error('Symbol validation error:', error);
        res.status(500).json({ 
            error: 'Validation failed',
            message: error.message
        });
    }
});

module.exports = router;
