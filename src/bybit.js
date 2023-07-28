import { Table, formatters } from './table.js'
import { makeOption } from './options.js'

google.charts.load('current', { 'packages': ['corechart', 'table'] });
google.charts.setOnLoadCallback(() => {
  loadOptions("BTC");
  loadOptions("ETH");
});

function loadOptions(symbol) {
  fetchByBitOptions(symbol).then(
    ({ puts, calls }) => {
      if (puts) {
        const formattedPrice = formatters.dollars().formatValue(puts[0].underlyingPrice);
        document.getElementById(`${symbol}_price`).textContent = `${formattedPrice}`;
      }
      drawPutsTable(symbol, puts, `${symbol}_puts_table`);
      drawCallsTable(symbol, calls, `${symbol}_calls_table`);
      drawPutsChart(symbol, puts, `${symbol}_puts_chart`);
      drawSpreads(symbol, puts, calls, `${symbol}_spreads_table`);
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

  // DTE to the smallest strike that is above the spot price.
  // I.e. if BTC price is $29700, let's plot the $30000 strike too,
  // instead of going down to $29000 or so.
  const minStrikeAboveSpot = new Map();
  puts
    .filter(put => put.strike > put.underlyingPrice)
    .forEach(put =>
      minStrikeAboveSpot.set(
        put.DTE,
        Math.min(put.strike, minStrikeAboveSpot.get(put.DTE) || put.strike)
      )
    );

  puts
    .filter(put => put.strike <= (minStrikeAboveSpot.get(put.DTE) || 0))
    .forEach(put => {
      const row = Array(1 + dteToSeries.size * 2);
      row[0] = put.strike;

      const series = dteToSeries.get(put.DTE);
      row[1 + series * 2 + 0] = put.maxGainRatio;
      row[1 + series * 2 + 1] =
        `Strike: ${formatters.dollars().formatValue(put.strike)}\n` +
        `Expiration: ${formatters.date().formatValue(put.expirationDate)}\n` +
        `BreakEven: ${formatters.dollars().formatValue(put.breakEven)}\n` +
        `Max gain: ${formatters.percent().formatValue(put.maxGainRatio)}`;
      data.addRows([row]);
    });

  const chart = new google.visualization.LineChart(document.getElementById(chart_id));
  chart.draw(data, options);
}

function drawSpreads(symbol, puts, calls, table_id) {
  const spotPrice = puts[0].underlyingPrice;
  // For each DTE
  // take consecutive strikes
  // when lower strike is below spot, use puts, otherwise switch to calls
  // Or just use puts for now, for simplicity.
  const putsByDTEandStrike = new Map();
  const allDTEs = new Set();
  puts.forEach(put => {
    const DTE = put.DTE;
    allDTEs.add(DTE);
    if (!putsByDTEandStrike.has(DTE)) {
      putsByDTEandStrike.set(DTE, new Map());
    }
    putsByDTEandStrike.get(DTE).set(put.strike, put);
  });

  const dteToBets = new Map();
  const allStrikes = new Set();
  putsByDTEandStrike.forEach((putByStrike, DTE) => {
    const sortedStrikes = [];
    putByStrike.forEach((put) => {
      sortedStrikes.push(put.strike);
    });
    sortedStrikes.sort(compareNumbers());

    const strikePairs = sortedStrikes.map((elem, index, array) => [elem, array[index + 1]]);
    // Removeσ the last pair, which is: [lastElem, undefined].
    strikePairs.pop();

    const betsUnder = new Map();
    const betsOver = new Map();

    strikePairs.forEach(([lowStrike, highStrike]) => {
      const lowPut = putByStrike.get(lowStrike);
      const highPut = putByStrike.get(highStrike);
      const width = highStrike - lowStrike;
      const cost = highPut.premium - lowPut.premium;
      // breakeven (for both sides) is: highStrike - cost.
      // Yields for "under" and "over" bets:
      betsUnder.set(lowStrike, width / cost);
      betsOver.set(highStrike, width / (width - cost));
      allStrikes.add(lowStrike);
      allStrikes.add(highStrike);
    });
    dteToBets.set(DTE, {
      betsUnder,
      betsOver
    });
  });

  console.log(dteToBets);
  // dteToBets.flatMap()

  // Find all unique strikes, sort them.
  const betsTable = new Table({
    frozenColumns: 1,
    title: `All ${symbol} "Over" and "Under" bets (spreads). Each bet corresponds to a pair of puts; one bought and one`,
  }).defineColumn(`${symbol} price`, strike => strike, "number", formatters.dollars());
  [...allDTEs].sort(compareNumbers()).forEach((DTE) => {
    betsTable.defineColumn(`⬇️${DTE}`,
      strike => dteToBets.get(DTE)?.betsUnder?.get(strike),
      "number", formatters.percent());
    betsTable.defineColumn(`${DTE}⬆️`,
      strike => dteToBets.get(DTE)?.betsOver?.get(strike),
      "number", formatters.percent());
  });
  betsTable.format([...allStrikes].sort(compareNumbers()), table_id);
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

function compareNumbers() {
  return (a, b) => a - b;
}