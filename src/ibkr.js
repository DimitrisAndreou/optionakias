import Papa from 'papaparse';

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (event) => {
  processFilesAndReport(Array.from(event.target.files));
});

function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Parses statement csv into a struct/object.
function parseStatementCsv(csv_file_content) {
  const result = {};
  let headers = null;

  const papa_parse_options = {
    delimiter: ",",
    header: false,
  };


  const datas = Papa.parse(csv_file_content, papa_parse_options).data;
  datas.forEach(data => {
    const colsToSkipForKeyValues = 2;
    const type = data[0];
    if (data[1] === "Header") {
      headers = {};
      data.slice(colsToSkipForKeyValues).
        forEach((elem, index) => headers[index] = elem);
      result[type] = [];
    } else if (data[1] === "Data") {
      const row = {};
      data.slice(colsToSkipForKeyValues).
        forEach((elem, index) => row[headers[index]] = elem);
      if (row['Field Name'] && row['Field Value']) {
        row[row['Field Name']] = row['Field Value'];
        delete row['Field Name'];
        delete row['Field Value'];
      }
      result[type].push(row);
    }
  });
  return result;
}

function processCsv(csv_file_content) {
  const parsed_csv = parseStatementCsv(csv_file_content);
  // { Period: 'September 1, 2022 - December 30, 2022' }
  const dates = parsed_csv.Statement
    .filter(x => 'Period' in x)
    .at(0).Period.split("-")
    .map(x => new Date(x.trim()));

  const instruments = parsed_csv['Realized & Unrealized Performance Summary']
    .filter(row => row.Symbol !== '' /* Ignore 'total'/aggregating rows */)
    .map(row => ({
      instrument: row.Symbol,
      symbol: row.Symbol.split(" ")[0],
      realized: parseFloat(row['Realized Total']),
      unrealized: parseFloat(row['Unrealized Total']),
    }));
  return {
    // csv_file,  // Would be nice to retain the filename here
    from_date: dates[0],
    to_date: dates[1],
    instruments
  };
}

// Iterable over all instruments contained in one or more processed statements.
function* instruments(...processed_statements) {
  for (const statement of processed_statements) {
    for (const instrument of statement.instruments) {
      yield {
        statement,
        instrument
      };
    }
  }
}

function report(csv_file_contents) {
  const processed_statements = csv_file_contents
    .map(csv_file_content => processCsv(csv_file_content))
    .sort((a, b) => {
      return b.from_date - a.from_date;
    });

  // map: aggregator by symbol
  // {statement, instrument}
  // extractor: (instrument) => number
  function aggregateBySymbol(map, { statement, instrument }, extractor) {
    const aggr = map.get(instrument.symbol) || {
      result: 0,
      contributing_entries: []
    };
    aggr.result += extractor(instrument);
    aggr.contributing_entries.push({ statement, instrument });
    map.set(instrument.symbol, aggr);
    return map;
  }

  const realized = Array.from(instruments(...processed_statements)).reduce(
    (map, input) => aggregateBySymbol(map, input, instrument => instrument.realized),
    new Map());

  const unrealized = new Map();
  if (processed_statements.length > 0) {
    const most_recent_statement = processed_statements.reduce(
      (s1, s2) => (s1.to_date > s2.to_date ? s1 : s2), {});
    Array.from(instruments(most_recent_statement)).reduce(
      (map, input) => aggregateBySymbol(map, input, instrument => instrument.unrealized),
      unrealized);
  }

  const pnl = [];
  new Set([...realized.keys(), ...unrealized.keys()]).forEach(
    symbol => {
      pnl.push({
        symbol,
        realized: Math.round(realized.get(symbol)?.result || 0),
        unrealized: Math.round(unrealized.get(symbol)?.result || 0),
        total: Math.round((realized.get(symbol)?.result || 0) + (unrealized.get(symbol)?.result || 0)),
        contributing_entries:
          [
            ...(realized.get(symbol)?.contributing_entries || []),
            ...(unrealized.get(symbol)?.contributing_entries || [])
          ]
      });
    }
  );
  pnl.sort((a, b) => {
    if ((a.unrealized === 0.0) != (b.unrealized === 0.0)) {
      return Math.abs(b.unrealized) - Math.abs(a.unrealized);
    }
    return a.symbol.localeCompare(b.symbol)
  });
  return {
    processed_statements,
    pnl
  };
}

google.charts.load('current', { 'packages': ['table'] });

async function processFilesAndReport(files) {
  const file_contents = await Promise.all(Array.from(files).map(file => readFileAsync(file)));
  const result = report(Array.from(file_contents));
  console.table(result);
  drawTable(result, "table_div");
  return result;
}

function drawTable(results, table_id) {
  const data = new google.visualization.DataTable();
  data.addColumn("string", "Symbol");
  data.addColumn("number", "Realized");
  data.addColumn("number", "Unrealized");
  data.addColumn("number", "TOTAL");
  data.addRows(results.pnl.map(pnl =>
    [pnl.symbol, pnl.realized, pnl.unrealized, pnl.total]));

  const table = new google.visualization.Table(document.getElementById(table_id));

  const options = {
    frozenColumns: 1,
    showRowNumber: false,
    width: 'auto',
    height: 'auto',
    allowHtml: true,
  };

  const formatter = new google.visualization.ColorFormat();
  formatter.addRange(null, 0, 'red', 'white');
  formatter.addRange(0, null, 'green', 'white');
  [1, 2, 3].forEach(col => formatter.format(data, col));
  table.draw(data, options);
}

  // console.log(chalk.bold.green("Processed:"));
  // for (const statement of result.processed_statements) {
  //   console.log(
  //     " from",
  //     chalk.bold(`${ dateToStr(statement.from_date)
    // }`),
  //     "to",
  //     chalk.bold(`${ dateToStr(statement.to_date) } `),
  //     ":", `${ statement.csv_file } `);
  // }

  // const overlapping_statements = detectOverlappingStatements(result.processed_statements);
  // if (overlapping_statements) {
  //   console.log(
  //     chalk.bold.red("ERROR: Overlapping statements"),
  //     "(cannot trust results, overlapping periods were double counted)");
  //   overlapping_statements.forEach(statement =>
  //     console.log(
  //       " from",
  //       chalk.red.bold(`${ dateToStr(statement.from_date) } `),
  //       "to",
  //       chalk.red.bold(`${ dateToStr(statement.to_date) } `),
  //       ":", `${ statement.csv_file } `)
  //   );
  // }

  // function dateToStr(date) {
  //   return dateFormat(date, "dd mmm yyyy")
  // }

  // function detectOverlappingStatements(statements) {
  //   function inRange(x, min, max) {
  //     return min <= x && x <= max;
  //   }
  //   function overlaps(s1, s2) {
  //     return inRange(s2.from_date, s1.from_date, s1.to_date);
  //   }
  //   for (let i = 0; i < statements.length; ++i) {
  //     for (let j = 0; j < statements.length; ++j) {
  //       if (i == j) continue;
  //       if (overlaps(statements[i], statements[j])) {
  //         return [statements[i], statements[j]];
  //       }
  //     }
  //   }
  //   //
  //   return null;
  // }
  // }
