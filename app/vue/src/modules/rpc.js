import _ from 'lodash'
import config from '../../../config.json'

const remoteUrl = config.apiUrl

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
  console.log(`rpc-run ${method} send: :`, _.cloneDeep(params))
  try {
    const payload = { method, params, jsonrpc: '2.0', id }
    if ('electron' in window) {
      return await window.electron.rpc(payload)
    } else {
      const fetchResponse = await fetch(remoteUrl, {
        method: 'post',
        mode: 'cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      let response = await fetchResponse.json()
      if (_.has(response, 'result')) {
        console.log(`rpc-run ${method} result:`, _.cloneDeep(response.result))
      } else {
        console.log(`rpc-run ${method} server-error:`, _.cloneDeep(response.error))
      }
      return response
    }
  } catch (e) {
    console.log(`rpc-run ${method} fail: ${e}`)
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
