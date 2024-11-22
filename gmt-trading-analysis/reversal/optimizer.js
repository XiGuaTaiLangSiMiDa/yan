const ReversalModel = require('./model');

class ModelOptimizer {
    constructor() {
        // Define hyperparameter search spaces
        this.hyperparameterSpace = {
            learningRate: [0.0001, 0.0005, 0.001],
            batchSize: [32, 64, 128],
            layers: [
                // Architecture 1: Deep network with batch normalization
                [
                    { type: 'dense', units: 64, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dropout', rate: 0.2 },
                    { type: 'dense', units: 32, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dropout', rate: 0.1 },
                    { type: 'dense', units: 3, activation: 'softmax' }  // Changed to 3 units with softmax
                ],
                // Architecture 2: Wider network with more regularization
                [
                    { type: 'dense', units: 128, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dropout', rate: 0.3 },
                    { type: 'dense', units: 64, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dropout', rate: 0.2 },
                    { type: 'dense', units: 32, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dense', units: 3, activation: 'softmax' }  // Changed to 3 units with softmax
                ],
                // Architecture 3: Shallow network with strong regularization
                [
                    { type: 'dense', units: 32, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dropout', rate: 0.3 },
                    { type: 'dense', units: 16, activation: 'relu' },
                    { type: 'batchNormalization' },
                    { type: 'dense', units: 3, activation: 'softmax' }  // Changed to 3 units with softmax
                ]
            ]
        };
    }

    /**
     * Perform random search over hyperparameter space
     * @param {Object} trainData - Training data
     * @param {Object} valData - Validation data
     * @param {number} numTrials - Number of random trials
     * @param {number} epochs - Number of epochs for each trial
     * @returns {Promise<Object>} Best configuration and its performance
     */
    async randomSearch(trainData, valData, numTrials = 10, epochs = 50) {
        let bestConfig = null;
        let bestScore = -Infinity;
        const results = [];

        for (let i = 0; i < numTrials; i++) {
            const config = this._generateRandomConfig();
            console.log(`\nTrial ${i + 1}/${numTrials}`);
            console.log('Configuration:', JSON.stringify(config, null, 2));

            try {
                // Train and evaluate model with current configuration
                const model = new ReversalModel({
                    ...config,
                    epochs: epochs
                });

                model.buildModel(trainData.features.shape[1]);
                await model.train(trainData, valData);
                const evaluation = await model.evaluate(valData);

                results.push({
                    config: config,
                    performance: evaluation
                });

                console.log('Validation accuracy:', evaluation.accuracy);

                // Update best configuration if current one performs better
                if (evaluation.accuracy > bestScore) {
                    bestScore = evaluation.accuracy;
                    bestConfig = config;
                }
            } catch (error) {
                console.error('Error during training:', error);
                continue;
            }
        }

        // Sort results by performance
        results.sort((a, b) => b.performance.accuracy - a.performance.accuracy);

        // Log top 3 configurations
        console.log('\nTop 3 Configurations:');
        for (let i = 0; i < Math.min(3, results.length); i++) {
            console.log(`\n#${i + 1}:`);
            console.log('Config:', JSON.stringify(results[i].config, null, 2));
            console.log('Accuracy:', results[i].performance.accuracy);
        }

        return {
            bestConfig,
            bestScore,
            allResults: results
        };
    }

    /**
     * Generate random configuration from hyperparameter space
     * @returns {Object} Random configuration
     * @private
     */
    _generateRandomConfig() {
        const { learningRate, batchSize, layers } = this.hyperparameterSpace;

        return {
            learningRate: learningRate[Math.floor(Math.random() * learningRate.length)],
            batchSize: batchSize[Math.floor(Math.random() * batchSize.length)],
            layers: layers[Math.floor(Math.random() * layers.length)]
        };
    }

    /**
     * Calculate moving average
     * @param {Array} arr - Array of numbers
     * @param {number} windowSize - Window size for moving average
     * @returns {Array} Moving averages
     * @private
     */
    _calculateMovingAverage(arr, windowSize) {
        const result = [];
        for (let i = 0; i < arr.length - windowSize + 1; i++) {
            const window = arr.slice(i, i + windowSize);
            const average = window.reduce((a, b) => a + b) / windowSize;
            result.push(average);
        }
        return result;
    }

    /**
     * Check if training has converged
     * @param {Array} losses - Array of loss values
     * @param {number} patience - Number of epochs to wait
     * @param {number} minDelta - Minimum change in loss to consider as improvement
     * @returns {boolean} Whether training has converged
     * @private
     */
    _hasConverged(losses, patience = 5, minDelta = 1e-4) {
        if (losses.length < patience) return false;
        
        const recentLosses = losses.slice(-patience);
        const avgLoss = recentLosses.reduce((a, b) => a + b) / patience;
        
        return recentLosses.every(loss => Math.abs(loss - avgLoss) < minDelta);
    }
}

module.exports = ModelOptimizer;
