import { Table, formatters } from './table.js'
import { makeOption, compareOptionsFn } from './options.js'

google.charts.load('current', { 'packages': ['table'] });
google.charts.setOnLoadCallback(() => loadOptions("BTC"));

function loadOptions(symbol) {
  fetchByBitOptions(symbol).then(
    ({ puts, calls }) => {
      drawPutsTable(symbol, puts, "puts_table");
      drawCallsTable(symbol, calls, "calls_table");
    },
    error => {
      console.error(error.stack);
      alert(`Error: ${error}`);
    }
  );
}


function drawPutsTable(symbol, puts, table_id) {
  const putsTable = new Table({
    frozenColumns: 4
  })
    .defineColumn("SYMBOL", () => symbol, "string")
    .defineColumn("EXPIRATION DATE", put => put.expirationDate, "date")
    .defineColumn("DAYS TILL EXPIRATION", put => put.DTE, "number")
    .defineColumn("STRIKE", put => put.strike, "number", formatters.dollars())
    .defineColumn("PREMIUM (=MAX GAIN) ($)", put => put.markPrice, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (=MAX LOSS) ($)", put => put.breakEven, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (%)", put => put.breakEvenAsChange, "number", formatters.percent())
    .defineColumn("MAX GAIN (%)", put => put.maxGainRatio, "number", formatters.percent())
    .defineColumn("MAX GAIN WHEN " + symbol + " PERFORMS BETTER THAN (%)",
      put => put.maxGainAsChange, "number", formatters.percent())
    .defineColumn("BREAKEVEN VS HODLER", put => put.breakEvenVsHodler, "number", formatters.dollars())
    .defineColumn("APR (%)", put => put.annualizedMaxGainRatio, "number", formatters.percent())
    ;
  putsTable.format(puts, table_id);
}

function drawCallsTable(symbol, calls, table_id) {
  const callsTable = new Table({
    frozenColumns: 4
  })
    .defineColumn("SYMBOL", () => symbol, "string")
    .defineColumn("EXPIRATION DATE", call => call.expirationDate, "date")
    .defineColumn("DAYS TILL EXPIRATION", call => call.DTE, "number")
    .defineColumn("STRIKE", call => call.strike, "number", formatters.dollars())
    .defineColumn("PREMIUM (=MAX GAIN) ($)", call => call.markPrice, "number", formatters.dollars())
    .defineColumn("PREMIUM (%)", call => call.premiumAsPercent, "number", formatters.percent())
    .defineColumn("BREAKEVEN ($)", call => call.breakEven, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (%)", call => call.breakEvenAsChange, "number", formatters.percent())
    // ["MAX GAIN WHEN " + call.option.symbol + " PERFORMS WORSE THAN (%)"]: call.decorations.maxGainAsChange,
    // "BREAKEVEN VS SPOT SHORT": call.decorations.breakEvenVsShorter,
    ;
  callsTable.format(calls, table_id);
}

function cacheKey(ticker) {
  return ticker;
}

async function getByBitDataFromCacheOrService(ticker) {
  const cachedData = JSON.parse(localStorage.getItem(cacheKey(ticker)));
  if (cachedData && Date.now() < cachedData.expirationTimestamp) {
    console.log("Using cache");
    console.log(cachedData.response);
    return cachedData.response;
  }
  const rawResponse = await fetch('https://api.bybit.com/v5/market/tickers?category=option&baseCoin=' + ticker);
  const response = JSON.parse(await rawResponse.text());
  if (response.retCode !== 0) {
    throw new Error("ByBit returned error: " + response.retMsg);
  }
  localStorage.setItem(cacheKey(ticker), JSON.stringify({
    response,
    expirationTimestamp: Date.now() + 10 * 60 * 1000,
  }));
  console.log("Using API; populating cache");
  console.log(response);
  return response;
}

async function fetchByBitOptions(ticker = 'BTC') {
  try {
    const response = await getByBitDataFromCacheOrService(ticker);
    if (response.retCode !== 0) {
      throw new Error("ByBit returned error: " + response.retMsg);
    }
    const options = response.result.list.map(struct => makeOption(struct));
    if (!options.length) {
      alert(`No option fetched from ByBit (you probably got rate limited...try again later)`);
    }
    const puts = options.filter(option => option.isPut);
    const calls = options.filter(option => option.isCall);

    puts.sort(compareOptionsFn);
    calls.sort(compareOptionsFn);
    const result = {
      puts,
      calls
    };
    return result;
  } catch (error) {
    alert(`Error fetching Bybit data: ${error}`);
    return [error];
  }
}
