// Utility functions

function url() {
  return "" + window.location;
}


function in_array(v, w_list) {
  for (var k=0; k<w_list.length; k+=1) {
    if (v == w_list[k]) {
      return true;
    }
  }
  return false;
}


function del_from_array(x, x_list) {
  for (var i=0; i<=x_list.length; i+=1)
    if (x == x_list[i]) {
      x_list.splice(i, 1);
    }
}


function trim(text) {
  return text.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}


function do_nothing() {
  return false;
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


function equal_dicts(d, e) {
  for (var k in d) {
    if (!k in e) {
      return false;
    }
    if (d[k] != e[k]) {
      return false;
    }
  }
  return true;
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


