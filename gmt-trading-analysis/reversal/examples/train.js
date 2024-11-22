const path = require('path');
const ReversalPredictor = require('../index');

async function main() {
    try {
        // Initialize predictor with configuration
        const predictor = new ReversalPredictor({
            lookbackPeriod: 10,
            modelPath: path.join(__dirname, '../saved_model'),
            validationSplit: 0.2,
            optimizationTrials: 10,
            epochs: 100,
            // Updated hyperparameter space for three-class classification
            hyperparameterSpace: {
                learningRate: [0.0001, 0.001],
                batchSize: [32, 64],
                layers: [
                    [
                        { type: 'dense', units: 32, activation: 'relu' },
                        { type: 'batchNormalization' },
                        { type: 'dropout', rate: 0.2 },
                        { type: 'dense', units: 16, activation: 'relu' },
                        { type: 'batchNormalization' },
                        { type: 'dense', units: 3, activation: 'softmax' }  // Changed to 3 units with softmax
                    ]
                ]
            }
        });

        // Path to training data
        const dataPath = path.join(__dirname, '../../cache/SOLUSDT_1h_klines_cache_V.json');

        console.log('Starting model training...');
        console.log('This may take a while depending on the dataset size and optimization settings.');

        // Train the model
        const results = await predictor.trainModel(dataPath);

        console.log('\nTraining completed!');
        console.log('Best configuration:', JSON.stringify(results.config, null, 2));
        console.log('Best validation accuracy:', results.performance);

        // Initialize the predictor with trained model
        await predictor.initialize();

        // Evaluate model performance
        console.log('\nEvaluating model performance...');
        const evaluation = await predictor.evaluate(dataPath);

        console.log('\nEvaluation Results:');
        console.log(`Total predictions: ${evaluation.totalPredictions}`);
        console.log(`Correct predictions: ${evaluation.correctPredictions}`);
        console.log(`Overall accuracy: ${(evaluation.accuracy * 100).toFixed(2)}%`);
        
        // Display per-class metrics
        console.log('\nPer-class Performance:');
        console.log('Up:');
        console.log(`  Precision: ${(evaluation.classMetrics.up.precision * 100).toFixed(2)}%`);
        console.log(`  Recall: ${(evaluation.classMetrics.up.recall * 100).toFixed(2)}%`);
        console.log(`  F1 Score: ${(evaluation.classMetrics.up.f1 * 100).toFixed(2)}%`);
        
        console.log('\nNone:');
        console.log(`  Precision: ${(evaluation.classMetrics.none.precision * 100).toFixed(2)}%`);
        console.log(`  Recall: ${(evaluation.classMetrics.none.recall * 100).toFixed(2)}%`);
        console.log(`  F1 Score: ${(evaluation.classMetrics.none.f1 * 100).toFixed(2)}%`);
        
        console.log('\nDown:');
        console.log(`  Precision: ${(evaluation.classMetrics.down.precision * 100).toFixed(2)}%`);
        console.log(`  Recall: ${(evaluation.classMetrics.down.recall * 100).toFixed(2)}%`);
        console.log(`  F1 Score: ${(evaluation.classMetrics.down.f1 * 100).toFixed(2)}%`);

        // Display confusion matrix
        console.log('\nConfusion Matrix:');
        console.log('Predicted →  Down    None    Up');
        console.log(`Actual Down:  ${evaluation.confusionMatrix.down.join('      ')}`);
        console.log(`Actual None:  ${evaluation.confusionMatrix.none.join('      ')}`);
        console.log(`Actual Up:    ${evaluation.confusionMatrix.up.join('      ')}`);

    } catch (error) {
        console.error('Error during training:', error);
        process.exit(1);
    }
}

main();
