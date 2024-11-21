const moment = require('moment');
const { klineCache } = require('./cache.js');
const { CACHE_CONFIG } = require('./config.js');

const symbol = 'SOLUSDT';

console.log('Updating klines cache...');

if (process.argv[1].endsWith('updateCache.js')) {
    const l3 = process.argv.length >= 3;
    const l4 = process.argv.length >= 4;
    let interval = l4 ? process.argv[3] : CACHE_CONFIG.INTERVAL;
    const str = l3 ? `${process.argv[2]}USDT` : symbol;
    
    console.log(`Fetching data for ${str} with interval ${interval}`);
    klineCache.update(str, interval)
    .then(klines => {
        console.log(`Successfully updated cache with ${klines.length} klines`);
        if (klines.length > 0) {
            console.log('First kline:', moment(klines[0].openTime).format());
            console.log('Last kline:', moment(klines[klines.length - 1].openTime).format());
        }
        console.log('Cache update complete');
    })
    .catch(error => {
        console.error('Error updating cache:', error);
        process.exit(1);
    });
}
