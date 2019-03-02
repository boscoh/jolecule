'use strict'
let path = require('path')
module.exports = {
  entry: ['babel-polyfill', './test.es6.js'],
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, '.'),
    filename: 'test.js'
  },
  target: 'node',
  module: {
    loaders: [
      {
        test: path.join(__dirname, 'src'),
        loader: 'babel-loader',
        exclude: /node_modules/,
        query: {
          presets: 'stage-0'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
}
