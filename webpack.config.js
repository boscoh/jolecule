var path = require('path');
module.exports = {
    entry: './src/main.js',
    devtool: 'source-map',
    output: {
        path: __dirname,
        filename: 'jolecule.js',
        library: 'jolecule',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            { test: path.join(__dirname, 'src'),
              loader: 'babel-loader' }
        ]
    },
};