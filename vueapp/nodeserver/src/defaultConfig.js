const path = require('path')

module.exports = {
  filesDir: path.join(__dirname, '..', 'files'),
  ip: 'localhost',
  port: 3000,
  secretKey: 'plasticgui-secret',
  development: {
    host: 'localhost',
    dialect: 'sqlite',
    storage: path.join(__dirname, '..', 'database.sqlite')
  }
}