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
    minimize: false,
  },
  externals: {
    charts: 'google.charts'  // or any other alias you want, can be a regex too! check Webpack's doc for more
  }
};