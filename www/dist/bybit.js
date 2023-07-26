/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./src/table.js
// const dateFormatter = new google.visualization.DateFormat(
//   { pattern: "dd MMM yyyy" });
// dateFormatter.format(data, 1);

// const formatter = new google.visualization.ColorFormat();
// formatter.addRange(null, 0, 'red', 'white');
// formatter.addRange(0, null, 'green', 'white');
// [1, 2, 3].forEach(col => formatter.format(data, col));

class Table {
  constructor(options) {
    this._columns = [];
    this._options = {
      frozenRows: 1,
      frozenColumns: 0,
      showRowNumber: false,
      columnWidth: 200,
      allowHtml: true,
      ...options
    };
  }

  /*
  type - A string with the data type of the values of the column. The type can
         be one of the following:
         'string', 'number', 'boolean', 'date', 'datetime', and 'timeofday'.
  */
  defineColumn(header, valueFn, type, formatter) {
    this._columns.push({
      header,
      valueFn,
      type,
      formatter
    });
    return this;
  }

  format(rows, table_id) {
    const data = new google.visualization.DataTable();
    this._columns.forEach(
      column => data.addColumn(column.type, column.header));

    data.addRows(rows.map(row => this._columns.map(col => col.valueFn(row))));

    const table = new google.visualization.Table(
      document.getElementById(table_id));

    // const formatter = new google.visualization.ColorFormat();
    // formatter.addRange(null, 0, 'red', 'white');
    // formatter.addRange(0, null, 'green', 'white');
    // [1, 2, 3].forEach(col => formatter.format(data, col));
    // data.setProperty(0, 0, 'style', 'width:150px');
    this._columns.forEach((column, index) => {
      column?.formatter?.format(data, index);
    });
    data.setProperty(0, 0, 'style', 'width:100px');
    table.draw(data, this._options);
  }
  // --> something that takes a list of (puts or calls)
  //     and turns it into a Google Chart Table ready to use.
}

google.charts.load('current', { 'packages': ['table'] });

const formatters = {
  dollars: function () {
    return new google.visualization.NumberFormat({
      pattern: '$#,###'
    });
  },
  percent: function () {
    return new google.visualization.NumberFormat({
      pattern: '#,###%'
    });
  },
  // money: new google.visualization.NumberFormat({
  // return new google.visualization.ColorFormat()
  //   fractionDigits: 0
  // }),
};

;// CONCATENATED MODULE: ./src/options.js
function makeOption(struct) {
  const [, , , type] = struct.symbol.split("-");
  if (type === 'P') {
    return new PutOption(struct);
  } else if (type === 'C') {
    return new CallOption(struct);
  }
  throw new Error(`Unexpected option type ${type}, from struct: ${struct.symbol}`);
}

class Option {
  // Struct:
  // ask1Iv: "0",
  // ask1Price: "0"
  // ask1Size: "0"
  // bid1Iv: "0"
  // bid1Price: "5"
  // bid1Size: "0.01"
  // change24h: "0"
  // delta: "0.99238854"
  // gamma: "0.00000499"
  // highPrice24h: "0"
  // indexPrice: "30356.72"
  // lastPrice: "0"
  // lowPrice24h: "0"
  // markIv: "0.6093"
  // markPrice: "8486.42120764"
  // openInterest: "0"
  // predictedDeliveryPrice: "0"
  // symbol: "BTC-28JUL23-22000-C"
  // theta: "-2.35199556"
  // totalTurnover: "0"
  // totalVolume: "0"
  // turnover24h: "0"
  // underlyingPrice: "30475.4"
  // vega: "1.45050054"
  // volume24h: "0"
  constructor(struct) {
    const [symbol, rawDate, rawStrike, type] = struct.symbol.split("-");
    this._symbol = symbol;
    this._expirationDate = parseDate(rawDate);
    this._DTE = Math.ceil((this._expirationDate - new Date()) / (1000 * 60 * 60 * 24));
    this._strike = parseFloat(rawStrike);
    this._type = type;
    this._bidPrice = parseFloat(struct.bid1Price);
    this._bidSize = parseFloat(struct.bid1Size);
    this._markPrice = parseFloat(struct.markPrice);
    this._askPrice = parseFloat(struct.ask1Price);
    this._askSize = parseFloat(struct.ask1Size);
    this._underlyingPrice = parseFloat(struct.indexPrice);
    this._annualizedMaxGain = this._markPrice * 365 / this._DTE;
    this._maxGainAsChange = this._strike / this._underlyingPrice - 1;
    this._premiumAsPercent = this._markPrice / this._underlyingPrice;
  }

