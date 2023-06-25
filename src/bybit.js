google.charts.load('current', { 'packages': ['table'] });

fetchByBitOptions("BTC", "PUTS").then(
  results => drawTable(results, "table_div"),
  error => console.log(error));

function drawTable(results, table_id) {
  const data = new google.visualization.DataTable();
  results[0].forEach(header => {
    console.log(`Adding column: ${header}`);
    data.addColumn('string', header);  // number, boolean
  });
  data.addRows(results.slice(1).map(row => {
    console.log(`Is array? ${Array.isArray(row)}`);
    console.table(row);
    return row.map(cell => String(cell));
  }));
  // data.addRows([
  //   ['Mike', { v: 10000, f: '$10,000' }, true, "abc", "abc", "abc"],
  //   ['Jim', { v: 8000, f: '$8,000' }, false, "abc", "abc", "abc"],
  //   ['Alice', { v: 12500, f: '$12,500' }, true, "abc", "abc", "abc"],
  //   ['Bob', { v: 7000, f: '$7,000' }, true, "abc", "abc", "abc"]
  // ]);

  const table = new google.visualization.Table(document.getElementById(table_id));

  const options = {
    frozenColumns: 2,
    showRowNumber: false,
    width: 'auto',
    height: 'auto'
  };
  table.draw(data, options);
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

function parseDate(dateStr) {
  const rx = /^(\d+)([A-Z]+)(\d+)$/;
  const [unused, rawDay, rawMonth, rawYear] = dateStr.match(rx);
  return new Date(parseInt("20" + rawYear), parseMonth(rawMonth), parseInt(rawDay));
}

function parseOption(struct) {
  const [symbol, rawDate, rawStrike, type] = struct.symbol.split("-");
  return new Option(
    symbol,
    parseDate(rawDate),
    parseFloat(rawStrike),
    type === 'P',
    parseFloat(struct.markPrice),
    parseFloat(struct.indexPrice));
}

class Option {
  constructor(symbol, expirationDate, strike, isPut, markPrice, underlyingPrice) {
    this.symbol = symbol;
    this.expirationDate = expirationDate;
    this.strike = strike;
    this.isPut = isPut;
    this.isCall = !isPut;
    this.markPrice = markPrice;
    this.underlyingPrice = underlyingPrice;
  }
}

function putDecorations(o) {
  const premium = o.markPrice;
  const DTE = Math.ceil((o.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  const breakEven = o.strike - premium;
  const maxGain = premium;
  const maxLoss = breakEven;
  const maxGainRatio = maxGain / maxLoss;
  const maxGainInKind = maxGain / o.underlyingPrice;
  const gainAtCurrentPrice = Math.min(o.underlyingPrice - breakEven, maxGain);
  const gainAtCurrentPriceRatio = gainAtCurrentPrice / maxLoss;
  const result = {
    DTE: DTE,
    breakEven,
    breakEvenAsChange: breakEven / o.underlyingPrice - 1,

    maxGain,
    maxLoss,

    maxGainRatio,
    maxGainAsChange: o.strike / o.underlyingPrice - 1,

    breakEvenVsHodler: o.underlyingPrice * (1 + maxGainRatio),

    annualizedMaxGain: maxGain * 365 / DTE,
    annualizedMaxGainInKind: maxGainInKind * 365 / DTE,
    annualizedMaxGainRatio: maxGainRatio * 365 / DTE,

    gainAtCurrentPrice,
    gainAtCurrentPriceRatio,
  };

  return result;
}

function renderDecoratedPut(put) {
  return {
    "SYMBOL": put.option.symbol,
    "EXPIRATION DATE": put.option.expirationDate,
    "DAYS TILL EXPIRATION": put.decorations.DTE,
    ["STRIKE ($" + put.option.underlyingPrice + ")"]: put.option.strike,
    "PREMIUM (=MAX GAIN) ($)": put.option.markPrice,
    "BREAKEVEN (=MAX LOSS) ($)": put.decorations.breakEven,
    "BREAKEVEN (%)": put.decorations.breakEvenAsChange,
    "MAX GAIN (%)": put.decorations.maxGainRatio,
    // "GAIN AT CURRENT PRICE (%)": put.decorations.gainAtCurrentPriceRatio,
    ["MAX GAIN WHEN " + put.option.symbol + " PERFORMS BETTER THAN (%)"]: put.decorations.maxGainAsChange,
    "BREAKEVEN VS HODLER": put.decorations.breakEvenVsHodler,
    "APR (%)": put.decorations.annualizedMaxGainRatio,
  };
}

function extractPuts(options) {
  const decoratedPuts = options
    .filter(option => option.isPut)
    .map(option => {
      return {
        option: option,
        decorations: putDecorations(option)
      };
    });

  decoratedPuts.sort(compareOptionsFn);
  return decoratedPuts.map(put => renderDecoratedPut(put));
}

function callDecorations(o) {
  const premium = o.markPrice;
  const DTE = Math.ceil((o.expirationDate - new Date()) / (1000 * 60 * 60 * 24));
  const breakEven = o.strike + premium;
  const maxGain = premium;
  const maxGainInKind = maxGain / o.underlyingPrice;
  const gainAtCurrentPrice = Math.min(breakEven - o.underlyingPrice, maxGain);
  const result = {
    DTE,
    strikeAsChange: (o.strike / o.underlyingPrice) - 1,
    premiumAsPercent: premium / o.underlyingPrice,

    breakEven,
    breakEvenAsChange: breakEven / o.underlyingPrice - 1,

    maxGain,
    maxGainAsChange: o.strike / o.underlyingPrice - 1,

    maxGainInKind,

    breakEvenVsShorter: o.underlyingPrice - premium,

    annualizedMaxGain: maxGain * 365 / DTE,
    annualizedMaxGainInKind: maxGainInKind * 365 / DTE,

    gainAtCurrentPrice,
  };

  return result;
}

function renderDecoratedCall(call) {
  return {
    "SYMBOL": call.option.symbol,
    "EXPIRATION DATE": call.option.expirationDate,
    "DAYS TILL EXPIRATION": call.decorations.DTE,
    ["STRIKE ($" + call.option.underlyingPrice + ")"]: call.option.strike,
    "PREMIUM (=MAX GAIN) ($)": call.option.markPrice,
    "PREMIUM (%)": call.decorations.premiumAsPercent,
    "STRIKE (%)": call.decorations.strikeAsChange,
    "BREAKEVEN ($)": call.decorations.breakEven,
    "BREAKEVEN (%)": call.decorations.breakEvenAsChange,
    ["MAX GAIN WHEN " + call.option.symbol + " PERFORMS WORSE THAN (%)"]: call.decorations.maxGainAsChange,
    "BREAKEVEN VS SPOT SHORT": call.decorations.breakEvenVsShorter,
  };
}

function extractCalls(options) {
  const decoratedCalls = options
    .filter(option => option.isCall)
    .map(option => {
      return {
        option: option,
        decorations: callDecorations(option)
      };
    });

  decoratedCalls.sort(compareOptionsFn);
  return decoratedCalls.map(call => renderDecoratedCall(call));
}

function compareOptionsFn(a, b) {
  if (a.decorations.DTE !== b.decorations.DTE) {
    return b.decorations.DTE - a.decorations.DTE;
  }
  if (a.option.strike !== b.option.strike) {
    if (a.option.isPut) {
      return a.option.strike - b.option.strike;
    } else {
      return b.option.strike - a.option.strike;
    }
  }
  return -1;
}

// type: PUTS, CALLS
async function fetchByBitOptions(ticker = 'BTC', type = 'PUTS', argUsedToInvalidateCache = 0.0) {
  try {
    const response = await fetch('https://api.bybit.com/v5/market/tickers?category=option&baseCoin=' + ticker);
    const body = await response.text();
    return processBybitOptions(type, body);
  } catch (error) {
    console.log(error);
    return [error];
  }
}

function processBybitOptions(type, jsonResponse) {
  const response = JSON.parse(jsonResponse);
  if (response.retCode !== 0) {
    throw new Error("ByBit returned error: " + response.retMsg);
  }
  const options = response.result.list.map(struct => parseOption(struct));
  const renderedOptions = (type === 'CALLS') ? extractCalls(options) : extractPuts(options);

  let output = [];
  output.push(Object.keys(renderedOptions[0]));
  renderedOptions.forEach(elem => output.push(Object.values(elem)));
  return output;
}
