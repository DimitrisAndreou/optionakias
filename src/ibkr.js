import Papa from 'papaparse';

const fileInput = document.getElementById('fileInput');
fileInput.addEventListener('change', async (event) => {
  processFilesAndReport(Array.from(event.target.files));
});

function readFileAsync(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({
      file: file,
      fileContent: reader.result
    });
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

function processCsv(csv_file) {
  const parsed_csv = parseStatementCsv(csv_file.fileContent);
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
    file: csv_file.file,
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

function report(loadedCsvFiles) {
  const processed_statements = loadedCsvFiles
    .map(loadedCsvFile => processCsv(loadedCsvFile))
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
  const loadedFiles = await Promise.all(Array.from(files).map(file => readFileAsync(file)));
  const result = report(Array.from(loadedFiles));
  drawTable(result, "table_div");
  showProcessedFiles(result, "processed_files_div");
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

function showProcessedFiles(results, processed_files_div_id) {
  function newElem(parent, type, text, cssClass) {
    const elem = document.createElement(type);
    if (text) {
      elem.textContent = text;
    }
    if (cssClass) {
      elem.classList.add(cssClass);
    }
    parent.appendChild(elem);
    return elem;
  }
  function dateToStr(date) {
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  function checkOverlappingStatements(statements) {
    function inRange(x, min, max) {
      return min <= x && x <= max;
    }
    function overlaps(s1, s2) {
      return inRange(s2.from_date, s1.from_date, s1.to_date);
    }
    for (let i = 0; i < statements.length; ++i) {
      for (let j = 0; j < statements.length; ++j) {
        if (i == j) continue;
        if (overlaps(statements[i], statements[j])) {
          alert(`Cannot trust results, periods are overlapping, thus results are double counted: \n`
            + `1. file: ${statements[i].file.name}, from: ${dateToStr(statements[i].from_date)} to ${dateToStr(statements[i].to_date)}\n`
            + `2. file: ${statements[j].file.name}, from: ${dateToStr(statements[j].from_date)} to ${dateToStr(statements[j].to_date)}\n`
          );
          return;
        }
      }
    }
  }

  const filesDiv = document.getElementById(processed_files_div_id);
  filesDiv.innerHTML = "";
  newElem(filesDiv, "p", "Processed periods/files:");
  const ul = newElem(filesDiv, "ul");
  results.processed_statements.forEach(statement => {
    newElem(ul, "li", `From ${dateToStr(statement.from_date)} to ${dateToStr(statement.to_date)}: ${statement.file.name}`);
  });
  checkOverlappingStatements(results.processed_statements);
}
