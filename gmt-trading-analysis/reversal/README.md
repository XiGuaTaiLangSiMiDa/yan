# Reversal Predictor

A machine learning model for predicting price reversals in cryptocurrency markets using TensorFlow.js.

## Project Structure

```
reversal/
├── dataProcessor.js    # Data preprocessing and feature engineering
├── model.js           # Neural network model definition
├── optimizer.js       # Hyperparameter optimization
├── predictor.js       # Making predictions with trained model
├── index.js          # Main entry point
└── examples/         # Usage examples
    ├── train.js      # Training example
    └── predict.js    # Prediction example
```

## Features

- Data preprocessing and feature engineering from k-line data
- Neural network model with configurable architecture
- Hyperparameter optimization using grid search or random search
- Model training with validation
- Real-time predictions with confidence scores
- Continuous monitoring capability

## Setup

The project uses @tensorflow/tfjs-node for machine learning capabilities. Dependencies are managed in the root package.json.

Install dependencies:
```bash
npm install
```

## Usage

### Training a New Model

```javascript
const ReversalPredictor = require('./reversal');

const predictor = new ReversalPredictor({
    lookbackPeriod: 10,
    modelPath: 'path/to/save/model',
    validationSplit: 0.2,
    optimizationTrials: 10,
    epochs: 100
});

// Train model
await predictor.trainModel('path/to/training/data.json');
```

Run the training example:
```bash
npm run reversal:train
```

### Making Predictions

```javascript
const ReversalPredictor = require('./reversal');

const predictor = new ReversalPredictor({
    lookbackPeriod: 10,
    modelPath: 'path/to/saved/model'
});

// Initialize with trained model
await predictor.initialize();

// Make prediction
const prediction = await predictor.predict(klines);
console.log('Prediction:', prediction);
```

Run the prediction example:
```bash
npm run reversal:predict
```

## Data Format

The model expects k-line data in the following format:
```javascript
{
    "openTime": 1597287600000,
    "open": 3.6449,
    "high": 3.8128,
    "low": 3.6228,
    "close": 3.7593,
    "volume": 61837.96,
    "closeTime": 1597291199999,
    "quoteVolume": 230484.101828,
    "trades": 778,
    "takerBuyBaseVolume": 15025.01,
    "takerBuyQuoteVolume": 55862.708769,
    "reversal": "up"  // Label for training data
}
```

## Model Architecture

The default model architecture consists of:
- Dense layers with ReLU activation
- Dropout layers for regularization
- Binary classification output (sigmoid activation)

The architecture can be customized through the model configuration.

## Hyperparameter Optimization

The optimizer supports:
- Learning rate optimization
- Batch size tuning
- Architecture search
- Custom parameter spaces

## Prediction Output

Predictions include:
- Predicted reversal direction (up/down)
- Probability score
- Confidence metric
- Additional market metrics

Example output:
```javascript
{
    label: 'up',
    probability: 0.8532,
    confidence: 0.7064,
    metrics: {
        priceChange: 0.0234,
        volumeChange: 0.1523,
        highLowRange: 0.0456,
        timestamp: 1597287600000
    }
}
