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
  defineColumn(header, valueFn, type, ...columnFormatters) {
    this._columns.push({
      header,
      valueFn,
      type,
      columnFormatters
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

    this._columns.forEach((column, index) =>
      column.columnFormatters.forEach((formatter) => formatter.format(data, index))
    );
    data.setProperty(0, 0, 'style', 'width:100px');
    table.draw(data, this._options);
    return { data, table };
  }
}

google.charts.load('current', { 'packages': ['table'] });

export const formatters = {
  dollars: () => new google.visualization.NumberFormat({
    pattern: '$#,###'
  }),
  percent: () => new google.visualization.NumberFormat({
    pattern: '#,###%'
  }),
  two_decimals_number: () => new google.visualization.NumberFormat({
    pattern: '#.00'
  }),
  date: () => new google.visualization.DateFormat({
    pattern: "dd MMM yyyy"
  }),
  positiveYields: () => {
    const formatter = new google.visualization.ColorFormat();
    formatter.addGradientRange(1.0, 2.0, "#000000", "#aff7b6", "#93ecf8");
    formatter.addGradientRange(2.0, 4.0, "#000000", "#93ecf8", "#ffff50");
    formatter.addGradientRange(4.0, 8.0, "#000000", "#ffff50", "#fccf4b");
    formatter.addGradientRange(8.0, 16.0, "#000000", "#fccf4b", "#ffaaff");
    formatter.addGradientRange(16.0, 32.0, "#000000", "#ffaaff", "#ddaaff");
    formatter.addGradientRange(32.0, null, "#000000", "#ddaaff", "#f2725d");
    return formatter;
  },
  maxGainPercent: () => {
    const formatter = new google.visualization.ColorFormat();
    formatter.addGradientRange(0.0, 1.0, "#000000", "#FFFFFF", "#00FF00");
    formatter.addGradientRange(1.0, null, "#000000", "#00FF00", "#00FF00");
    return formatter;
  },
  percentSmallerBetter: () => {
    const formatter = new google.visualization.ColorFormat();
    formatter.addGradientRange(null, -1, "#000000", "#00FF00", "#00FF00");
    formatter.addGradientRange(-1.0, 0., "#000000", "#00FF00", "#FFFFFF");
    formatter.addGradientRange(0.0, 1.0, "#000000", "#FFFFFF", "#FF0000");
    formatter.addGradientRange(1., null, "#000000", "#FF0000", "#FF0000");
    return formatter;
  },
  percentBiggerBetter: () => {
    const formatter = new google.visualization.ColorFormat();
    formatter.addGradientRange(null, -1, "#000000", "#FF0000", "#FF0000");
    formatter.addGradientRange(-1.0, 0., "#000000", "#FF0000", "#FFFFFF");
    formatter.addGradientRange(0.0, 1.0, "#000000", "#FFFFFF", "#00FF00");
    formatter.addGradientRange(1., null, "#000000", "#00FF00", "#00FF00");
    return formatter;
  },
};
