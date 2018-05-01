const path = require('path')
const fs = require('fs')
const del = require('del')

const bcrypt = require('bcryptjs')
const Sequelize = require('sequelize')
const sequelizeJson = require('sequelize-json')

const config = require('./config')
const conn = require('./conn')
let db = conn.db

/**
 *
 * Definitions of the database for Versus
 *
 * Sequelize is used to interact with the database, as it is
 * quite flexible in terms of the target database.
 * Versus makes extensive use of JSON, and so, in terms of
 * flexibility, sequelize-json is used to map JSON in
 * sequelize as sequelize-json works with Sqlite, Postgres, and MySQL.
 * For the sequelize-json JSON fields, be sure to use updateAttributes,
 * and not update
 *
 * The database is not meant to be accessed directly by the web-handlers.
 * These are meant to be accessed directly by the access functions
 * defined below. These functions take JSON literals as parameters
 * and returns the data in the database as JSON-literals wrapped in
 * a promise.
 *
 * Accessor functions are prefaced with:
 *  - fetch* returns a JSON-literal of the Sequelize instance
 *  - create* creates a database entry from a JSON-literal
 *  - update* updates values in the instance
 *  - [optional] find* returns the actual Sequelize instance
 */

/**
 * @returns {Object|null} JSON-literal of a Sequelize instance
 */
function unwrapInstance (instance) {
  if (instance === null) {
    return null
  } else {
    return instance.get({plain: true})
  }
}

async function deleteFileList (fileList) {
  for (let f of fileList) {
    if (fs.existsSync(f.path)) {
      console.log('>> router.deleteFileList', f.path)
      await del(f.path)
    }
  }
}

/**
 * Moves fileList to a time-stamped sub-directory in config.filesDir.
 * Optional checking function can throw Exceptions for bad files.
 * @param fileList
 * @param checkFilesForError
 * @promise - list of new paths
 */
async function storeFilesInConfigDir (fileList, checkFilesForError) {
  try {
    const timestampDir = String(new Date().getTime())
    const fullDir = path.join(config.filesDir, timestampDir)
    if (!fs.existsSync(fullDir)) {
      fs.mkdirSync(fullDir, 0o744)
    }

    if (checkFilesForError) {
      let error = checkFilesForError(fileList)
      if (error) {
        throw new Error(error)
      }
    }

    let targetPaths = []
    for (let file of fileList) {
      let basename = path.basename(file.originalname)
      let targetPath = path.join(timestampDir, basename)
      targetPaths.push(targetPath)

      let fullTargetPath = path.join(config.filesDir, targetPath)
      fs.renameSync(file.path, fullTargetPath)

      console.log(`>> router.storeFilesInConfigDir ${targetPath}`)
    }

    return targetPaths
  } catch (error) {
    await deleteFileList(fileList)
    throw error
  }
}

/**
 * Default User model and accessor functions
 *
 * Unwrapped JSON structure:
 * {
 *   id: Number,
 *   name: string,
 *   password: salted password string,
 *   email: string
 * }
 */

const User = db.define('User', {
  id: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  name: Sequelize.STRING,
  email: {
    type: Sequelize.STRING,
    unique: true
  },
  password: {
    type: Sequelize.STRING,
    set (val) {
      let saltedPassword = bcrypt.hashSync(val, bcrypt.genSaltSync(10))
      this.setDataValue('password', saltedPassword)
    }
  },
  isAdmin: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
})

function createUser (values) {
  return User
    .findOne({where: {id: values.id}})
    .then(user => {
      if (user === null) {
        return User
          .create(values)
          .then(unwrapInstance)
      }
    })
}

function updateUser (values) {
  return User
    .findOne({where: {id: values.id}})
    .then(user => {
      if (user) {
        return user
          .updateAttributes(values)
          .then(unwrapInstance)
      } else {
        return null
      }
    })
}

function fetchUser (values) {
  return User
    .findOne({where: values})
    .then(user => {
      if (user) {
        return unwrapInstance(user)
      } else {
        return null
      }
    })
}

function checkUserWithPassword (user, password) {
  return new Promise((resolve) => {
    bcrypt.compare(
      password,
      user.password,
      (err, isMatch) => {
        if (err) {
          resolve(null)
        } else if (isMatch) {
          resolve(user)
        } else {
          resolve(null)
        }
      })
  })
}

/**
 * Custom database models and relationships between models
 */

const Object = db.define('Object', {
  id: {
    primaryKey: true,
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4
  },
  attr: sequelizeJson(db, 'Object', 'attr'),
  type: Sequelize.STRING,
  data: Sequelize.BLOB
})

async function createObject (attr, data) {
  let object = await Object.create({attr, data})
  return unwrapInstance(object)
}

function findObject (objectId) {
  return Object.findOne({where: {id: objectId}})
}

function fetchObject (objectId) {
  return findObject(objectId).then(unwrapInstance)
}

function deleteObject (objectId) {
  return Object.destroy({where: {objectId}})
}

async function saveObject (objectId, values) {
  let object = await findObject(objectId)
  let result = await object.updateAttributes(values)
  return unwrapInstance(result)
}

/**
 * Module Initialization on startup
 */
async function init () {
  await db.sync()
  console.log('> Models.init done')
}

init()

module.exports = {
  storeFilesInConfigDir,
  createUser,
  fetchUser,
  checkUserWithPassword,
  updateUser,
  createObject,
  fetchObject,
  saveObject,
  deleteObject
}
