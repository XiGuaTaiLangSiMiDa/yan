const tf = require('@tensorflow/tfjs-node');
const DataProcessor = require('./dataProcessor');
const ReversalModel = require('./model');

class Predictor {
    constructor(modelPath, lookbackPeriod = 10) {
        this.modelPath = modelPath;
        this.model = new ReversalModel();
        this.dataProcessor = new DataProcessor(lookbackPeriod);
        this.labelMap = ['down', 'none', 'up'];  // Maps index to label
    }

    /**
     * Initialize predictor by loading the trained model
     */
    async initialize() {
        try {
            // Append model.json to the path if it's a directory
            const modelFilePath = this.modelPath.endsWith('model.json') 
                ? this.modelPath 
                : `${this.modelPath}/model.json`;
            await this.model.loadModel(modelFilePath);
            console.log('Model loaded successfully');
        } catch (error) {
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }

    /**
     * Prepare single prediction input
     * @param {Array} klines - Array of recent k-line data
     * @returns {tf.Tensor} Processed features tensor
     */
    preparePredictionInput(klines) {
        if (klines.length < this.dataProcessor.lookbackPeriod) {
            throw new Error(`Not enough k-lines. Need at least ${this.dataProcessor.lookbackPeriod} k-lines.`);
        }

        // Take the most recent window
        const window = klines.slice(-this.dataProcessor.lookbackPeriod);
        const features = this.dataProcessor.extractFeatures(window);
        
        // Reshape features for model input
        return tf.tensor2d([features]);
    }

    /**
     * Calculate prediction confidence
     * @param {Array} probabilities - Array of class probabilities
     * @returns {number} Confidence score (0-1)
     */
    calculateConfidence(probabilities) {
        // Use the highest probability as confidence
        return Math.max(...probabilities);
    }

    /**
     * Make prediction on new k-line data
     * @param {Array} klines - Array of recent k-line data
     * @returns {Object} Prediction result with label and probabilities
     */
    async predict(klines) {
        if (!this.model) {
            throw new Error('Model not initialized. Call initialize() first.');
        }

        const input = this.preparePredictionInput(klines);
        const prediction = await this.model.predict(input);
        const probabilities = prediction.dataSync();
        
        // Get predicted class index (argmax)
        const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
        const confidence = this.calculateConfidence(probabilities);

        // Clean up tensors
        input.dispose();
        prediction.dispose();

        return {
            probabilities: {
                down: probabilities[0],
                none: probabilities[1],
                up: probabilities[2]
            },
            label: this.labelMap[predictedIndex],
            confidence,
            timestamp: klines[klines.length - 1].openTime
        };
    }

    /**
     * Make predictions on multiple k-line windows
     * @param {Array} klinesArray - Array of k-line windows
     * @returns {Array} Array of prediction results
     */
    async batchPredict(klinesArray) {
        if (!this.model) {
            throw new Error('Model not initialized. Call initialize() first.');
        }

        const predictions = [];
        for (const klines of klinesArray) {
            const prediction = await this.predict(klines);
            predictions.push(prediction);
        }

        return predictions;
    }

    /**
     * Get prediction with additional metrics
     * @param {Array} klines - Array of recent k-line data
     * @returns {Object} Enhanced prediction result with additional metrics
     */
    async getPredictionWithMetrics(klines) {
        const prediction = await this.predict(klines);
        
        // Calculate additional technical metrics
        const lastKline = klines[klines.length - 1];
        const prevKline = klines[klines.length - 2];
        
        const metrics = {
            priceChange: (lastKline.close - lastKline.open) / lastKline.open,
            volumeChange: lastKline.volume / prevKline.volume - 1,
            highLowRange: (lastKline.high - lastKline.low) / lastKline.low,
            timestamp: lastKline.openTime,
            
            // Additional metrics
            closePriceChange: (lastKline.close - prevKline.close) / prevKline.close,
            volumeMA5: this.calculateVolumeMA(klines, 5),
            priceMA5: this.calculatePriceMA(klines, 5),
            volatility: this.calculateVolatility(klines, 5)
        };

        return {
            ...prediction,
            metrics
        };
    }

    /**
     * Calculate volume moving average
     * @param {Array} klines - Array of k-line data
     * @param {number} period - MA period
     * @returns {number} Volume MA
     */
    calculateVolumeMA(klines, period) {
        const volumes = klines.slice(-period).map(k => k.volume);
        return volumes.reduce((a, b) => a + b, 0) / period;
    }

    /**
     * Calculate price moving average
     * @param {Array} klines - Array of k-line data
     * @param {number} period - MA period
     * @returns {number} Price MA
     */
    calculatePriceMA(klines, period) {
        const prices = klines.slice(-period).map(k => k.close);
        return prices.reduce((a, b) => a + b, 0) / period;
    }

    /**
     * Calculate price volatility
     * @param {Array} klines - Array of k-line data
     * @param {number} period - Period for volatility calculation
     * @returns {number} Volatility
     */
    calculateVolatility(klines, period) {
        const returns = [];
        const data = klines.slice(-period);
        
        for (let i = 1; i < data.length; i++) {
            const ret = (data[i].close - data[i-1].close) / data[i-1].close;
            returns.push(ret);
        }
        
        const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Validate prediction against actual outcome
     * @param {Object} prediction - Prediction result
     * @param {string} actualReversal - Actual reversal outcome
     * @returns {Object} Validation metrics
     */
    validatePrediction(prediction, actualReversal) {
        const correct = prediction.label === actualReversal;
        return {
            correct,
            predictedLabel: prediction.label,
            actualLabel: actualReversal,
            probabilities: prediction.probabilities,
            confidence: prediction.confidence,
            metrics: prediction.metrics
        };
    }
}

module.exports = Predictor;
