/**
 *
 * Utility functions mainly to do with HTML elements
 * that can be deferred to functions
 *
 */

import $ from 'jquery'
import _ from 'lodash'

function exists(x) {
  return !_.isNil(x)
}

function linkButton(text, classTag, callback) {
  return $('<span>')
    .html(text)
    .addClass(classTag)
    .on('click touch', function(e) {
      e.preventDefault()
      callback()
    })
}

function stickJqueryDivInTopLeft(parent, target, xOffset, yOffset) {
  target.css({
    position: 'absolute',
    'z-index': '2'
  })
  let top = parent.position().top
  let left = parent.position().left
  parent.append(target)
  target.css({
    top: top + yOffset,
    left: left + xOffset
  })
}

function stickJqueryDivInCenter(parent, target, xOffset, yOffset) {
  target.css({
    position: 'absolute',
    'z-index': '2'
  })
  let top = parent.position().top
  let left = parent.position().left
  let widthParent = parent.outerWidth()
  let heightParent = parent.outerHeight()
  parent.prepend(target)
  let widthTarget = target.outerWidth()
  let heightTarget = target.outerHeight()
  target.css({
    top: top + heightParent / 2 - heightTarget / 2 - yOffset,
    left: left + widthParent / 2 - widthTarget / 2 - xOffset
  })
}

function stickJqueryDivInBottomLeft(parent, target, xOffset, yOffset) {
  target.css({
    position: 'absolute',
    'z-index': '9000'
  })
  let top = parent.position().top
  let left = parent.position().left
  let heightParent = parent.outerHeight()
  parent.prepend(target)
  let heightTarget = target.outerHeight()
  target.css({
    top: top + heightParent - heightTarget - yOffset,
    left: left + xOffset
  })
}

function inArray(v, aList) {
  return aList.indexOf(v) >= 0
}

function randomString(nChar) {
  let chars = '0123456789abcdefghiklmnopqrstuvwxyz'
  let s = ''
  for (let i = 0; i < nChar; i++) {
    let j = Math.floor(Math.random() * chars.length)
    s += chars.substring(j, j + 1)
  }
  return s
}

function randomId() {
  return 'view:' + randomString(6)
}

function textEntryDialog(parentDiv, label, callback) {
  if (!label) {
    label = ''
  }

  window.keyboardLock = true

  function cleanup() {
    dialog.remove()
    window.keyboardLock = false
  }

  function accept() {
    callback(textarea.val())
    cleanup()
    window.keyboardLock = false
  }

  function discard() {
    cleanup()
    window.keyboardLock = false
  }

  let saveButton = linkButton('okay', 'jolecule-small-button', accept)

  let discardButton = linkButton('discard', 'jolecule-small-button', discard)

  let textarea = $('<textarea>')
    .css('width', '100%')
    .css('margin-bottom', '0.5em')
    .addClass('jolecule-view-text')
    .keydown(function(e) {
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

function delay(timeMs) {
  return new Promise(resolve => {
    setTimeout(resolve, timeMs)
  })
}

export {
  exists,
  linkButton,
  stickJqueryDivInCenter,
  stickJqueryDivInTopLeft,
  stickJqueryDivInBottomLeft,
  inArray,
  randomId,
  textEntryDialog,
  delay
}
