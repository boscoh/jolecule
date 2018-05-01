/**
 *
 * Utility functions mainly to do with HTML elements
 * that can be deferred to functions
 *
 */

import $ from 'jquery'
import _ from 'lodash'

function exists (x) {
  return !(_.isUndefined(x)) && (x !== null)
}

function extendArray (array, extension) {
  for (let elem of extension) {
    array.push(elem)
  }
}

function getWindowUrl () {
  return '' + window.location
}

function linkButton (idTag, text, classTag, callback) {
  let item =
    $('<a>')
      .attr('id', idTag)
      .attr('href', '')
      .html(text)

  if (classTag) {
    item.addClass(classTag)
  }

  if (callback) {
    item.on(' click touch ',
      function (e) {
        e.preventDefault()
        callback()
      }
    )
  }

  return item
}

function toggleButton (idTag, text, classTag, getToggleFn, setToggleFn, onColor) {
  let item =
    $('<a>')
      .attr('id', idTag)
      .attr('href', '')
      .html(text)

  function color () {
    if (getToggleFn()) {
      if (onColor) {
        item.css('background-color', onColor)
      } else {
        item.addClass('jolecule-button-toggle-on')
      }
    } else {
      if (onColor) {
        item.css('background-color', '')
      } else {
        item.removeClass('jolecule-button-toggle-on')
      }
    }
  }

  if (classTag) {
    item.addClass(classTag)
  }

  item.click(
    function (e) {
      e.preventDefault()
      setToggleFn(!getToggleFn())
      color()
      return false
    }
  )

  item.redraw = color

  color()

  return item
}

function stickJqueryDivInTopLeft (parent, target, xOffset, yOffset) {
  target.css({
    'position': 'absolute',
    'z-index': '9000'
  })
  let top = parent.position().top
  let left = parent.position().left
  parent.append(target)
  target.css({
    'top': top + yOffset,
    'left': left + xOffset
  })
}

function stickJqueryDivInCenter (parent, target, xOffset, yOffset) {
  target.css({
    'position': 'absolute',
    'z-index': '9000'
  })
  let top = parent.position().top
  let left = parent.position().left
  let widthParent = parent.outerWidth()
  let heightParent = parent.outerHeight()
  parent.prepend(target)
  let widthTarget = target.outerWidth()
  let heightTarget = target.outerHeight()
  target.css({
    'top': top + heightParent / 2 - heightTarget / 2 - yOffset,
    'left': left + widthParent / 2 - widthTarget / 2 - xOffset
  })
}

function inArray (v, aList) {
  return aList.indexOf(v) >= 0
}

function randomString (nChar) {
  let chars =
    '0123456789abcdefghiklmnopqrstuvwxyz'
  let s = ''
  for (let i = 0; i < nChar; i++) {
    let j = Math.floor(Math.random() * chars.length)
    s += chars.substring(j, j + 1)
  }
  return s
}

function randomId () {
  return 'view:' + randomString(6)
}

function getCurrentDateStr () {
  let now = new Date()
  let month = now.getMonth() + 1
  let day = now.getDate()
  let year = now.getFullYear()
  return day + '/' + month + '/' + year
}

function textEntryDialog (parentDiv, label, callback) {
  if (!label) {
    label = ''
  }

  window.keyboard_lock = true

  function cleanup () {
    dialog.remove()
    window.keyboard_lock = false
  }

  function accept () {
    callback(textarea.val())
    cleanup()
    window.keyboard_lock = false
  }

  function discard () {
    cleanup()
    window.keyboard_lock = false
  }

  let saveButton = linkButton(
    'okay', 'okay', 'jolecule-small-button', accept)

  let discardButton = linkButton(
    'discard', 'discard', 'jolecule-small-button', discard)

  let textarea = $('<textarea>')
    .css('width', '100%')
    .addClass('jolecule-view-text')
    .keydown(
      function (e) {
        if (e.keyCode === 27) {
          discard()
          return true
        }
      })

  let editbox = $('<div>')
    .css('width', '100%')
    .append(label)
    .append(textarea)
    .append(saveButton)
    .append(' ')
    .append(discardButton)

  let dialog = $('<div>')
    .addClass('jolecule-dialog')
    .css('display', 'block')
    .css('z-index', '2000')
    .css('width', Math.min(400, parentDiv.width() - 100))
    .append(editbox)

  stickJqueryDivInCenter(parentDiv, dialog, 0, 70)

  setTimeout(() => {
    editbox.find('textarea').focus()
  }, 100)
}

function delay (timeMs) {
  return new Promise(resolve => { setTimeout(resolve, timeMs) })
}

export {
  exists,
  extendArray,
  getWindowUrl,
  linkButton,
  toggleButton,
  stickJqueryDivInCenter,
  stickJqueryDivInTopLeft,
  inArray,
  randomId,
  getCurrentDateStr,
  textEntryDialog,
  delay
}
