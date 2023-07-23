// const dateFormatter = new google.visualization.DateFormat(
//   { pattern: "dd MMM yyyy" });
// dateFormatter.format(data, 1);

// const formatter = new google.visualization.ColorFormat();
// formatter.addRange(null, 0, 'red', 'white');
// formatter.addRange(0, null, 'green', 'white');
// [1, 2, 3].forEach(col => formatter.format(data, col));

export class Table {
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

export const formatters = {
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
