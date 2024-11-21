const CACHE_CONFIG = {
    CACHE_DIR: './cache',
    CACHE_FILE: 'klines_cache.json',
    CHUNK_SIZE: 1000, // Binance's actual limit
    INTERVAL: '15m',
    RETRY_DELAY: 1000,
    RATE_LIMIT_DELAY: 100,
    DEFAULT_SYMBAL: "SOLUSDT"
};

module.exports = {
    CACHE_CONFIG
};
