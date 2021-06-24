import config from '../../../config.json'
const remoteUrl = `http://${config.host}:${config.port}/${config.apiUrl}`
import _ from 'lodash'

/**
 * RPC interface to talk to a function on a server.
 *
 * Say, to run myFunction on the server remotely, the calling code
 * is:
 *
 *   let response = await remote.myFunction(a, b)
 *
 * This will pass method=functionOnServer, params=[a, b] to the
 * rpc function, which will package the method & params and send them
 * to the server, then wait for the results
 *
 * The results from the server are then returned asyncronously to
 * the caller using the JSON-RPC format
 *
 * @returns {Promise} - which wraps:
 *   1. on success:
 *      {
 *        success: {
 *          result: {any} - result returned from myFunction on server
 *        }
 *      }
 *   2. on any error:
 *      {
 *        error: {
 *          code: {number},
 *          message: {string}
 *        }
 *      }
 */
async function rpc (method, ...params) {
  const id = Math.random()
    .toString(36)
    .slice(-6)
  console.log(`rpc-run send -> ${method}:`, _.cloneDeep(params))
  try {
    const payload = { method, params, jsonrpc: '2.0', id }
    if ('electron' in window) {
      return await window.electron.rpc(payload)
    } else {
      const response = await fetch(remoteUrl, {
        method: 'post',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      let result = await response.json()
      console.log(`rpc-run ${method} response:`, _.cloneDeep(result))
      return result
    }
  } catch (e) {
    console.log(`rpc-run [fail] ${method} ${e}`)
    return { error: { message: `${e}`, code: -32000 }, jsonrpc: '2.0', id }
  }
}

class RemoteRpcProxy {
  constructor () {
    return new Proxy(this, {
      get (target, prop) {
        return async function () {
          return await rpc(prop, ...arguments)
        }
      }
    })
  }
}

const remote = new RemoteRpcProxy()

export { remote }
