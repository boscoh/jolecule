const _ = require('lodash')
const path = require('path')
const fs = require('fs-extra')

const config = require('./config')
const dbmodel = require('./dbmodel')

/**
 *
 * handlers.js - this module holds all the functions that are accessible
 * to the web-client in the JSON-RPC api. It binds the database to the
 * binary-tree search functions
 *
 * Any functions defined in the module exports can be accessed by the
 * corresponding `rpc` module in the client. These are accessed by their
 * names, where a name starting with public are publicly accessible
 * API. All other functions need the user to have already logged-in.
 *
 * The functions must return a promise that returns a JSON-literal.
 * For security, all returned functions must be wrapped in a dictionary.
 *
 * Functions that handle file-uploads from the client start with
 * upload, and the first parameter will be a filelist object that
 * determines the names and locations of the uploaded files on the
 * server.
 *
 * User handlers
 *
 */

async function publicRegisterUser (user) {
  let errors = []
  if (!user.name) {
    errors.push('no user name')
  }
  if (!user.email) {
    errors.push('no email')
  }
  if (!user.password) {
    errors.push('no Password')
  }

  if (errors.length > 0) {
    throw errors.join(', ').join(errors)
  }

  let values = {
    name: user.name,
    email: user.email,
    password: user.password
  }

  try {
    await dbmodel.createUser(values)
    return {success: true}
  } catch (e) {
    throw 'Couldn\'t register, is your email already in use?'
  }
}

/**
 * Updates user where the id field is used to identify the user.
 * @param {Object} user
 * @promise {User}
 */
async function loginUpdateUser (user) {
  const keys = ['id', 'name', 'email', 'password']
  let values = {}
  for (let key of keys) {
    if (user[key]) {
      values[key] = user[key]
    }
  }
  if (!values) {
    throw 'No values to update'
  }
  if (!values.id) {
    throw 'No user.id to identify user'
  }

  try {
    console.log('>> handlers.updateUser', values)
    await dbmodel.updateUser(values)
    return {success: true}
  } catch (err) {
    throw 'Couldn\'t update user - ' + err.toString()
  }
}

async function publicResetPassword (tokenId, password) {
  let values  = {
    id: tokenId,
    password
  }
  if (!values.id) {
    throw 'No user.id to identify user'
  }

  try {
    console.log('>> handlers.publicResetPassword', values)
    await dbmodel.updateUser(values)
    return {success: true}
  } catch (err) {
    throw `Update failure ${err}`
  }
}

// TODO: adminGetUsers, adminDeleteUsers

// user defined


async function updateDatabaseOnInit () {
}

updateDatabaseOnInit()

/**
 * Specific handlers - promises that return a JSON literal
 */

async function publicGetText() {
  return {
    "text": "Example text from local webserver",
    "isRunning": true
  }
}

async function publicDownloadGetReadme () {
  payload = {
    "filename": path.resolve("readme.md"),
    "data": { "success": true}
  }
  console.log("> publicGetReadme", payload)
  return payload
}

async function publicUploadFiles (fileList) {
  const timestampDir = String(new Date().getTime())
  const fullDir = path.join(config.filesDir, timestampDir)
  fs.ensureDirSync(fullDir)
  let targetPaths = [] //
  for (let file of fileList) {
    let basename = path.basename(file.originalname)
    let targetPath = path.join(timestampDir, basename)
    let fullTargetPath = path.join(config.filesDir, targetPath)
    fs.renameSync(file.path, fullTargetPath)
    targetPaths.push('/file/' + targetPath)
  }
  console.log("> publicUploadFiles", targetPaths)
  return { files: targetPaths }
}

module.exports = {
  publicRegisterUser,
  loginUpdateUser,
  publicGetText,
  publicDownloadGetReadme,
  publicUploadFiles
}
