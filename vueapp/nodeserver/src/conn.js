/**
 * @fileoverview Centralized place to declare the main Express app and
 * Sequelize db variables so that circular references are
 * avoided when loading models.js, router.js and app.js
 */

// Initialize express app
const express = require('express')
const app = express()

// Initialize database using Sequelize
const env = process.env.NODE_ENV || 'development'
const dbConfig = require('./config')[env]
const Sequelize = require('sequelize')
const db = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  dbConfig)

// Wipes database if `force: true`
db.sync({force: false})

// Parse command line

const nopt = require('nopt')
const path = require('path')

let knownOpts = {debug: [Boolean, false]}
let shortHands = {d: ['--debug']}
let parsed = nopt(knownOpts, shortHands, process.argv, 2)
let remain = parsed.argv.remain

isDebug = !!parsed.debug

let initDir

if (remain.length > 0) {
  testPdb = remain[0]

  initPdb = testPdb
  initDir = path.dirname(initPdb)

  if (isDirectory(testPdb)) {
    initDir = testPdb
    initPdb = ''
  } else if (!fs.existsSync(testPdb)) {
    let testInitPdb = testPdb + '.pdb'
    if (fs.existsSync(testInitPdb)) {
      initPdb = testInitPdb
      initDir = path.dirname(initPdb)
    }
  }
  if (initPdb && !fs.existsSync(initPdb)) {
    console.log('file not found', initPdb)
    process.exit(1);
  }
  if (!isDirectory(initDir)) {
    console.log('directory not found', initDir)
    process.exit(1);
  }
} else {
  initPdb = path.join(__dirname, '../../../examples/1mbo.pdb')
  initDir = path.dirname(initPdb)
}

module.exports = {app, db, initPdb, initDir}
