#!/usr/bin/env node

/**
 * Create config.js from defaultConfig.js if not found
 */

const path = require('path')
const fs = require('fs-extra')
const configJs = path.resolve(__dirname, 'src/config.js')
const defaultConfigJs = path.resolve(__dirname, 'src/defaultConfig.js')
if (!fs.existsSync(configJs)) {
  fs.copySync(defaultConfigJs, configJs)
}

