
import $ from "jquery";
import _ from "lodash";


// Utility functions


function exists(x) {
  return typeof x !== 'undefined';
}


function url() {
  return "" + window.location;
}


function pos_dom(in_dom) {
  var curr_dom = in_dom;
  var curr_left = 0;
  var curr_top = 0;
  if (curr_dom.offsetParent) {
    curr_left = curr_dom.offsetLeft;
    curr_top = curr_dom.offsetTop;
    while (curr_dom = curr_dom.offsetParent) {
      curr_left += curr_dom.offsetLeft;
      curr_top += curr_dom.offsetTop;
    }
  }
  curr_dom = in_dom;
  do {
    curr_left -= curr_dom.scrollLeft || 0;
    curr_top -= curr_dom.scrollTop || 0;
  } while (curr_dom = curr_dom.parentNode);
  return [curr_left, curr_top];
}


function link_button(id_tag, html_text, class_tag, click) {
  var item = 
    $('<a>')
      .attr('id', id_tag)
      .attr('href', '')
      .html(html_text);

  if (class_tag) {
    item.addClass(class_tag);
  }

  if (click) {
    item.on(' click touch ',
      function(e) { 
        e.preventDefault();
        click(); 
      }
    );
  }

  return item;
}


function toggle_button(
  id_tag, html_text, class_tag, get_toggle, toggle, onColor) {
  var item = 
    $('<a>')
      .attr('id', id_tag)
      .attr('href', '')
      .html(html_text);

  var color = function() {
    if (get_toggle()) {
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

  if (class_tag) {
    item.addClass(class_tag);
  }

  item.click(
    function(e) {
      e.preventDefault();
      toggle(!get_toggle()); 
      color();
      return false; 
    }
  );

  item.redraw = color;

  color();
  
  return item;
}


function create_edit_box_div(init_text, width, change, cleanup, label) {

  var accept_edit = function() { 
    change(textarea.val());
    cleanup();
    window.keyboard_lock = false;
  }

  var discard_edit = function() {
    cleanup();
    window.keyboard_lock = false;
  }

  var save_button = link_button(
      'okay', 'okay', 'jolecule-small-button', accept_edit);

  var discard_button = link_button(
      'discard', 'discard', 'jolecule-small-button', discard_edit);

  var textarea = $("<textarea>")
    .css('width', width)
    .addClass('jolecule-view-text')
    .text(init_text)
    .keydown(
      function(e) {
        if (e.keyCode == 27) {
          discard_edit();
        return true;
      }
    })

  if (!label) {
    label = '';
  }

  window.keyboard_lock = true;

  return $('<div>')
    .css('width', width)
    .append(label)
    .append(textarea)
    .append(save_button)
    .append(' ')
    .append(discard_button);
}



function stick_in_top_left(parent, target, x_offset, y_offset) {
  target.css({
    'position':'absolute',
    'z-index':'9000'
  });
  var top = parent.position().top;
  var left = parent.position().left;
  parent.append(target);
  // var w_parent = parent.outerWidth();
  // var h_parent = parent.outerHeight();
  // target.width(w_parent - 2*x_offset);
  // target.height(h_parent - 2*y_offset);
  target.css({
      'top': top + y_offset,
      'left': left + x_offset,
  });
}


function stick_in_center(parent, target, x_offset, y_offset) {
  target.css({
    'position':'absolute',
    'z-index':'9000'
  });
  var top = parent.position().top;
  var left = parent.position().left;
  var w_parent = parent.outerWidth();
  var h_parent = parent.outerHeight();
  parent.prepend(target);
  var w_target = target.outerWidth();
  var h_target = target.outerHeight();
  target.css({
      'top': top + h_parent/2 - h_target/2 - y_offset,
      'left': left + w_parent/2 - w_target/2 - x_offset,
  });
}


function in_array(v, w_list) {
  return w_list.indexOf(v) >= 0;
}


function trim(text) {
  return text.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}


function clone_dict(d) {
  var new_d = {};
  for (var k in d) {
    new_d[k] = d[k];
  };
  return new_d;
}


function clone_list_of_dicts(list_of_dicts) {
  var new_list = [];
  for (var i=0; i<list_of_dicts.length; i+= 1) {
    new_list.push(clone_dict(list_of_dicts[i]));
  }
  return new_list;
}


function random_string(n_char) {
	var chars = 
	   "0123456789abcdefghiklmnopqrstuvwxyz";
	var s = '';
	for (var i=0; i<n_char; i++) {
		var j = Math.floor(Math.random()*chars.length);
		s += chars.substring(j,j+1);
	}
	return s;
}


function random_id() {
  return 'view:' + random_string(6);
}


function get_current_date() {
  var current_view = new Date();
  var month = current_view.getMonth() + 1;
  var day = current_view.getDate();
  var year = current_view.getFullYear();
  return day + "/" + month + "/" + year;
}


export {
    exists,
    url,
    pos_dom,
    link_button,
    toggle_button,
    create_edit_box_div,
    stick_in_top_left,
    stick_in_center,
    in_array,
    trim,
    clone_dict,
    clone_list_of_dicts,
    random_id,
    get_current_date,
}