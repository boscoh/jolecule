"use strict";
let path = require('path');
let webpack = require("webpack");
module.exports = {
  entry: './src/main.js',
  devtool: 'source-map',
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'jolecule.js',
    library: 'jolecule',
    libraryTarget: 'umd'
  },
  module: {
    loaders: [
      {
        test: path.join(__dirname, 'src'),
        loader: 'babel-loader',
        // exclude: /node_modules/,
        query: {
          presets: ['es2015', 'stage-0']
        },
      }
    ]
  },
  // plugins: [
  //   new webpack.NoErrorsPlugin(),
  //   // new webpack.optimize.UglifyJsPlugin({minimize: true})
  // ],
};