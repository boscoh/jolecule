/**
 *
 * Utility functions mainly to do with HTML elements
 * that can be deferred to functions
 *
 */

import $ from 'jquery'
import _ from 'lodash'

function exists (x) {
    return !_.isNil(x)
}

function linkButton (text, classTag, callback) {
    return $('<span>')
        .html(text)
        .addClass(classTag)
        .on('click touch', function (e) {
            e.preventDefault()
            callback()
        })
}

function stickJqueryDivInTopLeft (parent, target, xOffset, yOffset) {
    target.css({
        position: 'absolute',
        'z-index': '2',
    })
    let top = parent.position().top
    let left = parent.position().left
    parent.append(target)
    // target.css({
    //   top: top + yOffset,
    //   left: left + xOffset
    // })
    target.css({
        top: yOffset,
        left: xOffset,
    })
}

function stickJqueryDivInCenter (parent, target, xOffset, yOffset) {
    target.css({
        position: 'absolute',
        'z-index': '2',
    })
    let top = parent.position().top
    let left = parent.position().left
    top = 0
    left = 0
    let widthParent = parent.outerWidth()
    let heightParent = parent.outerHeight()
    parent.prepend(target)
    let widthTarget = target.outerWidth()
    let heightTarget = target.outerHeight()
    target.css({
        top: top + heightParent / 2 - heightTarget / 2 - yOffset,
        left: left + widthParent / 2 - widthTarget / 2 - xOffset,
    })
}

function stickJqueryDivInBottomLeft (parent, target, xOffset, yOffset) {
    target.css({
        position: 'absolute',
        'z-index': '9000',
    })
    let top = parent.position().top
    let left = parent.position().left
    let heightParent = parent.outerHeight()
    parent.prepend(target)
    let heightTarget = target.outerHeight()
    target.css({
        top: top + heightParent - heightTarget - yOffset,
        left: left + xOffset,
    })
}

function inArray (v, aList) {
    return aList.indexOf(v) >= 0
}

function randomString (nChar) {
    let chars = '0123456789abcdefghiklmnopqrstuvwxyz'
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

function textEntryDialog (parentDiv, label, callback) {
    if (!label) {
        label = ''
    }

    window.keyboardLock = true

    function cleanup () {
        dialog.remove()
        window.keyboardLock = false
    }

    function accept () {
        callback(textarea.val())
        cleanup()
        window.keyboardLock = false
    }

    function discard () {
        cleanup()
        window.keyboardLock = false
    }

    let saveButton = linkButton('okay', 'jolecule-small-button', accept)

    let discardButton = linkButton('discard', 'jolecule-small-button', discard)

    let textarea = $('<textarea>')
        .css('width', '100%')
        .css('margin-bottom', '0.5em')
        .addClass('jolecule-view-text')
        .keydown(function (e) {
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

    stickJqueryDivInCenter(parentDiv, dialog, 0, 20)

    setTimeout(() => {
        editbox.find('textarea').focus()
    }, 100)
}

function delay (timeMs) {
    return new Promise(resolve => {
        setTimeout(resolve, timeMs)
    })
}

/**
 * Copies to the clipboard https://stackoverflow.com/a/30810322
 */
function copyTextToClipboard (text) {
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

export {
    exists,
    linkButton,
    stickJqueryDivInCenter,
    stickJqueryDivInTopLeft,
    stickJqueryDivInBottomLeft,
    inArray,
    randomId,
    textEntryDialog,
    delay,
    copyTextToClipboard,
}
