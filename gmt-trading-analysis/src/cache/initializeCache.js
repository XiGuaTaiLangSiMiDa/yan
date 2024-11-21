const moment = require('moment');
const { klineCache } = require('./cache.js');
const { CACHE_CONFIG } = require('./config.js');

const symbol = 'SOLUSDT';
const startTime = moment().subtract(9, 'year').valueOf();
const endTime = moment().valueOf();

console.log('Initializing klines cache...');

if (process.argv[1].endsWith('initializeCache.js')) {
    const l3 = process.argv.length >= 3;
    const l4 = process.argv.length >= 4;
    const str = l3 ? `${process.argv[2]}USDT` : symbol;
    let interval = l4 ? process.argv[3] : CACHE_CONFIG.INTERVAL;
    console.log(`Fetching data for ${str} from ${moment(startTime).format()} to ${moment(endTime).format()} of -${interval}-`);
    klineCache.fetchWithCache(str, startTime, endTime, interval)
        .then(klines => {
            console.log(`Successfully cached ${klines.length} klines`);
            if (klines.length) {
                console.log('First kline:', moment(klines[0].openTime).format());
                console.log('Last kline:', moment(klines[klines.length - 1].openTime).format());
            }
            console.log('Cache initialization complete');
        })
        .catch(error => {
            console.error('Error initializing cache:', error);
            process.exit(1);
        });
}