  get symbol() { return this._symbol; }
  get expirationDate() { return this._expirationDate; }
  get DTE() { return this._DTE; }
  get strike() { return this._strike; }
  get isPut() { return this._type === 'P'; }
  get isCall() { return this._type === 'C'; }

  get bidPrice() { return this._bidPrice; }
  get bidSize() { return this._bidSize; }
  get markPrice() { return this._markPrice; }
  get askPrice() { return this._askPrice; }
  get askSize() { return this._askPrice; }

  get maxGain() { return this._markPrice; }
  get premium() { return this._markPrice; }
  get premiumAsPercent() { return this._premiumAsPercent; }
  get maxGainInKind() { return this.premiumAsPercent; }
  get annualizedMaxGain() { return this._annualizedMaxGain; }
  get underlyingPrice() { return this._underlyingPrice; }
  get maxGainAsChange() { return this._maxGainAsChange; }

  // Note that 'breakEven' is defined in subclasses.
  get breakEvenAsChange() { return this.breakEven / this.underlyingPrice - 1.0; }
}

class PutOption extends Option {
  constructor(struct) {
    super(struct);
    this._breakEven = super.strike - super.premium;
    this._maxLoss = this._breakEven;
    this._maxGainRatio = super.maxGain / this._maxLoss;
    this._breakEvenVsHodler = super.underlyingPrice * (1 + this._maxGainRatio);
    this._gainAtCurrentPrice = Math.min(super.underlyingPrice - this._breakEven, this._maxGain);
    this._gainAtCurrentPriceRatio = this._gainAtCurrentPrice / this._maxLoss;
    this._annualizedMaxGainInKind = this._maxGainInKind * 365 / this._DTE;
    this._annualizedMaxGainRatio = this._maxGainRatio * 365 / this._DTE;
  }
  get breakEven() { return this._breakEven; }
  get maxLoss() { return this._maxLoss; }
  get maxGainRatio() { return this._maxGainRatio; }
  get breakEvenVsHodler() { return this._breakEvenVsHodler; }
  get gainAtCurrentPrice() { return this._gainAtCurrentPrice; }
  get gainAtCurrentPriceRatio() { return this._gainAtCurrentPriceRatio; }
  get annualizedMaxGainInKind() { return this._annualizedMaxGainInKind; }
  get annualizedMaxGainRatio() { return this._annualizedMaxGainRatio; }
}

class CallOption extends Option {
  constructor(struct) {
    super(struct);
    this._breakEven = super.strike + super.premium;
    this._gainAtCurrentPrice = Math.min(this._breakEven - super._underlyingPrice, super.maxGain);
    this._breakEvenVsShorter = super.underlyingPrice - super.premium;
  }
  get breakEven() { return this._breakEven; }
  get gainAtCurrentPrice() { return this._gainAtCurrentPrice; }
  get breakEvenVsShorter() { return this._breakEvenVsShorter; }
}

function parseDate(dateStr) {
  const rx = /^(\d+)([A-Z]+)(\d+)$/;
  const [unused, rawDay, rawMonth, rawYear] = dateStr.match(rx);
  return new Date(parseInt("20" + rawYear), parseMonth(rawMonth), parseInt(rawDay));
}

function parseMonth(monthStr) {
  switch (monthStr) {
    case 'JAN': return 0;
    case 'FEB': return 1;
    case 'MAR': return 2;
    case 'APR': return 3;
    case 'MAY': return 4;
    case 'JUN': return 5;
    case 'JUL': return 6;
    case 'AUG': return 7;
    case 'SEP': return 8;
    case 'OCT': return 9;
    case 'NOV': return 10;
    case 'DEC': return 11;
  }
  throw new Error("Unexpected month: [" + monthStr + "]");
}

function compareOptionsFn(a, b) {
  if (a.DTE !== b.DTE) {
    return b.DTE - a.DTE;
  }
  if (a.strike !== b.strike) {
    if (a.isPut) {
      return a.strike - b.strike;
    } else {
      return b.strike - a.strike;
    }
  }
  return -1;
}

;// CONCATENATED MODULE: ./src/bybit.js



google.charts.load('current', { 'packages': ['corechart', 'table'] });
google.charts.setOnLoadCallback(() => {
  loadOptions("BTC");
  loadOptions("ETH");
});

