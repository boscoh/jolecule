const _ = require('lodash')
const path = require('path')

module.exports = {

  /**
   * Returns a nicely formatted string of JSON-literal
   * @param o
   */
  jstr (o) {
    return JSON.stringify(o, null, 2)
  },

  /**
   * In-place removal of item from a list of dictionaries, using the key
   * to make the comparison for equality for the item
   * @param aList
   * @param item
   * @param key
   */
  removeItem (aList, item, key) {
    const iLast = aList.length - 1
    for (let i = iLast; i >= 0; i -= 1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  },

  /**
   * Returns an n-length array of v values
   * @param n
   * @param v
   * @returns {Array}
   */
  makeArray (n, v) {
    let l = []
    for (let i = 0; i < n; i += 1) {
      l.push(v)
    }
    return l
  },

  delay (time) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(time) }, time)
    })
  },

  /**
   * Checks if str is a sub-string in any string of a list
   * of tesStrList
   * @param str
   * @param testStrList
   * @returns {boolean}
   */
  isStringInStringList (str, testStrList) {
    for (let testStr of testStrList) {
      if (_.includes(testStr, str)) {
        return true
      }
    }
    return false
  },

  getCurrentTimeStr () {
    let date = new Date()
    return date.toJSON()
  },

  extractId (p, delimiter = '_', iToken = 0) {
    let ext = path.extname(p)
    let base = path.basename(p, ext)
    let tokens = base.split(delimiter)
    if (tokens.length > iToken) {
      return tokens[iToken]
    } else {
      return ''
    }
  }

}
