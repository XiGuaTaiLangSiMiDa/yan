const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');

class DataProcessor {
    constructor(lookbackPeriod = 10) {
        this.lookbackPeriod = lookbackPeriod;
        this.featureColumns = ['open', 'high', 'low', 'close', 'volume'];
        this.featureStats = null;
    }

    /**
     * Load and preprocess k-line data
     * @param {string} filePath - Path to JSON file
     * @returns {Object} Processed data
     */
    async loadData(filePath) {
        console.log('Loading data from:', filePath);
        const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log('Total records:', rawData.length);

        // Log a few sample records before processing
        console.log('\nSample raw data (first 3 records):');
        console.log(JSON.stringify(rawData.slice(0, 3), null, 2));

        const processedData = this.preprocessData(rawData);

        // Log sample values from processed tensors
        console.log('\nProcessed data sample values:');
        console.log('Features (first row):', processedData.features.slice([0, 0], [1, -1]).arraySync());
        console.log('Labels (first 10 values):', processedData.labels.slice([0], [10]).arraySync());

        // Verify label distribution
        const labelCounts = {0: 0, 1: 0, 2: 0};
        const labelValues = processedData.labels.arraySync();
        labelValues.forEach(label => {
            labelCounts[Math.floor(label)] = (labelCounts[Math.floor(label)] || 0) + 1;
        });
        console.log('\nLabel distribution:');
        console.log('Down (0):', labelCounts[0]);
        console.log('None (1):', labelCounts[1]);
        console.log('Up (2):', labelCounts[2]);

        return processedData;
    }

    /**
     * Calculate z-score normalization parameters
     * @param {Array} data - Array of values
     * @returns {Object} Mean and standard deviation
     */
    calculateNormParams(data) {
        const mean = data.reduce((a, b) => a + b, 0) / data.length;
        const std = Math.sqrt(
            data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / data.length
        );
        return { mean, std: std === 0 ? 1 : std };
    }

    /**
     * Normalize value using z-score normalization
     * @param {number} value - Value to normalize
     * @param {Object} params - Normalization parameters
     * @returns {number} Normalized value
     */
    normalize(value, params) {
        return (value - params.mean) / params.std;
    }

    /**
     * Extract technical features from a window of k-line data
     * @param {Array} window - Window of k-line data
     * @returns {Array} Extracted features
     */
    extractFeatures(window) {
        const features = [];
        
        // Price changes (returns)
        for (let i = 1; i < window.length; i++) {
            const priceChange = (window[i].close - window[i-1].close) / window[i-1].close;
            features.push(priceChange);
        }

        // Volatility (High-Low range)
        for (const candle of window) {
            const volatility = (candle.high - candle.low) / candle.low;
            features.push(volatility);
        }

        // Volume changes
        for (let i = 1; i < window.length; i++) {
            const volumeChange = (window[i].volume - window[i-1].volume) / window[i-1].volume;
            features.push(volumeChange);
        }

        // Price momentum (ROC)
        const momentum = (window[window.length-1].close - window[0].close) / window[0].close;
        features.push(momentum);

        // Moving averages
        const ma5 = window.slice(-5).reduce((acc, curr) => acc + curr.close, 0) / 5;
        const ma10 = window.reduce((acc, curr) => acc + curr.close, 0) / window.length;
        features.push((window[window.length-1].close - ma5) / ma5);
        features.push((window[window.length-1].close - ma10) / ma10);

        // Replace any NaN or Infinity values with 0
        return features.map(f => {
            if (isNaN(f) || !isFinite(f)) return 0;
            return f;
        });
    }

    /**
     * Preprocess raw k-line data
     * @param {Array} data - Raw k-line data
     * @returns {Object} Processed data with features and labels
     */
    preprocessData(data) {
        // Extract features and labels
        const features = [];
        const labels = [];
        let skippedCount = 0;
        
        for (let i = this.lookbackPeriod; i < data.length; i++) {
            const window = data.slice(i - this.lookbackPeriod, i);
            const currentFeatures = this.extractFeatures(window);
            
            // Skip if any feature is invalid
            if (currentFeatures.some(f => isNaN(f) || !isFinite(f))) {
                skippedCount++;
                continue;
            }
            
            features.push(currentFeatures);
            
            // Convert reversal label to numeric: 0 for down, 1 for none, 2 for up
            let label;
            switch (data[i].reversal) {
                case 'up':
                    label = 2.0;  // Use float values
                    break;
                case 'none':
                    label = 1.0;  // Use float values
                    break;
                case 'down':
                    label = 0.0;  // Use float values
                    break;
                default:
                    console.warn(`Unknown reversal value: ${data[i].reversal}`);
                    skippedCount++;
                    continue;
            }
            labels.push(label);
        }

        console.log(`\nSkipped ${skippedCount} records due to invalid features or unknown reversal values`);

        // Convert to tensors
        const featureTensor = tf.tensor2d(features);
        const labelTensor = tf.tensor1d(labels, 'float32');  // Changed to float32 dtype

        // Calculate normalization parameters if not already calculated
        if (!this.featureStats) {
            this.featureStats = [];
            for (let i = 0; i < features[0].length; i++) {
                const column = features.map(row => row[i]);
                this.featureStats.push(this.calculateNormParams(column));
            }
        }

        // Normalize features
        const normalizedFeatures = features.map(row => 
            row.map((val, i) => this.normalize(val, this.featureStats[i]))
        );

        console.log('Processed features shape:', [normalizedFeatures.length, normalizedFeatures[0].length]);
        console.log('Labels shape:', [labels.length]);

        return {
            features: tf.tensor2d(normalizedFeatures),
            labels: labelTensor
        };
    }

    /**
     * Split data into training and validation sets
     * @param {Object} data - Processed data with features and labels
     * @param {number} validationSplit - Fraction of data to use for validation
     * @returns {Object} Training and validation data
     */
    splitData(data, validationSplit = 0.2) {
        const numSamples = data.features.shape[0];
        const splitIndex = Math.floor(numSamples * (1 - validationSplit));

        const trainFeatures = data.features.slice([0, 0], [splitIndex, -1]);
        const trainLabels = data.labels.slice([0], [splitIndex]);
        const valFeatures = data.features.slice([splitIndex, 0], [-1, -1]);
        const valLabels = data.labels.slice([splitIndex], [-1]);

        console.log('Train/Val split:', splitIndex, '/', numSamples - splitIndex);

        return {
            train: {
                features: trainFeatures,
                labels: trainLabels
            },
            validation: {
                features: valFeatures,
                labels: valLabels
            }
        };
    }
}

module.exports = DataProcessor;
