const path = require('path')
const fs = require('fs')

const _ = require('lodash')

const config = require('./config')

const mime = require('mime')
const multer = require('multer')
const upload = multer({dest: config.filesDir})

const passport = require('passport')
const express = require('express')

/**
 Main router for the Versus server. This provides the main
 interface for the RPC-JSON api architecture.

 As well the server provides a generic file upload/download
 that will store files directly on the server, which will be
 available for the web-client via a get call
 */

// the router is defined here, and exported for the main express app
const router = express.Router()
module.exports = router

// the remote functions availabe for the RPC-JSON api
const remoteRunFns = require('./handler')

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
router.post('/api/rpc-run', (req, res, next) => {
  let params = req.body.params
  let method = req.body.method
  console.log(`>> router.rpc-run.${method}`)

  if (method === 'publicLoginUser') {
    req.body.email = params[0].email
    req.body.password = params[0].password

    passport.authenticate('local', (err, user) => {
      if (err) {
        console.log('>> router.rpc-run.publicLoginUser authenticate error')
        return next(err)
      }
      if (!user) {
        console.log('>> router.rpc-run.publicLoginUser no user found')
        return res.json({
          error: {
            code: -1,
            message: 'user/password not found'
          },
          jsonrpc: '2.0'
        })
      }
      req.logIn(user, (error) => {
        if (error) {
          console.log('>> router.rpc-run.publicLoginUser session publicLoginUser error', err)
          return next(error)
        }
        console.log('>> router.rpc-run.publicLoginUser success', user)
        let returnUser = _.cloneDeep(user)
        delete returnUser.password
        return res.json({
          result: {
            success: true,
            user: returnUser
          },
          jsonrpc: '2.0'
        })
      })
    })(req, res, next)
  } else if (method === 'publicLogoutUser') {
    req.session.destroy()
    req.logout()
    res.json({
      result: {
        success: true
      },
      jsonrpc: '2.0'
    })
  } else if (method in remoteRunFns) {
    if (!_.startsWith(method, 'public')) {
      if (!req.isAuthenticated || !req.isAuthenticated()) {
        throw new Error(`Not logged in`)
      }
    }

    const runFn = remoteRunFns[method]

    runFn(...params)
      .then(result => {
        res.json({
          result,
          jsonrpc: '2.0'
        })
      })
      .catch(e => {
        console.log(e.toString())
        res.json({
          error: {
            code: -1,
            message: e.toString()
          },
          jsonrpc: '2.0'
        })
      })
  } else {
    res.json({
      error: {
        code: -1,
        message: `Remote runFn ${method} not found`
      },
      jsonrpc: '2.0'
    })
  }
})

/**
 * Upload file handlers, sends to 'upload*' function with the
 * implicit first argument, a filelist of the uploaded files.
 */
router.post('/api/rpc-upload', upload.array('uploadFiles'), (req, res) => {
  let method = req.body.method
  let params = JSON.parse(req.body.params)

  console.log('>> router.rpc-upload.' + method)

  if (method in remoteRunFns) {
    if (!method.toLowerCase().includes('upload')) {
      throw new Error(`Remote uploadFn ${method} should start with 'upload'`)
    }
    const uploadFn = remoteRunFns[method]
    params = _.concat([req.files], params)
    uploadFn(...params)
      .then(result => {
        res.json({
          result,
          jsonrpc: '2.0'
        })
      })
      .catch(e => {
        console.log(e.toString())
        res.json({
          error: {
            code: -1,
            message: e.toString()
          },
          jsonrpc: '2.0'
        })
      })
  } else {
    res.json({
      error: {
        code: -1,
        message: `Remote uploadFn ${method} not found`
      },
      jsonrpc: '2.0'
    })
  }
})

/**
 * Upload file handlers, sends to 'upload*' function with the
 * implicit first argument, a filelist of the uploaded files.
 */
router.post('/api/rpc-download', (req, res) => {
  let method = req.body.method
  let params = req.body.params

  console.log('>> router.rpc-download.' + method, params)

  if (method in remoteRunFns) {
    if (!method.toLowerCase().includes('download')) {
      throw new Error(`Remote download ${method} should start with 'download'`)
    }

    const downloadFn = remoteRunFns[method]

    downloadFn(...params)
      .then(result => {
        console.log('result', result)
        res.set('data', JSON.stringify({
          result: result.data,
          jsonrpc: '2.0'
        }))
        res.set('filename', path.basename(result.filename))
        res.set('Access-Control-Expose-Headers', 'data, filename')
        res.download(result.filename)
      })
      .catch(e => {
        let error = {
          code: -1,
          message: e.toString()
        }
        console.log(e.toString())
        res.set('data', JSON.stringify({
          error,
          jsonrpc: '2.0'
        }))
        res.set('Access-Control-Expose-Headers', 'data, filename')
      })
  } else {
    let error = {
      code: -1,
      message: `Remote uploadFn ${method} not found`
    }
    res.set('data', JSON.stringify({
      error,
      jsonrpc: '2.0'
    }))
    res.set('Access-Control-Expose-Headers', 'data')
  }
})

// /**
//  * Returns a file stored on the server
//  */
// router.get('/file/:subDir/:basename', (req, res) => {
//   let basename = req.params.basename
//   let subDir = req.params.subDir
//   console.log('>> router.file', subDir, basename)
//
//   let filename = path.join(config.filesDir, subDir, basename)
//   if (!fs.existsSync(filename)) {
//     throw `File not found ${filename}`
//   }
//
//   let mimeType = mime.lookup(filename)
//
//   res.setHeader('Content-disposition', `attachment; filename=${basename}`)
//   res.setHeader('Content-type', mimeType)
//   fs.createReadStream(filename).pipe(res)
// })
//
