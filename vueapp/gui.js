const childProcess = require('child_process')
const path = require('path')
childProcess.fork(path.join('nodeserver/src/bin', 'www'), ['-c'])
