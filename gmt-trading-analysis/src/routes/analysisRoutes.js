const express = require('express');
const router = express.Router();
const binanceService = require('../services/binanceService');
const timePatternService = require('../services/timePatternService');
const periodPatternService = require('../services/periodPatternService');
const { predictdun } = require('../../reversal/examples/predict');

router.get("/dun", async (req, res) => {
    try {
        const symbol = req.query.symbol || 'GMT';
        const result = await predictdun(symbol);
        res.json(result);
    } catch (e) {
        res.status(500).json({
            error: 'Dun failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }

});

router.get('/cache', async (req, res) => {
    try {
        const symbol = `${req.query.symbol || 'GMT'}USDT`;
        const patterns = await timePatternService.getTimePatternAnalysis(symbol);
        const periodpatterns = await periodPatternService.getPeriodPatternAnalysis(symbol);
        const analysis = await binanceService.getMarketAnalysis(symbol);
        res.json({ patterns, analysis, periodpatterns });
    } catch (error) {
        console.error('Analysis route error:', error);
        res.status(500).json({
            error: 'Analysis failed',
            message: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
})

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

        console.log(`Successfully analyzed time patterns for ${symbol}`);
        res.json(patterns);
    } catch (error) {
        console.error('Time pattern analysis error:', error);
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

// GET /api/period-patterns
router.get('/period-patterns', async (req, res) => {
    try {
        const symbol = req.query.symbol || 'GMTUSDT';
        console.log(`Processing period patterns request for symbol: ${symbol}`);

        const patterns = await periodPatternService.getPeriodPatternAnalysis(symbol);

        if (!patterns || !patterns.weekdayPatterns) {
            throw new Error('Invalid period pattern analysis result');
        }

        console.log(`Successfully analyzed period patterns for ${symbol}`);
        res.json(patterns);
    } catch (error) {
        console.error('Period pattern analysis error:', error);
        res.status(500).json({
            error: 'Period pattern analysis failed',
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
