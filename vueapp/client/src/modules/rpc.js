import axios from 'axios'
import config from '../config'
import saveAs from 'file-saver'

/**
 * @fileOverview rpc module provides a clean rpc interface for JSON-based
 * api with the server.
 */

// important for using with passport.js
// https://stackoverflow.com/questions/40941118/axios-wont-send-cookie-ajax-xhrfields-does-just-fine
axios.defaults.withCredentials = true

export default {

  async rpcRun (method, ...params) {
    let payload = {method, params, jsonrpc: '2.0'}

    console.log('> rpc.rpcRun', method, ...params)

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
  },

  async rpcUpload (method, files, ...params) {
    let formData = new FormData()
    formData.append('method', method)
    formData.append('params', JSON.stringify(params))
    formData.append('jsonrpc', '2.0')

    for (let f of files) {
      formData.append('uploadFiles', f, f.name)
    }

    console.log('> rpc.rpcUpoad', method, files, ...params)

    try {
      let response = await axios.post(`${config.apiUrl}/api/rpc-upload`, formData)
      return response.data
    } catch (e) {
      return {
        error: {
          code: -32000,
          message: e.toString()
        }
      }
    }
  },

  async rpcDownload (method, ...params) {
    let payload = {method, params, jsonrpc: '2.0'}

    console.log('> rpc.rpcDownload', ...params)

    try {
      let response = await axios.post(`${config.apiUrl}/api/rpc-download`, payload)
      let filename = response.headers.filename
      let data = JSON.parse(response.headers.data)
      console.log('> rpc.rpcDownload response', data)
      if (!data.error) {
        let blob = new Blob([response.data])
        saveAs.saveAs(blob, (filename))
      }
      return data
    } catch (e) {
      return {
        error: {
          code: -32000,
          message: e.toString()
        }
      }
    }
  }

}
