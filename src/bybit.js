import { Table, formatters } from './table.js'
import { makeOption, SpreadBet } from './options.js'

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
      drawCallsTable(symbol, symbol === "BTC" ? formatters.btcs() : formatters.eths(), calls, `${symbol}_calls_table`);
      drawPutsChart(symbol, puts, `${symbol}_puts_chart`);
      drawCallsChart(symbol, calls, `${symbol}_calls_chart`);
      drawSpreads(symbol, puts, calls, `${symbol}_spreads_table`, `${symbol}_touch_table`);
    },
    error => {
      console.error(error.stack);
      alert(`Error: ${error}`);
    }
  );
}

function drawPutsTable(symbol, puts, table_id) {
  const putsTable = new Table({
    frozenColumns: 4,
    frozenRows: 1,
  })
    .defineColumn("EXPIRATION<br>DATE", put => put.expirationDate, "date")
    .defineColumn("DTE", put => put.DTE, "number")
    .defineColumn(`${symbol} PUT<br>STRIKE`, put => put.strike, "number", formatters.dollars())
    .defineColumn("PREMIUM ($)<br>(=MAX GAIN)", put => put.maxGain, "number", formatters.dollars())
    .defineColumn("BREAKEVEN ($)<br>(=MAX LOSS)", put => put.breakEven, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (%)", put => put.breakEvenAsChange, "number", formatters.percent(), formatters.percentSmallerBetter())
    .defineColumn("MAX GAIN (%)", put => put.maxGainRatio, "number", formatters.percent(), formatters.maxGainPercent())
    .defineColumn("MAX GAIN<br>WHEN " + symbol + "<br>PERFORMS BETTER<br>THAN (%)",
      put => put.maxGainAsChange, "number", formatters.percent(), formatters.percentSmallerBetter())
    .defineColumn("BREAKEVEN<br>VS HODLER", put => put.breakEvenVsHodler, "number", formatters.dollars())
    .defineColumn("APR (%)", put => put.annualizedMaxGainRatio, "number", formatters.percent(), formatters.percentBiggerBetter())
    ;
  putsTable.format(puts, table_id);
}

function drawCallsTable(symbol, symbolFormatter, calls, table_id) {
  const callsTable = new Table({
    frozenColumns: 3,
    frozenRows: 1,
  })
    .defineColumn("EXPIRATION DATE", call => call.expirationDate, "date")
    .defineColumn("DAYS TILL EXPIRATION", call => call.DTE, "number")
    .defineColumn(`${symbol} CALL<br>STRIKE`, call => call.strike, "number", formatters.dollars())
    .defineColumn("PREMIUM ($)", call => call.maxGain, "number", formatters.dollars())
    .defineColumn("BREAKEVEN ($)", call => call.breakEven, "number", formatters.dollars())
    .defineColumn("BREAKEVEN (%)", call => call.breakEvenAsChange, "number", formatters.percent(), formatters.percentBiggerBetter())
    .defineColumn(`PREMIUM (${symbol})`, call => call.premiumAsKind, "number", symbolFormatter)
    .defineColumn(`BREAKEVEN ($, when premium=${symbol})`, call => call.breakEvenWithPremiumAsKind, "number", formatters.dollars())
    .defineColumn(`BREAKEVEN (%, when premium=${symbol})`, call => call.breakEvenAsChangeWithPremiumAsKind, "number", formatters.percent(), formatters.percentBiggerBetter())
    ;
  callsTable.format(calls, table_id);
}

function drawPutsChart(symbol, puts, chart_id) {
  const boldText = {
    fontSize: 18,
    bold: true,
  };
  const options = {
    title: `All ${symbol} Puts (Each line is an expiration date, N days from today)`,
    titleTextStyle: {
      fontSize: 24,
      bold: true,
    },
    hAxis: {
      title: `$ Strike (the price you promise to buy ${symbol} at)`, format: '$#,###',
      direction: -1,
      titleTextStyle: boldText,
    },
    vAxis: { title: 'Max Gain %', format: '#,###%', titleTextStyle: boldText, },
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

function drawCallsChart(symbol, calls, chart_id) {
  const boldText = {
    fontSize: 18,
    bold: true,
  };
  const options = {
    title: `All ${symbol} Calls (Each line is an expiration date, N days from today)`,
    titleTextStyle: {
      fontSize: 24,
      bold: true,
    },
    hAxis: {
      title: `$ Strike (the price you promise to sell ${symbol} at)`, format: '$#,###',
      direction: 1,
      titleTextStyle: boldText,
    },
    vAxis: { title: 'Premium ($)', format: '$#,###', titleTextStyle: boldText, },
    legend: { position: 'top' },
    curveType: 'function',
    pointSize: 5,
  };

  const data = new google.visualization.DataTable();
  data.addColumn({ type: 'number', pattern: '$#,###' });

  const dteToSeries = new Map();
  calls.forEach(call => {
    if (!dteToSeries.has(call.DTE)) {
      dteToSeries.set(call.DTE, dteToSeries.size);
      data.addColumn({ type: 'number', label: `${call.DTE}`, pattern: '$#,###' });
      data.addColumn({ role: 'tooltip' });
    }
  });

  // DTE to the greatest strike that is below the spot price.
  // I.e. if BTC price is $30300, let's plot the $30000 strike too,
  // instead of going down to $29000 or so.
  const maxStrikeBelowSpot = new Map();
  calls
    .filter(call => call.strike < call.underlyingPrice)
    .forEach(call =>
      maxStrikeBelowSpot.set(
        call.DTE,
        Math.max(call.strike, maxStrikeBelowSpot.get(call.DTE) || call.strike)
      )
    );

  calls
    .filter(call => call.strike >= (maxStrikeBelowSpot.get(call.DTE) || 0))
    .forEach(call => {
      const row = Array(1 + dteToSeries.size * 2);
      row[0] = call.strike;

      const series = dteToSeries.get(call.DTE);
      row[1 + series * 2 + 0] = call.premium;
      row[1 + series * 2 + 1] =
        `Strike: ${formatters.dollars().formatValue(call.strike)}\n` +
        `Expiration: ${formatters.date().formatValue(call.expirationDate)}\n` +
        `BreakEven: ${formatters.dollars().formatValue(call.breakEven)}\n` +
        `BreakEven As Change: ${formatters.percent().formatValue(call.breakEvenAsChange)}`;
      data.addRows([row]);
    });

  const chart = new google.visualization.LineChart(document.getElementById(chart_id));
  chart.draw(data, options);
}

function drawSpreads(symbol, puts, calls, table_id, touch_table_id) {
  const spotPrice = puts[0].underlyingPrice;
  // For each DTE, process each pair of consecutive strikes.
  function indexOptionsByDTE(options) {
    const optionsByDTE = new Map();
    options.forEach(option => {
      const DTE = option.DTE;
      optionsByDTE.set(DTE, optionsByDTE.get(DTE) || []);
      optionsByDTE.get(DTE).push(option);
    });
    return optionsByDTE;
  }
  const putsByDTE = indexOptionsByDTE(puts);
  const callsByDTE = indexOptionsByDTE(calls);

  function allDTEsAndStrikes(options) {
    const allDTEs = new Set();
    const allStrikes = new Set();
    options.forEach(option => {
      allDTEs.add(option.DTE);
      allStrikes.add(option.strike);
    });
    return {
      allDTEs,
      allStrikes,
    };
  }
  const { allDTEs, allStrikes } = allDTEsAndStrikes(puts);

  function listToPairs(list) {
    const pairs = list.map((elem, index, array) => [array[index], array[index + 1]]);
    // Removes the last pair, which is: [lastElem, undefined].
    pairs.pop();
    return pairs;
  }

  const dteToBets = new Map();
  allDTEs.forEach(DTE => {
    const puts = putsByDTE.get(DTE);
    const calls = callsByDTE.get(DTE);

    function indexOptionsByStrike(options = []) {
      return options.reduce((strikeToOption, option) => {
        strikeToOption[option.strike] = option;
        return strikeToOption;
      }, {});
    }
    const strikeToPut = indexOptionsByStrike(puts);
    const strikeToCall = indexOptionsByStrike(calls);
    const sortedStrikes = puts.map(put => put.strike).sort(compareNumbers());
    const strikeToOverBets = new Map();
    const strikeToUnderBets = new Map();
    const strikeToTouchBets = new Map();
    const registerBet = (bet, map, touchBetsMap) => {
      if (bet.earnedYield?.pessimisticAsBet > 1.0) {
        map.set(bet.bestStrike, bet)
        if (bet.earnedYield?.pessimisticAsBet > 2.0) {
          touchBetsMap.set(bet.bestStrike, bet);
        }
      }
    };
    listToPairs(sortedStrikes).forEach(([lowStrike, highStrike]) => {
      const putsSpread = [strikeToPut[lowStrike], strikeToPut[highStrike]].filter(o => o !== undefined);
      const callsSpread = [strikeToCall[lowStrike], strikeToCall[highStrike]].filter(o => o !== undefined);

      let selectedSpread = putsSpread;
      // When lower strike is below spot, use puts, otherwise switch to calls (better liquidity).
      if (spotPrice < highStrike && callsSpread.length === 2) {
        selectedSpread = callsSpread;
      }
      if (selectedSpread.length !== 2) {
        return;
      }
      // console.log(`${spotPrice} ${DTE} ${lowStrike}-${highStrike} : selected: ${selectedSpread[0].type}`);
      registerBet(SpreadBet.createOver(...selectedSpread), strikeToOverBets, strikeToTouchBets);
      registerBet(SpreadBet.createUnder(...selectedSpread), strikeToUnderBets, strikeToTouchBets);
    });
    dteToBets.set(DTE, { strikeToOverBets, strikeToUnderBets, strikeToTouchBets });
  });

  const betsTable = new Table({
    frozenColumns: 1,
    frozenRows: 1,
    title: `All ${symbol} "Over" and "Under" bets (spreads). Each bet corresponds to a pair of puts; one bought and one`,
  }).defineColumn(`${symbol} price`, strike => strike, "number", formatters.dollars());

  const touchBetsTable = new Table({
    frozenColumns: 1,
    frozenRows: 1,
    title: `All ${symbol} "Touch" bets. If the price ever touches the target before expiration, it wins`,
  }).defineColumn(`${symbol} price`, strike => strike, "number", formatters.dollars());

  const allStrikesArray = [...allStrikes].sort(compareNumbers(false));
  const allDTEsArray = [...allDTEs].sort(compareNumbers(false));

  allDTEsArray.forEach(DTE => {
    betsTable.defineColumn(`${DTE}⬆️`,
      strike => dteToBets.get(DTE).strikeToOverBets.get(strike)?.earnedYield?.pessimisticAsBet || undefined,
      "number", formatters.two_decimals_number(), formatters.positiveYields());
    betsTable.defineColumn(`⬇️${DTE}`,
      strike => dteToBets.get(DTE).strikeToUnderBets.get(strike)?.earnedYield?.pessimisticAsBet || undefined,
      "number", formatters.two_decimals_number(), formatters.positiveYields());

    touchBetsTable.defineColumn(`${DTE}`,
      // The "/2" is a bit too complicated to explain here. Ask me!
      strike => dteToBets.get(DTE).strikeToTouchBets.get(strike)?.earnedYield?.pessimisticAsBet / 2 || undefined,
      "number", formatters.two_decimals_number(), formatters.positiveYields());
  });

  const { table } = betsTable.format(allStrikesArray, table_id);

  // Print details whenever a cell is created.
  // A Google Chart table's selection only supports rows, but we can
  // get the cell index from the browser's window event. 
  // From the row/col indexes, we have to find the corresponding spread,
  // then explain to the user how one can trade it, and how its yield
  // comes about.
  google.visualization.events.addListener(table, 'select', () => {
    const selection = table.getSelection();
    if (!selection.length) {
      return;
    }
    const row = selection[0].row;
    const col = window.event.target.cellIndex;
    const DTE = allDTEsArray[Math.trunc((col - 1) / 2)];
    const isUnder = col % 2 === 0;
    const strike = allStrikesArray[row];
    const bets = dteToBets.get(DTE);
    const directionBets = isUnder ? bets.strikeToUnderBets : bets.strikeToOverBets;
    const bet = directionBets.get(strike);
    const targetElement = document.getElementById(`${table_id}_explanation`);
    targetElement.innerHTML = bet.explanationHtml;
  });

  const { touchTable } = touchBetsTable.format(allStrikesArray, touch_table_id);
  // TODO: add a listener to touchTable?
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
    console.error(error.stack);
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

function compareNumbers(asc = true) {
  return (a, b) => asc ? (a - b) : (b - a);
}