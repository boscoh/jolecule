/**
 * @fileoverview The Versus web-server is an Express App.
 * It hooks up to Sequelize for db and Passport for
 * session management.
 *
 * Here, the middleware for Express is defined, and the
 * router is loaded in. This includes access to files
 * that have been uploaded to the server.
 *
 * As well the server also serves the  production version of
 * the web-client.
 */

const path = require('path')
const _ = require('lodash')
const express = require('express')
const fs = require('fs')
const nopt = require('nopt')
const config = require('./config')
const handlers = require('./handlers')

function isDirectory (d) {
  return fs.statSync(d).isDirectory()
}

function parseCommandLineArguments() {
  let knownOpts = { debug: [Boolean, false] }
  let shortHands = { d: ['--debug'] }
  let parsed = nopt(knownOpts, shortHands, process.argv, 2)
  let remain = parsed.argv.remain

  if (remain.length === 0) {
    config.initFile = path.join(__dirname, '../../../examples/1mbo.pdb')
    config.initDir = path.dirname(config.initFile)
  } else {
    const testPdb = remain[0]

    config.initFile = testPdb
    config.initDir = path.dirname(config.initFile)

    if (isDirectory(testPdb)) {
      config.initDir = testPdb
      config.initFile = ''
    } else if (!fs.existsSync(testPdb)) {
      let testInitFile = testPdb + '.pdb'
      if (fs.existsSync(testInitFile)) {
        config.initFile = testInitFile
        config.initDir = path.dirname(config.initFile)
      }
    }
    if (config.initFile && !fs.existsSync(config.initFile)) {
      console.log('file not found', config.initFile)
      process.exit(1);
    }
    if (!isDirectory(config.initDir)) {
      console.log('directory not found', config.initDir)
      process.exit(1);
    }
  }
}

parseCommandLineArguments()

const app = express()
module.exports = app

// Middleware Configuration

// Cross-origin-resource-sharing for hot-reloading client
app.use(function (req, res, next) {
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Origin', req.headers.origin)
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
  res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept')
  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
  } else {
    next()
  }
})

// Logs all requests
const logger = require('morgan')
app.use(logger('dev'))

// Parse Json in body
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended: false}))

/**
 * This is the main interface to the JSON-RPC api. It is a post
 * handler, where the function name and args are passed in
 * the body as JSON.
 *
 * Because of the special semantics in initiating/terminating
 * user sessions with login/logut, they are specially
 * handled here, otherwise all functions are sent to the matching
 * functions found in the exports of `handlers.js`.
 */
const router = express.Router()
app.use(router)
router.post('/api/rpc-run', (req, res, next) => {
  let params = req.body.params
  let method = req.body.method
  console.log(`>> router.rpc-run.${method}`)

  if (method in handlers) {
    const runFn = handlers[method]

    runFn(...params)
      .then(result => {
        res.json({
          result,
          jsonrpc: '2.0'
        })
      })
      .catch(e => {
        res.json({
          error: {
            code: -32603,
            message: e.toString()
          },
          jsonrpc: '2.0'
        })
      })
  } else {
    res.json({
      error: {
        code: -32601,
        message: `Method not found`
      },
      jsonrpc: '2.0'
    })
  }
})

// Load compiled production client
const clientDir = path.join(__dirname, '..', '..', 'client', 'dist')
app.use(express.static(clientDir))

// Load static files
app.use('/file', express.static('files'))

app.get('/', (req, res) => {
  res.sendFile(path.join(clientDir, 'index.html'))
})

// Redirect dangling calls to here
app.get('*', (req, res) => {
  res.redirect('/')
})

// Catch 404 and forward to Error Handler
app.use((req, res, next) => {
  res.status(404).render('404', {url: req.originalUrl})
  const err = new Error('Not Found')
  err.status = 404
  next(err)
})

// Development Error Handler (stack-traces printed)
if (app.get('env') === 'development') {
  app.use((err, req, res) => {
    res.status(err.status || 500)
      .render('error', {message: err.message, error: err})
  })
}

// Production Error Handler (no stack-traces printed)
app.use((err, req, res) => {
  res.status(err.status || 500)
    .render('error', {message: err.message, error: {}})
})
