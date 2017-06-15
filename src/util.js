
import $ from "jquery";
import _ from "lodash";


// Utility functions


function exists(x) {
  return !(_.isUndefined(x)) && (x !== null);
}


function getWindowUrl() {
  return "" + window.location;
}


function getDomPosition(dom) {
  var currDom = dom;
  var currLeft = 0;
  var currTop = 0;
  if (currDom.offsetParent) {
    currLeft = currDom.offsetLeft;
    currTop = currDom.offsetTop;
    while (currDom = currDom.offsetParent) {
      currLeft += currDom.offsetLeft;
      currTop += currDom.offsetTop;
    }
  }
  currDom = dom;
  do {
    currLeft -= currDom.scrollLeft || 0;
    currTop -= currDom.scrollTop || 0;
  } while (currDom = currDom.parentNode);
  return [currLeft, currTop];
}


function linkButton(idTag, text, classTag, callback) {
  var item = 
    $('<a>')
      .attr('id', idTag)
      .attr('href', '')
      .html(text);

  if (classTag) {
    item.addClass(classTag);
  }

  if (callback) {
    item.on(' click touch ',
      function(e) { 
        e.preventDefault();
        callback(); 
      }
    );
  }

  return item;
}


function toggleButton(
  idTag, text, classTag, getToggleFn, setToggleFn, onColor) {

  var item =
    $('<a>')
      .attr('id', idTag)
      .attr('href', '')
      .html(text);

  function color() {
    if (getToggleFn()) {
      if (onColor) {
        item.css('background-color', onColor);
      } else {
        item.addClass('jolecule-button-toggle-on');
      }
    } else {
      if (onColor) {
        item.css('background-color', '');
      } else {
        item.removeClass('jolecule-button-toggle-on');
      }
    }
  }

  if (classTag) {
    item.addClass(classTag);
  }

  item.click(
    function(e) {
      e.preventDefault();
      setToggleFn(!getToggleFn()); 
      color();
      return false; 
    }
  );

  item.redraw = color;

  color();
  
  return item;
}




function stickJqueryDivInTopLeft(parent, target, xOffset, yOffset) {
  target.css({
    'position':'absolute',
    'z-index':'9000'
  });
  var top = parent.position().top;
  var left = parent.position().left;
  parent.append(target);
  target.css({
      'top': top + yOffset,
      'left': left + xOffset
  });
}


function stickJqueryDivInCenter(parent, target, xOffset, yOffset) {
  target.css({
    'position':'absolute',
    'z-index':'9000'
  });
  var top = parent.position().top;
  var left = parent.position().left;
  var widthParent = parent.outerWidth();
  var heightParent = parent.outerHeight();
  parent.prepend(target);
  var widthTarget = target.outerWidth();
  var heightTarget = target.outerHeight();
  target.css({
      'top': top + heightParent/2 - heightTarget/2 - yOffset,
      'left': left + widthParent/2 - widthTarget/2 - xOffset,
  });
}


function inArray(v, aList) {
  return aList.indexOf(v) >= 0;
}


function randomString(n_char) {
	var chars = 
	   "0123456789abcdefghiklmnopqrstuvwxyz";
	var s = '';
	for (var i=0; i<n_char; i++) {
		var j = Math.floor(Math.random()*chars.length);
		s += chars.substring(j,j+1);
	}
	return s;
}


function randomId() {
  return 'view:' + randomString(6);
}


function getCurrentDateStr() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  var year = now.getFullYear();
  return day + "/" + month + "/" + year;
}


export {
  exists,
  getWindowUrl,
  getDomPosition,
  linkButton,
  toggleButton,
  stickJqueryDivInTopLeft,
  stickJqueryDivInCenter,
  inArray,
  randomId,
  getCurrentDateStr,
}