function loadOptions(symbol) {
  fetchByBitOptions(symbol).then(
    ({ puts, calls }) => {
      drawPutsTable(symbol, puts, `${symbol}_puts_table`);
      drawCallsTable(symbol, calls, `${symbol}_calls_table`);
      drawPutsChart(symbol, puts, `${symbol}_puts_chart`)
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
    .defineColumn("EXPIRATION<br>DATE", put => put.expirationDate, "date")
    .defineColumn("DTE", put => put.DTE, "number")
    .defineColumn(`${symbol} PUT<br>STRIKE`, put => put.strike, "number", formatters.dollars())
    .defineColumn("PREMIUM ($)<br>(=MAX GAIN)", put => put.markPrice, "number", formatters.dollars())
    .defineColumn("BREAKEVEN ($)<br>(=MAX LOSS)", put => put.breakEven, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (%)", put => put.breakEvenAsChange, "number", formatters.percent())
    .defineColumn("MAX GAIN (%)", put => put.maxGainRatio, "number", formatters.percent())
    .defineColumn("MAX GAIN<br>WHEN " + symbol + "<br>PERFORMS BETTER<br>THAN (%)",
      put => put.maxGainAsChange, "number", formatters.percent())
    .defineColumn("BREAKEVEN<br>VS HODLER", put => put.breakEvenVsHodler, "number", formatters.dollars())
    .defineColumn("APR (%)", put => put.annualizedMaxGainRatio, "number", formatters.percent())
    ;
  putsTable.format(puts, table_id);
}

function drawCallsTable(symbol, calls, table_id) {
  const callsTable = new Table({
    frozenColumns: 4
  })
    .defineColumn("SYMBOL", () => symbol + " CALLS", "string")
    .defineColumn("EXPIRATION DATE", call => call.expirationDate, "date")
    .defineColumn("DAYS TILL EXPIRATION", call => call.DTE, "number")
    .defineColumn(`${symbol} CALL<br>STRIKE`, call => call.strike, "number", formatters.dollars())
    .defineColumn("PREMIUM (=MAX GAIN) ($)", call => call.markPrice, "number", formatters.dollars())
    .defineColumn("PREMIUM (%)", call => call.premiumAsPercent, "number", formatters.percent())
    .defineColumn("BREAKEVEN ($)", call => call.breakEven, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (%)", call => call.breakEvenAsChange, "number", formatters.percent())
    // ["MAX GAIN WHEN " + call.option.symbol + " PERFORMS WORSE THAN (%)"]: call.decorations.maxGainAsChange,
    // "BREAKEVEN VS SPOT SHORT": call.decorations.breakEvenVsShorter,
    ;
  callsTable.format(calls, table_id);
}

function drawPutsChart(symbol, puts, chart_id) {
  const options = {
    title: `All ${symbol} Puts (Each line is an expiration date, N days from today)`,
    hAxis: { title: `$ Strike (the price you promise to buy ${symbol} at)`, format: '$#,###', direction: -1 },
    vAxis: { title: 'Max Gain %', format: '#,###%' },
    legend: { position: 'top' },
    curveType: 'function',
    pointSize: 5,
  };

  const data = new google.visualization.DataTable();
  data.addColumn({ type: 'number', pattern: '$#,###' });

  const dteToSeries = new Map();
  puts.forEach(put => {
    if (!dteToSeries.has(put.DTE)) {
      dteToSeries.set(put.DTE, dteToSeries.size);
      data.addColumn({ type: 'number', label: `${put.DTE}`, pattern: '$#,###' });
      data.addColumn({ role: 'tooltip' });
    }
  });
  puts
    .filter(put => put.strike <= put.underlyingPrice)
    .forEach(put => {
      const row = Array(1 + dteToSeries.size * 2);
      row[0] = put.strike;

      const series = dteToSeries.get(put.DTE);
      row[1 + series * 2 + 0] = put.maxGainRatio;
      // TODO: format dates, numbers
      row[1 + series * 2 + 1] =
        `Strike: $${put.strike}\nExpiration: ${put.expirationDate}\n` +
        `BreakEven: $${put.breakEven}\nMax gain: ${put.maxGainRatio * 100}%`;
      data.addRows([row]);
    });

  const chart = new google.visualization.LineChart(document.getElementById(chart_id));
  chart.draw(data, options);
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

/******/ })()
;