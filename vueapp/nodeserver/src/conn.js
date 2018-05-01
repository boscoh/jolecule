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

module.exports = {app, db}
