const fetch = require('node-fetch')
const util = require('util')
const exec = util.promisify(require('child_process').exec)

async function isReadableUrl (url) {
  try {
    await fetch(url, { method: 'GET' })
    return true
  } catch (e) {
    return false
  }
}

async function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function openUrlInBackground (url) {
  while (!(await isReadableUrl(url))) {
    await sleep(1000)
  }
  for (let sysCmd of ['open', 'start', 'xdg-open']) {
    try {
      await exec(`${sysCmd} ${url}`)
    } catch (e) {}
  }
}

module.exports.openUrlInBackground = openUrlInBackground
