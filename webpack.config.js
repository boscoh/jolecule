var path = require('path');
module.exports = {
    entry: 'main.js',
    devtool: 'source-map',
    output: {
        path: __dirname,
        filename: 'main.bundled.js',
        // library: 'main',
        // libraryTarget: 'umd'
    },
    module: {
        loaders: [
            { test: path.join(__dirname, '.'),
              loader: 'babel-loader' }
        ]
    },
};