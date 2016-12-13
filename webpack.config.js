var path = require('path');
module.exports = {
    entry: './js/jolecule.js',
    devtool: 'source-map',
    output: {
        path: __dirname,
        filename: 'jolecule.lib.js',
        library: 'jolecule',
        libraryTarget: 'umd'
    },
    module: {
        loaders: [
            { test: path.join(__dirname, 'js'),
              loader: 'babel-loader' }
        ]
    },
};