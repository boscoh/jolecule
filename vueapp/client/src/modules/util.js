import _ from 'lodash'

export default {

  jstr (o) {
    return JSON.stringify(o, null, 2)
  },

  /**
   * In-place deletion of item from a list. Assumes item is an object
   * and key gives the field that identifies the item
   * @param {Array} aList - an array of items
   * @param {Object} item - target item
   * @param {String} key - field in item for identification
   */
  removeItem (aList, item, key) {
    for (let i = aList.length - 1; i >= 0; i -= 1) {
      if (aList[i][key] === item[key]) {
        aList.splice(i, 1)
      }
    }
  },

  /**
   * Download a string into fname on the browser
   * @param {String} filename
   * @param {String} s - contents of file
   */
  downloadFile (filename, s) {
    let data = 'text/json;charset=utf-8,' + encodeURIComponent(s)

    let a = document.createElement('a')
    a.href = 'data:' + data
    a.download = 'data.json'
    a.innerHTML = 'download JSON'

    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  },

  delay (time) {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(time) }, time)
    })
  },

  /**
   * Creates an n-length array of v values
   * @returns {Array}
   */
  makeArray (n, v) {
    let l = []
    for (let i = 0; i < n; i += 1) {
      l.push(v)
    }
    return l
  },

  isStringInStringList (str, testStrList) {
    for (let testStr of testStrList) {
      if (_.includes(str, testStr)) {
        return true
      }
    }
    return false
  },

  /**
   * Copies to the clipboard https://stackoverflow.com/a/30810322
   */
  copyTextToClipboard (text) {
    let textArea = document.createElement('textarea')

    //
    // *** This styling is an extra step which is likely not required. ***
    //
    // Why is it here? To ensure:
    // 1. the element is able to have focus and selection.
    // 2. if element was to flash render it has minimal visual impact.
    // 3. less flakyness with selection and copying which **might** occur if
    //    the textarea element is not visible.
    //
    // The likelihood is the element won't even render, not even a flash,
    // so some of these are just precautions. However in IE the element
    // is visible whilst the popup box asking the user for permission for
    // the web page to copy to the clipboard.
    //

    // Place in top-left corner of screen regardless of scroll position.
    textArea.style.position = 'fixed'
    textArea.style.top = 0
    textArea.style.left = 0

    // Ensure it has a small width and height. Setting to 1px / 1em
    // doesn't work as this gives a negative w/h on some browsers.
    textArea.style.width = '2em'
    textArea.style.height = '2em'

    // We don't need padding, reducing the size if it does flash render.
    textArea.style.padding = 0

    // Clean up any borders.
    textArea.style.border = 'none'
    textArea.style.outline = 'none'
    textArea.style.boxShadow = 'none'

    // Avoid flash of white box if rendered for any reason.
    textArea.style.background = 'transparent'

    textArea.value = text

    document.body.appendChild(textArea)

    textArea.select()

    try {
      let successful = document.execCommand('copy')
      let msg = successful ? 'successful' : 'unsuccessful'
      console.log('> copyTextToClipboard', msg)
    } catch (err) {
      console.log('> copyTextToClipboard failed')
    }

    document.body.removeChild(textArea)
  }

}
