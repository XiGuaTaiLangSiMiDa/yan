const tf = require('@tensorflow/tfjs-node');

class ReversalModel {
    constructor(config = {}) {
        this.config = {
            learningRate: config.learningRate || 0.001,
            epochs: config.epochs || 100,
            batchSize: config.batchSize || 32,
            layers: config.layers || [
                { type: 'dense', units: 32, activation: 'relu' },
                { type: 'batchNormalization' },
                { type: 'dropout', rate: 0.2 },
                { type: 'dense', units: 16, activation: 'relu' },
                { type: 'batchNormalization' },
                { type: 'dense', units: 3, activation: 'softmax' }  // Changed to 3 units with softmax
            ]
        };
        
        this.model = null;
        this.bestWeights = null;
        this.bestValLoss = Infinity;
        this.patience = 10;
        this.minDelta = 1e-4;
        this.waitCount = 0;
    }

    /**
     * Calculate class weights based on label distribution
     * @param {tf.Tensor} labels - Label tensor
     * @returns {Object} Class weights
     */
    calculateClassWeights(labels) {
        const labelCounts = {0: 0, 1: 0, 2: 0};
        const labelValues = labels.arraySync();
        labelValues.forEach(label => {
            labelCounts[label] = (labelCounts[label] || 0) + 1;
        });

        const totalSamples = labelValues.length;
        const numClasses = 3;
        const weights = {};

        // Calculate balanced weights
        for (let i = 0; i < numClasses; i++) {
            weights[i] = (totalSamples / (numClasses * labelCounts[i]));
        }

        console.log('Class weights:', weights);
        return weights;
    }

    /**
     * Build and compile the model
     * @param {number} inputShape - Number of input features
     */
    buildModel(inputShape) {
        const model = tf.sequential();

        // Add layers based on config
        this.config.layers.forEach((layer, index) => {
            if (index === 0) {
                // First layer needs input shape
                if (layer.type === 'dense') {
                    model.add(tf.layers.dense({
                        units: layer.units,
                        activation: layer.activation,
                        inputShape: [inputShape],
                        kernelInitializer: 'glorotNormal',
                        biasInitializer: 'zeros'
                    }));
                }
            } else {
                // Add subsequent layers
                switch (layer.type) {
                    case 'dense':
                        model.add(tf.layers.dense({
                            units: layer.units,
                            activation: layer.activation,
                            kernelInitializer: 'glorotNormal',
                            biasInitializer: 'zeros'
                        }));
                        break;
                    case 'dropout':
                        model.add(tf.layers.dropout({ rate: layer.rate }));
                        break;
                    case 'batchNormalization':
                        model.add(tf.layers.batchNormalization());
                        break;
                }
            }
        });

        const optimizer = tf.train.adam(this.config.learningRate, 0.9, 0.999, 1e-07);
        
        // Use sparse categorical crossentropy for numeric labels
        model.compile({
            optimizer: optimizer,
            loss: 'sparseCategoricalCrossentropy',
            metrics: ['accuracy']
        });

        this.model = model;
        return model;
    }

    /**
     * Custom early stopping check
     * @param {number} valLoss - Current validation loss
     * @returns {boolean} Whether to stop training
     */
    checkEarlyStopping(valLoss) {
        if (valLoss < this.bestValLoss - this.minDelta) {
            this.bestValLoss = valLoss;
            this.waitCount = 0;
            // Save best weights
            this.bestWeights = this.model.getWeights().map(w => w.clone());
            return false;
        }
        
        this.waitCount++;
        return this.waitCount >= this.patience;
    }

    /**
     * Train the model
     * @param {Object} trainData - Training data with features and labels
     * @param {Object} valData - Validation data with features and labels
     * @returns {Promise} Training history
     */
    async train(trainData, valData) {
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }

        // Calculate class weights to handle imbalanced data
        const classWeights = this.calculateClassWeights(trainData.labels);

        const history = {
            history: {
                loss: [],
                acc: [],
                val_loss: [],
                val_acc: []
            }
        };

        for (let epoch = 0; epoch < this.config.epochs; epoch++) {
            const result = await this.model.fit(
                trainData.features,
                trainData.labels,
                {
                    epochs: 1,
                    batchSize: this.config.batchSize,
                    validationData: [valData.features, valData.labels],
                    shuffle: true,
                    classWeight: classWeights
                }
            );

            const logs = result.history;
            history.history.loss.push(logs.loss[0]);
            history.history.acc.push(logs.acc[0]);
            history.history.val_loss.push(logs.val_loss[0]);
            history.history.val_acc.push(logs.val_acc[0]);

            console.log(
                `Epoch ${epoch + 1}: loss = ${logs.loss[0].toFixed(4)}, ` +
                `accuracy = ${logs.acc[0].toFixed(4)}, ` +
                `val_loss = ${logs.val_loss[0].toFixed(4)}, ` +
                `val_accuracy = ${logs.val_acc[0].toFixed(4)}`
            );

            // Check early stopping
            if (this.checkEarlyStopping(logs.val_loss[0])) {
                console.log(`Early stopping triggered at epoch ${epoch + 1}`);
                // Restore best weights if available
                if (this.bestWeights) {
                    this.model.setWeights(this.bestWeights);
                }
                break;
            }
        }

        return history;
    }

    /**
     * Make predictions
     * @param {tf.Tensor} features - Input features
     * @returns {tf.Tensor} Predicted class probabilities
     */
    predict(features) {
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }
        return this.model.predict(features);
    }

    /**
     * Get predicted class (0, 1, or 2)
     * @param {tf.Tensor} features - Input features
     * @returns {tf.Tensor} Predicted classes
     */
    predictClass(features) {
        return tf.tidy(() => {
            const predictions = this.predict(features);
            return predictions.argMax(1);
        });
    }

    /**
     * Save model to file
     * @param {string} path - Path to save model
     */
    async saveModel(path) {
        if (!this.model) {
            throw new Error('No model to save');
        }
        // Ensure path ends with model.json
        const modelPath = path.endsWith('model.json') ? path : `${path}/model.json`;
        await this.model.save(`file://${modelPath}`);
    }

    /**
     * Load model from file
     * @param {string} path - Path to load model from
     */
    async loadModel(path) {
        // Ensure path ends with model.json
        const modelPath = path.endsWith('model.json') ? path : `${path}/model.json`;
        this.model = await tf.loadLayersModel(`file://${modelPath}`);
        
        // Recompile the model
        const optimizer = tf.train.adam(this.config.learningRate, 0.9, 0.999, 1e-07);
        this.model.compile({
            optimizer: optimizer,
            loss: 'sparseCategoricalCrossentropy',
            metrics: ['accuracy']
        });
    }

    /**
     * Evaluate model performance
     * @param {Object} testData - Test data with features and labels
     * @returns {Array} Loss and accuracy values
     */
    async evaluate(testData) {
        if (!this.model) {
            throw new Error('Model not built. Call buildModel first.');
        }
        const result = await this.model.evaluate(testData.features, testData.labels);
        return {
            loss: result[0].dataSync()[0],
            accuracy: result[1].dataSync()[0]
        };
    }
}

module.exports = ReversalModel;
