import axios from 'axios'
import config from '../config'

/**
 * @fileOverview rpc module provides a clean rpc interface for JSON-based
 * api with the server.
 */

// important for using with passport.js
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

async function run (method, ...params) {
  let payload = { method, params, jsonrpc: '2.0' }

  console.log('> rpc.run', method, ...params)

  try {
    let response = await axios.post(`${config.apiUrl}/api/rpc-run`, payload)
    return response.data
  } catch (e) {
    return {
      error: {
        code: -32000,
        message: e.toString()
      }
    }
  }
}

class RpcClass {
  constructor () {
    return new Proxy(this, {
      get (target, prop) {
        return async function () {
          return await run(prop, ...arguments)
        }
      }
    })
  }
}
const remote = new RpcClass()

export { run, remote }
