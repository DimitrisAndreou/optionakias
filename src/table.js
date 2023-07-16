export default class Table {
  constructor() {
    this.columns = {};
  }

  defineColumn(name, caption, type, formatter) {
    this.columns[name] = {
      caption,
      type,
      formatter
    };
  }

  format(rows) {
    const data = new google.visualization.DataTable();
    this.columns.forEach(
      column => data.addColumn(column.type, column.caption));

    // data.addColumn("string", "Symbol");
    // data.addColumn("number", "Realized");
    // data.addColumn("number", "Unrealized");
    // data.addColumn("number", "TOTAL");
    // data.addRows(results.pnl.map(pnl =>
    //   [pnl.symbol, pnl.realized, pnl.unrealized, pnl.total]));

    // const table = new google.visualization.Table(document.getElementById(table_id));

    // const options = {
    //   frozenColumns: 1,
    //   showRowNumber: false,
    //   width: 'auto',
    //   height: 'auto',
    //   allowHtml: true,
    // };

    // const formatter = new google.visualization.ColorFormat();
    // formatter.addRange(null, 0, 'red', 'white');
    // formatter.addRange(0, null, 'green', 'white');
    // [1, 2, 3].forEach(col => formatter.format(data, col));
    // table.draw(data, options);

  }
  // --> something that takes a list of (puts or calls)
  //     and turns it into a Google Chart Table ready to use.
}