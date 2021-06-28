const path = require('path')

const Koa = require('koa')
const koaBody = require('koa-body')
const Router = require('koa-router')
const cors = require('@koa/cors')
const send = require('koa-send')
const serve = require('koa-static')

const destroyable = require('server-destroy')
const http = require('http')

const { openUrlInBackground } = require('./url.js')
const handlers = require('./handlers.js')

const appDir = path.join(path.dirname(__filename), '../..')
const config = require(path.join(appDir, `config.json`))
const clientDir = path.join(appDir, `${config.clientDir}`)
const port = config.port
const host = config.host

for (let [k, v] of Object.entries(config)) {
  handlers.setConfig(k, v)
}

const router = new Router()

router.get('/', async context => {
  await send(context, 'index.html', { root: clientDir })
})

/**
 * RPC receiver for a web-client.
 *
 * Requests to run functions on the server are received from the post-body
 * using the JSON-RPC format:
 *
 *  payload = {
 *     'method': {string} - name of fn in `handlers`
 *     'params': {[Any]} - parameters of fn
 *     'jsonrpc': '2.0',
 *     'id': {string} - id of request
 *   }
 *
 * This can be tested in a terminal:
 *
 *    `curl -H "Content-Type: application/json" -X POST --data '{<payload>}' http://<url>`n
 *
 * Say, to run myFunction on the server remotely, the calling code
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
 *          result: {any} - result returned from the function
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
router.post('/rpc-run', async context => {
  const requestBody = context.request.body
  let responseBody
  if (requestBody) {
    let method = requestBody?.method
    let id = requestBody?.id
    let params = requestBody?.params
    if (!(method in handlers)) {
      const message = `Method not found: ${method}`
      console.log(`rpc-run [error]: ${message}`)
      responseBody = { error: { message, code: -32601 }, jsonrpc: '2.0', id }
    } else {
      let fn = handlers[method]
      console.log(`rpc-run ${method}`, params)
      try {
        responseBody = { result: await fn(...params), jsonrpc: '2.0', id }
      } catch (e) {
        console.log(`rpc-run ${method} [excpetion]: ${e}`)
        responseBody = {
          error: { message: `${e}`, code: -32603 },
          jsonrpc: '2.0',
          id
        }
      }
    }
  } else {
    console.log(`rpc-run couldn't read post body`)
    responseBody = {
      error: { message: 'Parse error', code: -32700 },
      jsonrpc: '2.0'
    }
  }
  context.response.body = responseBody
})

const app = new Koa()
app.use(koaBody())
app.use(cors())
app.use(router.routes())
app.use(router.allowedMethods())
app.use(serve(clientDir))

const args = process.argv;
if (args.includes("-o")) {
  openUrlInBackground(`http://${host}:${port}`)
}
console.log(`Listening on http://${host}:${port}`)

const server = http.createServer(app.callback())
server.listen(port)
destroyable(server)
