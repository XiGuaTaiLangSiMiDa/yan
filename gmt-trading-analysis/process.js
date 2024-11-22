// Import required modules
const fs = require('fs');
const path = require('path');

// Global configuration
const ANALYSIS_CONFIG = {
    REVERSAL_THRESHOLD: 0.01,
    LOOKBACK_PERIOD: 3,
    FORWARD_PERIOD: 5,
};

// Logging function
function log(message) {
    console.log(message);
}

/**
 * Calculate trend strengths for a series of prices
 */
function calculateTrendStrengths(prices) {
    let downwardStrength = 0;
    let upwardStrength = 0;

    for (let i = 1; i < prices.length; i++) {
        const priceChange = (prices[i] - prices[i - 1]) / prices[i - 1];
        if (priceChange < 0) downwardStrength += Math.abs(priceChange);
        if (priceChange > 0) upwardStrength += priceChange;
    }

    return { downwardStrength, upwardStrength };
}

/**
 * Check if price movement meets reversal criteria
 */
function checkReversalCriteria(currentPrice, nextPrices) {
    const maxFuturePrice = Math.max(...nextPrices);
    const minFuturePrice = Math.min(...nextPrices);

    return {
        upward: {
            change: (maxFuturePrice - currentPrice) / currentPrice,
            effective: (maxFuturePrice - currentPrice) / currentPrice > ANALYSIS_CONFIG.REVERSAL_THRESHOLD * 2
        },
        downward: {
            change: (currentPrice - minFuturePrice) / currentPrice,
            effective: (currentPrice - minFuturePrice) / currentPrice > ANALYSIS_CONFIG.REVERSAL_THRESHOLD * 2
        }
    };
}

/**
 * Detect reversal points in kline data
 */
function detectReversalPoints(klines) {
    const reversals = [];
    const { LOOKBACK_PERIOD, FORWARD_PERIOD, REVERSAL_THRESHOLD } = ANALYSIS_CONFIG;

    log(`Analyzing ${klines.length} klines for reversal points...`);

    for (let i = LOOKBACK_PERIOD; i < klines.length - FORWARD_PERIOD; i++) {
        const currentPrice = klines[i].close;
        const prevPrices = klines.slice(i - LOOKBACK_PERIOD, i).map(k => k.close);
        const nextPrices = klines.slice(i + 1, i + FORWARD_PERIOD + 1).map(k => k.close);

        const { downwardStrength, upwardStrength } = calculateTrendStrengths(prevPrices);
        const criteria = checkReversalCriteria(currentPrice, nextPrices);

        if (downwardStrength > upwardStrength && criteria.upward.change > REVERSAL_THRESHOLD) {
            log(`Found upward reversal at index ${i}, price: ${currentPrice}`);
            reversals.push({
                index: i,
                type: 'upward',
                timestamp: klines[i].openTime,
                price: currentPrice,
                strength: downwardStrength,
                effective: criteria.upward.effective
            });
        }
        else if (upwardStrength > downwardStrength && criteria.downward.change > REVERSAL_THRESHOLD) {
            log(`Found downward reversal at index ${i}, price: ${currentPrice}`);
            reversals.push({
                index: i,
                type: 'downward',
                timestamp: klines[i].openTime,
                price: currentPrice,
                strength: upwardStrength,
                effective: criteria.downward.effective
            });
        }
    }

    log(`Found ${reversals.length} reversal points`);
    return reversals;
}

// Main processing function
async function processData(dir = "cache", file = "SOLUSDT_1h_klines_cache") {
    try {
        // Read input data
        const inputPath = path.join(__dirname, dir, `${file}.json`);
        const data = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

        // Detect reversal points
        const reversals = detectReversalPoints(data);

        // Create a map of timestamps to reversal types
        const reversalMap = new Map(
            reversals.map(r => [r.timestamp, r.type])
        );

        // Add reversal markers to each data point
        const processedData = data.map(kline => ({
            ...kline,
            reversal: reversalMap.get(kline.openTime) === 'upward' ? 'up' :
                reversalMap.get(kline.openTime) === 'downward' ? 'down' :
                    'none'
        }));

        // Write output data
        const outputPath = path.join(__dirname, dir, `${file}_V.json`);
        fs.writeFileSync(outputPath, JSON.stringify(processedData, null, 2));

        log('Processing completed successfully');
    } catch (error) {
        console.error('Error processing data:', error);
    }
}

// Run the processing
processData();
