const moment = require('moment');
const { CacheStorage } = require('./storage.js');
const { KlineFetcher } = require('./fetcher.js');

class KlineCache {
    constructor() {
        this.storage = new CacheStorage();
        this.fetcher = new KlineFetcher();
    }

    async fetchWithCache(symbol, startTime, endTime, interval = CACHE_CONFIG.INTERVAL) {
        const cachedKlines = this.storage.getKlines(symbol, interval);

        // Convert times to timestamps
        const startTimestamp = moment(startTime).valueOf();
        const endTimestamp = moment(endTime).valueOf();

        // Check if we need to fetch more data
        let needsFetch = true;
        let resultKlines = [];

        if (cachedKlines.length > 0) {
            const cachedStart = cachedKlines[0].openTime;
            const cachedEnd = cachedKlines[cachedKlines.length - 1].openTime;

            if (startTimestamp >= cachedStart && endTimestamp <= cachedEnd) {
                needsFetch = false;
                // Filter cached data for requested time range
                resultKlines = cachedKlines.filter(k =>
                    k.openTime >= startTimestamp && k.openTime <= endTimestamp
                );
            }
        }

        if (needsFetch) {
            resultKlines = await this.fetcher.fetchKlinesInChunks(
                symbol,
                startTimestamp,
                endTimestamp,
                interval
            );
            this.storage.saveKlines(symbol, resultKlines, interval);
        }

        return resultKlines;
    }

    async update(symbol, interval = CACHE_CONFIG.INTERVAL) {
        const cachedKlines = this.storage.getKlines(symbol, interval);

        // If we have cached data, update from the last entry
        // Otherwise, fetch last year's data
        const startTime = cachedKlines.length > 0
            ? cachedKlines[cachedKlines.length - 1].openTime
            : moment().subtract(9, 'year').valueOf();

        const endTime = moment().valueOf();

        const newKlines = await this.fetcher.fetchKlinesInChunks(
            symbol,
            startTime,
            endTime,
            interval
        );

        const mergedKlines = this.fetcher.mergeKlines(cachedKlines, newKlines);
        this.storage.saveKlines(symbol, mergedKlines, interval);

        return mergedKlines;
    }
}

// Export singleton instance
const klineCache = new KlineCache();

module.exports = {
    KlineCache,
    klineCache
};
