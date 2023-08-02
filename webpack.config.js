const path = require('path');

module.exports = {
  entry: {
    ibkr: './src/ibkr.js',
    bybit: './src/bybit.js',
  },
  output: {
    path: path.resolve(__dirname, 'www/dist'),
    filename: '[name].js',
  },
  optimization: {
    usedExports: true,
    minimize: true,
  },
  externals: {
    charts: 'google.charts'
  }
};