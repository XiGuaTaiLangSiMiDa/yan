const { CacheStorage } = require("./cache/storage");
const binanceService = require("./services/binanceService");
const periodPatternService = require("./services/periodPatternService");
const timePatternService = require("./services/timePatternService");

async function main() {
    const symbol = "DOGEUSDT";
    const patterns = await timePatternService.getTimePatternAnalysis(symbol);
    console.log(patterns);
    
    const periodpatterns = await periodPatternService.getPeriodPatternAnalysis(symbol);
    console.log(periodpatterns);

    const analysis = await binanceService.getMarketAnalysis(symbol);
    console.log(analysis);
}

main();