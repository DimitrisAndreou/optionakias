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

    this._columns.forEach((column, index) => {
      column?.formatter?.format(data, index);
    });
    data.setProperty(0, 0, 'style', 'width:100px');
    table.draw(data, this._options);
  }
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
  date: function () {
    return new google.visualization.DateFormat(
      { pattern: "dd MMM yyyy" });
  }
  // const formatter = new google.visualization.ColorFormat();
  // formatter.addRange(null, 0, 'red', 'white');
  // formatter.addRange(0, null, 'green', 'white');
};
