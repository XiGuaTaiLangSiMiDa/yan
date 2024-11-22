const path = require('path');
const DataProcessor = require('./dataProcessor');
const ReversalModel = require('./model');
const ModelOptimizer = require('./optimizer');
const Predictor = require('./predictor');

class ReversalPredictor {
    constructor(config = {}) {
        this.config = {
            lookbackPeriod: config.lookbackPeriod || 10,
            modelPath: config.modelPath || path.join(__dirname, 'saved_model'),
            validationSplit: config.validationSplit || 0.2,
            optimizationTrials: config.optimizationTrials || 10,
            epochs: config.epochs || 100,
            hyperparameterSpace: config.hyperparameterSpace
        };

        this.dataProcessor = new DataProcessor(this.config.lookbackPeriod);
        this.optimizer = new ModelOptimizer();
        this.predictor = null;
    }

    /**
     * Train a new model with hyperparameter optimization
     * @param {string} dataPath - Path to training data
     * @param {Object} options - Training options
     * @returns {Promise<Object>} Training results
     */
    async trainModel(dataPath, options = {}) {
        try {
            console.log('Loading and processing data...');
            const data = await this.dataProcessor.loadData(dataPath);
            
            // Split data into train and validation sets
            console.log('Splitting data into train/validation sets...');
            const { train, validation } = this.dataProcessor.splitData(data, this.config.validationSplit);
            
            console.log('Starting hyperparameter optimization...');
            console.log(`Will try ${this.config.optimizationTrials} different configurations`);
            
            const optimizationResults = await this.optimizer.randomSearch(
                train,
                validation,
                this.config.optimizationTrials,
                this.config.epochs
            );

            console.log('\nBest configuration found:', JSON.stringify(optimizationResults.bestConfig, null, 2));
            console.log('Best validation accuracy:', optimizationResults.bestScore);

            // Train final model with best configuration
            console.log('\nTraining final model with best configuration...');
            const finalModel = new ReversalModel({
                ...optimizationResults.bestConfig,
                epochs: this.config.epochs
            });

            finalModel.buildModel(train.features.shape[1]);
            const history = await finalModel.train(train, validation);

            // Save the model
            await finalModel.saveModel(this.config.modelPath);
            console.log('Model saved to:', this.config.modelPath);

            // Initialize predictor with the trained model
            this.predictor = new Predictor(this.config.modelPath, this.config.lookbackPeriod);
            await this.predictor.initialize();

            return {
                config: optimizationResults.bestConfig,
                performance: optimizationResults.bestScore,
                history: history,
                allResults: optimizationResults.allResults
            };

        } catch (error) {
            console.error('Error during training:', error);
            throw error;
        }
    }

    /**
     * Initialize predictor with trained model
     */
    async initialize() {
        if (!this.predictor) {
            this.predictor = new Predictor(this.config.modelPath, this.config.lookbackPeriod);
        }
        await this.predictor.initialize();
    }

    /**
     * Make prediction on new k-line data
     * @param {Array} klines - Array of recent k-line data
     * @returns {Promise<Object>} Prediction result
     */
    async predict(klines) {
        if (!this.predictor) {
            throw new Error('Predictor not initialized. Call initialize() first.');
        }
        return this.predictor.getPredictionWithMetrics(klines);
    }

    /**
     * Make predictions on multiple k-line windows
     * @param {Array} klinesArray - Array of k-line windows
     * @returns {Promise<Array>} Array of prediction results
     */
    async batchPredict(klinesArray) {
        if (!this.predictor) {
            throw new Error('Predictor not initialized. Call initialize() first.');
        }
        return this.predictor.batchPredict(klinesArray);
    }

    /**
     * Calculate per-class metrics
     * @param {Array} predictions - Array of predictions
     * @returns {Object} Per-class metrics
     */
    calculateClassMetrics(predictions) {
        const classes = ['up', 'none', 'down'];
        const metrics = {};
        const confusionMatrix = {
            up: [0, 0, 0],    // [predicted as down, none, up]
            none: [0, 0, 0],
            down: [0, 0, 0]
        };

        // Build confusion matrix
        predictions.forEach(p => {
            const actualIndex = classes.indexOf(p.actual);
            const predictedIndex = classes.indexOf(p.predicted);
            confusionMatrix[p.actual][predictedIndex]++;
        });

        // Calculate metrics for each class
        classes.forEach(className => {
            const truePositives = confusionMatrix[className][classes.indexOf(className)];
            const falsePositives = classes.reduce((sum, c) => 
                sum + (c !== className ? confusionMatrix[c][classes.indexOf(className)] : 0), 0);
            const falseNegatives = classes.reduce((sum, c, i) => 
                sum + (c === className ? confusionMatrix[className].reduce((s, v, j) => s + (j !== i ? v : 0), 0) : 0), 0);

            const precision = truePositives / (truePositives + falsePositives) || 0;
            const recall = truePositives / (truePositives + falseNegatives) || 0;
            const f1 = 2 * (precision * recall) / (precision + recall) || 0;

            metrics[className] = { precision, recall, f1 };
        });

        return { classMetrics: metrics, confusionMatrix };
    }

    /**
     * Evaluate model performance on test data
     * @param {string} testDataPath - Path to test data
     * @returns {Promise<Object>} Evaluation metrics
     */
    async evaluate(testDataPath) {
        if (!this.predictor) {
            throw new Error('Predictor not initialized. Call initialize() first.');
        }

        console.log('Loading test data...');
        const testData = await this.dataProcessor.loadData(testDataPath);
        
        const predictions = [];
        let correct = 0;
        let total = 0;

        // Make predictions on test data
        console.log('Making predictions on test data...');
        for (let i = this.config.lookbackPeriod; i < testData.length; i++) {
            const window = testData.slice(i - this.config.lookbackPeriod, i);
            const prediction = await this.predictor.predict(window);
            const actual = testData[i].reversal;
            
            predictions.push({
                predicted: prediction.label,
                actual: actual,
                probabilities: prediction.probabilities,
                confidence: prediction.confidence,
                metrics: prediction.metrics
            });

            if (prediction.label === actual) {
                correct++;
            }
            total++;

            // Log progress
            if (total % 100 === 0) {
                console.log(`Processed ${total} samples...`);
            }
        }

        const accuracy = correct / total;
        
        // Calculate per-class metrics and confusion matrix
        const { classMetrics, confusionMatrix } = this.calculateClassMetrics(predictions);
        
        // Calculate high confidence metrics
        const confidentPredictions = predictions.filter(p => p.confidence > 0.8);
        const confidentAccuracy = confidentPredictions.length > 0 
            ? confidentPredictions.filter(p => p.predicted === p.actual).length / confidentPredictions.length
            : 0;

        return {
            accuracy,
            totalPredictions: total,
            correctPredictions: correct,
            confidentPredictions: confidentPredictions.length,
            confidentAccuracy,
            classMetrics,
            confusionMatrix,
            predictions
        };
    }
}

module.exports = ReversalPredictor;
