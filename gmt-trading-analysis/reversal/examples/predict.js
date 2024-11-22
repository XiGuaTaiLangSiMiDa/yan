const path = require('path');
const ReversalPredictor = require('../index');
const { fetchKlines } = require('../../src/cache/datafetcher');

async function predictdun(symbol = "SOL") {
    try {
        // Initialize predictor with trained model
        const predictor = new ReversalPredictor({
            lookbackPeriod: 10,
            modelPath: path.join(__dirname, '../saved_model')
        });

        // Load the trained model
        console.log('Loading trained model...');
        await predictor.initialize();

        // For demonstration, we'll load some recent data from the cache file
        // In practice, you might want to use real-time data
        //const dataPath = path.join(__dirname, '../../cache/SOLUSDT_1h_klines_cache_V.json');
        //const data = require(dataPath);
        const data = await fetchKlines({
            symbol: `${symbol}USDT`,
            interval: "1h",
            limit: 100,
        });

        // Get the most recent window of data
        const recentKlines = data.slice(-11); // 11 = lookbackPeriod + 1 (for prediction)

        // Make prediction
        console.log('\nMaking prediction for the latest k-line...');
        const prediction = await predictor.predict(recentKlines);

        // Display results
        console.log('\nPrediction Results:');
        console.log('Predicted reversal:', prediction.label);
        console.log('\nClass Probabilities:');
        console.log('Up:', prediction.probabilities.up.toFixed(4));
        console.log('None:', prediction.probabilities.none.toFixed(4));
        console.log('Down:', prediction.probabilities.down.toFixed(4));
        console.log('\nConfidence:', prediction.confidence.toFixed(4));

        // Display additional metrics
        console.log('\nMetrics:');
        console.log('Price change:', (prediction.metrics.priceChange * 100).toFixed(2) + '%');
        console.log('Volume change:', (prediction.metrics.volumeChange * 100).toFixed(2) + '%');
        console.log('High-Low range:', (prediction.metrics.highLowRange * 100).toFixed(2) + '%');
        console.log('Timestamp:', new Date(prediction.metrics.timestamp).toISOString());
        return prediction;
    } catch (error) {
        console.error('Error during prediction:', error);
        process.exit(1);
    }
}

// Example of how to use the predictor in a continuous monitoring setup
async function monitorAndPredict(interval = 6000) { // Default 1 hour
    const predictor = new ReversalPredictor({
        lookbackPeriod: 10,
        modelPath: path.join(__dirname, '../saved_model')
    });

    try {
        await predictor.initialize();
        console.log('Model initialized, starting monitoring...');

        setInterval(async () => {
            try {
                // In practice, you would fetch the latest k-lines from your data source
                // const dataPath = path.join(__dirname, '../../cache/SOLUSDT_1h_klines_cache_V.json');
                // const data = require(dataPath);
                const data = await fetchKlines({
                    symbol: "SOLUSDT",
                    interval: "1h",
                    limit: 100,
                });
                const recentKlines = data.slice(-11);

                const prediction = await predictor.predict(recentKlines);

                console.log('\n=== New Prediction ===');
                console.log('Time:', new Date().toISOString());
                console.log('Predicted reversal:', prediction.label);
                console.log('\nClass Probabilities:');
                console.log('Up:', prediction.probabilities.up.toFixed(4));
                console.log('None:', prediction.probabilities.none.toFixed(4));
                console.log('Down:', prediction.probabilities.down.toFixed(4));
                console.log('\nConfidence:', prediction.confidence.toFixed(4));

            } catch (error) {
                console.error('Error in monitoring loop:', error);
            }
        }, interval);

    } catch (error) {
        console.error('Error initializing predictor:', error);
        process.exit(1);
    }
}

// Run single prediction by default
// Uncomment the following line to start continuous monitoring
// monitorAndPredict();

predictdun();


module.exports = {
    predictdun
};