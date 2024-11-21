const fs = require('fs');
const path = require('path');
const { CACHE_CONFIG } = require('./config.js');

class CacheStorage {
    constructor() {
        if (!fs.existsSync(CACHE_CONFIG.CACHE_DIR)) {
            fs.mkdirSync(CACHE_CONFIG.CACHE_DIR, { recursive: true });
        }
    }

    read(symbol = CACHE_CONFIG.DEFAULT_SYMBAL, interval = CACHE_CONFIG.INTERVAL) {
        const cachePath = path.join(CACHE_CONFIG.CACHE_DIR, `${this.getCacheKey(symbol, interval)}${CACHE_CONFIG.CACHE_FILE}`);
        if (fs.existsSync(cachePath)) {
            return JSON.parse(fs.readFileSync(cachePath, 'utf8'));
        }
        return [];
    }

    write(data, symbol = CACHE_CONFIG.DEFAULT_SYMBAL, interval = CACHE_CONFIG.INTERVAL) {
        const cachePath = path.join(CACHE_CONFIG.CACHE_DIR, `${this.getCacheKey(symbol, interval)}${CACHE_CONFIG.CACHE_FILE}`);
        fs.writeFileSync(cachePath, JSON.stringify(data, null, 2));
    }

    getCacheKey(symbol, interval = CACHE_CONFIG.INTERVAL) {
        return `${symbol}_${interval}_`;
    }

    getKlines(symbol, interval = CACHE_CONFIG.INTERVAL) {
        const cache = this.read(symbol, interval);
        // const cacheKey = this.getCacheKey(symbol, interval);
        // return cache[cacheKey] || [];
        return cache || [];
    }

    saveKlines(symbol, klines, interval = CACHE_CONFIG.INTERVAL) {
        // const cache = this.read(symbol, interval);
        // const cacheKey = this.getCacheKey(symbol, interval);
        // cache[cacheKey] = klines;
        this.write(klines, symbol, interval);
    }
}

module.exports = {
    CacheStorage
};
