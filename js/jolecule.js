//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


var keyboard_lock = false;

var protein;
var scene;
var controller;
var canvas;
var protein_display;
var annotations_display;
var sequence_display;
var option_display;


///////////////////////////////////////////////
// The annotations objects that keeps track of 
// the HTML5 controls on the browswer
///////////////////////////////////////////////

var AnnotationsDisplay = function(scene, controller) {
  this.scene = scene;
  this.controller = controller;
  this.div = {}; 
  
  this.save_view_to_server = function(view) {
    var flat_dict = this.controller.flat_dict_from_view(view)
    $.post('/ajax/save_view', flat_dict, do_nothing);
  }
  
  this.set_view_order = function(id, order) {
    var view = this.scene.saved_views_by_id[id];
    var a = this.div[id].all.find('a').eq(0);
    view.order = order;
    a.text(view.order);
    this.save_view_to_server(view);
  }

  this.reset_borders = function() {
    for (var id in this.div) {
      var last_id = this.scene.saved_views[this.scene.i_last_view].id;
      if (last_id == id) {
        this.div[id].all.removeClass("unselected");
        this.div[id].all.addClass("selected");
      } else {
        this.div[id].all.removeClass("selected");
        this.div[id].all.addClass("unselected");
      }
    }
  }

  this.set_target_by_view_id = function(id) {
    this.controller.set_target_view_by_id(id);
    this.reset_borders();
    var div = this.div[id].all;
    var top = $("#views");
    $("#views").scrollTo(div);
  }
  
  this.reset_goto_buttons = function() {
    for (var j=0; j<this.scene.saved_views.length; j+=1) {
      var view = this.scene.saved_views[j];
      var j_id = view.id;
      this.set_view_order(j_id, j);
    }
  }
  
  this.remove_view = function(id) {
    var this_item = this;
    var success = function() {
      this_item.controller.delete_view(id);
      this_item.div[id].all.remove();
      delete this_item.div[id];
      if (this_item.scene.i_last_view >= this_item.scene.saved_views.length) {
        this_item.scene.i_last_view = this_item.scene.saved_views.length-1;
      }
      this_item.reset_goto_buttons();
      this_item.reset_borders();
    }
    $.post(
         '/ajax/delete_view', 
         {'pdb_id': this.scene.protein.pdb_id, 'id':id}, 
         success);
  }

  this.remove_button = function(id) {
    var this_item = this;
    return $('<div>')
        .css({'float':'right'})
        .append($('<a>')
            .attr("href", "#delete"+id)
            .addClass("nav")
            .html("[delete]")
            .click(function() { 
              this_item.remove_view(id); 
              return false;
            }));
  }

  this.swap_up = function(i_id) {
    var i = this.scene.get_i_saved_view_from_id(i_id);
    if (i < 2) {
      return;
    }
    var j = i-1;
    var j_id = this.scene.saved_views[j].id;
    i_div = this.div[i_id].all;
    j_div = this.div[j_id].all;
    this.scene.saved_views[j].order = i;
    this.scene.saved_views[i].order = j;
    var dummy = this.scene.saved_views[j];
    this.scene.saved_views[j] = this.scene.saved_views[i];
    this.scene.saved_views[i] = dummy
    i_div.insertBefore(j_div);
    this.set_view_order(j_id, i);
    this.set_view_order(i_id, j);
  }

  this.swap_down = function(i_id) {
    var i = this.scene.get_i_saved_view_from_id(i_id);
    if (i > this.scene.saved_views.length-2) {
      return;
    }
    var j = i+1;
    var j_id = this.scene.saved_views[j].id;
    i_div = this.div[i_id].all;
    j_div = this.div[j_id].all;
    this.scene.saved_views[j].order = i;
    this.scene.saved_views[i].order = j;
    var dummy = this.scene.saved_views[j];
    this.scene.saved_views[j] = this.scene.saved_views[i];
    this.scene.saved_views[i] = dummy
    j_div.insertBefore(i_div);
    this.set_view_order(j_id, i);
    this.set_view_order(i_id, j);
  }

  this.goto_button = function(id, text) {
    var this_item = this;
    return $('<a>')
      .attr("href", "#"+id)
      .addClass("goto_button")
      .html(text)
      .click(function () { 
        var id = this.href.split('#')[1];
        this_item.set_target_by_view_id(id);
      });
  }

  this.edit_box = function(id) {
    var this_item = this;
    var view = this.scene.saved_views_by_id[id];
    this_item.div[id].edit_text = $("<textarea></textarea>")
      .addClass('annotation_text')
      .addClass('edit_box')
      .click(do_nothing);
    var save = $('<a></a>')
      .attr("href", "")
      .addClass("nav")
      .css({"margin-right":"10px"})
      .html("[save]")
      .click(
          function(event) { 
            var text = this_item.div[id].edit_text.val();
            this_item.div[id].show_text.html(text);
            keyboard_lock = false;
            this_item.div[id].edit.hide();
            this_item.div[id].show.show(); 
            view.text = text;
            this_item.save_view_to_server(view);
            return false; 
          });
    var discard = $('<a></a>')
      .addClass("nav")
      .css({"margin-right":"10px"})
      .attr("href", "").html("[discard]")
      .click(
          function(event) { 
            keyboard_lock = false;
            this_item.div[id].edit.hide();
            this_item.div[id].show.show(); 
            keyboard_lock = false;
            return false;
          });
    this_item.div[id].edit = $('<div></div>')
      .click(do_nothing)
      .append(this_item.div[id].edit_text)
      .append('<br>')
      .append(save)
      .append(' ')
      .append(discard)
      .hide();
    return this_item.div[id].edit;
  }

  this.show_box = function(id) {
    var this_item = this;
    var view = this.scene.saved_views_by_id[id];
    this_item.div[id].show_text = $('<div></div>')
        .addClass("annotation_text")
        .html(view.text)
    var edit_link = $('<a>')
        .attr("href", id)
        .css({"margin-right":"5px"})
        .addClass("nav")
        .html("[edit]")
        .click(
            function(event) { 
              if (!keyboard_lock) {
                this_item.set_target_by_view_id(id);
                this_item.div[id].edit_text.text(view.text);
                this_item.div[id].edit.show();
                this_item.div[id].show.hide(); 
                keyboard_lock = true;
              }
              return false; 
           })
    this_item.div[id].swap_up = $('<a>')
        .attr("href", id)
        .css({"margin-right":"5px"})
        .addClass("nav")
        .html("[up]")
        .click(
            function(event) { 
              this_item.swap_up(id);
              return false; 
           })
    this_item.div[id].swap_down = $('<a>')
        .attr("href", id)
        .css({"margin-right":"5px"})
        .addClass("nav")
        .html("[down]")
        .click(
            function(event) { 
              this_item.swap_down(id);
              return false; 
           })
    this_item.div[id].show = $('<div>')
      .append(this_item.div[id].show_text)
    if (view.order > 0) {
      this_item.div[id].show
          .append($('<div>')
              .addClass("author")
              .css({'display':'block'})
              .html('~ ' + view.creator + 
                    ' @' + view.time))
    }
    this_item.div[id].show.append($('<div>')
        .css({'float':'left','width':'15px'})
        .html('&nbsp;'))
    if ((id != 'view:000000') && (!view.lock)) {
      this_item.div[id].show
        .append(edit_link)
        .append(this_item.div[id].swap_up)
        .append(this_item.div[id].swap_down)
        .append(this.remove_button(id));
    }
    return this_item.div[id].show;
  }

  this.text_box = function(id) {
    this.div[id].text_box = $('<div></div>')
        .append(this.show_box(id))
        .append(this.edit_box(id))
    return this.div[id].text_box;
  }

  this.make_annotation_div = function(id) {
    var i = this.scene.get_i_saved_view_from_id(id);
    var view = this.scene.saved_views_by_id[id];
    var j = view.order;
    this.div[id] = {};
    this.div[id].all = $('<table></table>')
        .addClass("full_width")
    this.div[id].all.append(
        $('<td></td>').append($('<div>')
            .css({"width":"30px"})
            .append(this.goto_button(id, j))))
    this.div[id].all.append(
        $('<td></td>').append($('<div>')
            .css({"width":"240",
                  "padding-bottom":"10px"})
            .append(this.text_box(id))))
    return this.div[id].all;
  }

  this.make_new_annotation = function() {
    new_id = random_id();
    var j = this.controller.save_current_view(new_id);
    for (var i=j; i<this.scene.saved_views.length; i+=1) {
      this.save_view_to_server(this.scene.saved_views[i]);
    }
    var div = this.make_annotation_div(new_id);
    if (this.scene.i_last_view == this.scene.saved_views.length-1) {
      $("#views").append(div);
    } else {
      var j = this.scene.i_last_view-1;
      var j_id = this.scene.saved_views[j].id;
      var j_div = this.div[j_id].all;
      div.insertAfter(j_div);
    }
    this.reset_goto_buttons();
    this.reset_borders();
    $("#views").scrollTo(this.div[new_id].all);
  }

  this.goto_prev_view = function() {
    var scene = this.scene;
    scene.i_last_view -= 1;
    if (scene.i_last_view < 0) {
      scene.i_last_view = scene.saved_views.length - 1;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    this.set_target_by_view_id(id);
  }
  
  this.goto_next_view = function() {
    var scene = this.scene;
    scene.i_last_view += 1;
    if (scene.i_last_view >= scene.saved_views.length) {
      scene.i_last_view = 0;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    this.set_target_by_view_id(id);
  }

  this.create_annotations = function() {
    for (var i=0; i<this.scene.saved_views.length; i+=1) {
      var id = this.scene.saved_views[i].id;
      var div = this.make_annotation_div(id);
      $('#views').append(div);
    }
  }
  
  this.load_views_from_server = function(after_success) {
    var scene = this.scene;
    var annotations_display = this;
    var controller = this.controller;
    function success(data, textStatus, XMLHttpRequest) {
      var view_dicts = eval(data);
      controller.load_views_from_flat_views(view_dicts);
      annotations_display.create_annotations();
      hash_tag = url().split('#')[1];
      if (hash_tag in scene.saved_views_by_id) {
        annotations_display.set_target_by_view_id(hash_tag);
        scene.is_new_view_chosen = true;
      }
      annotations_display.reset_borders();
    }
    var pdb_id = this.scene.protein.pdb_id;
    $.get('/ajax/load_views_of_pdb/' + pdb_id, success);
  }
}


/////////////////////////////////////
// show option controls
/////////////////////////////////////


var OptionDisplay = function(scene, controller) {
  this.controller = controller;
  this.scene = scene;

  this.toggle = function(option) {
    this.set_show(
        option, !this.controller.get_show_option(option));
  }

  this.update = function() {
    var controller = this.controller;
    
    this.set_backbone = function(option) {
      $('#all_atom').attr('checked', false);
      $('#trace').attr('checked', false);
      $('#ribbon').attr('checked', false);
      $('#' + option).attr('checked', true);
      controller.set_backbone_option(option);
    }

    this.set_show = function(option, bool) {
      var check_id = 'input[name=' + option + ']';
      $(check_id).attr('checked', bool);
      controller.set_show_option(option, bool);
    }

    var show = this.scene.current_view.show;
    this.set_show('ligands', show.ligands);
    this.set_show('hydrogen', show.hydrogen);
    this.set_show('sidechain', show.sidechain);
    this.set_show('water', show.water);
    if (show.ribbon) {
      this.set_backbone('ribbon');
    } else if (show.trace) {
      this.set_backbone('trace');
    } else {
      this.set_backbone('all_atom');
    }
  }

  this.register_checkbox = function(name) {
    var check_id = 'input[name=' + name + ']';
    var scene = this.scene;
    $(check_id).click(function() { 
      var v = $(check_id + ':checked').val();
      scene.current_view.show[name] = v;
      scene.changed = true;
    });
    $(check_id).attr(
        'checked', scene.current_view.show[name]);
  }
  
  this.register_backbone = function() {
    var check_id = 'input[name=backbone]';
    var controller = this.controller;
    $(check_id).click(function() { 
      var v = $(check_id + ':checked').val();
      controller.set_backbone_option(v);
    });
  }
  
  this.register_checkbox('sidechain');
  this.register_checkbox('water');
  this.register_checkbox('hydrogen');
  this.register_checkbox('ligands');
  this.register_backbone();
}



// sequence bar with callbacks to move to
// any chosen residues


var SequenceDisplay = function(scene, controller) {
  this.scene = scene;
  this.protein = scene.protein;
  this.controller = controller;
  this.div = [];

  this.reset_borders = function() {
    for (var i=0; i<this.div.length; i+=1) {
      var res_id = this.protein.residues[i].id;
      if (res_id == this.scene.current_view.res_id) {
        this.div[i].target.removeClass("unselected");
        this.div[i].target.addClass("selected");
        $("#sequence").scrollTo(this.div[i].target);
      } else {
        this.div[i].target.removeClass("selected");
        this.div[i].target.addClass("unselected");
      }
    }
  }
  
  this.get_i_res_from_res_id = function(res_id) {
    for (var i=0; i<this.protein.residues.length; i+= 1) {
      if (this.protein.residues[i].id == res_id) {
        return i;
      }
    }
    return i;
  }
  
  this.goto_next_residue = function() {
    var res_id;
    if (this.scene.n_update_step >= 0) {
      res_id = this.scene.target_view.res_id;
    } else {
      res_id = this.scene.current_view.res_id;
    }
    var i = this.get_i_res_from_res_id(res_id);
    if (i>=this.protein.residues.length-1) {
      i = 0;
    } else {
      i += 1;
    };
    res_id = this.protein.residues[i].id
    this.controller.set_target_view_by_res_id(res_id);
    this.reset_borders();    
  }

  this.goto_prev_residue = function() {
    var res_id;
    if (this.scene.n_update_step >= 0) {
      res_id = this.scene.target_view.res_id;
    } else {
      res_id = this.scene.current_view.res_id;
    }
    var i = this.get_i_res_from_res_id(res_id);
    if (i<=0) {
      i = this.protein.residues.length-1;
    } else {
      i -= 1;
    };
    res_id = this.protein.residues[i].id
    this.controller.set_target_view_by_res_id(res_id);
    this.reset_borders();    
  }

  function html_pad(s, n_padded) {
    var trim_s = trim(s)
    var n = (n_padded - trim_s.length);
    var padded_s = trim_s;
    for (var k=0; k<n; k++) {
      padded_s += '&nbsp;';
    }
    return padded_s;
  }
  
  this.set_residue_select = function(res_id, v) {
    this.protein.res_by_id[res_id].selected = v;
    var i = this.get_i_res_from_res_id(res_id);
    if (v) {
      this.div[i].select.attr('checked', true);
    } else {
      this.div[i].select.removeAttr('checked');
    }
    this.scene.current_view.selected = this.controller.make_selected_str();
    this.controller.scene.changed = true;
  }
  
  this.toggle_residue_select = function(res_id) {
    var r = this.protein.res_by_id[res_id]
    this.set_residue_select(res_id, !r.selected);
  }

  this.create_residue_div = function(k) {
    var controller = this.controller;
    var sequence_display = this;
    var res_id = this.protein.residues[i].id;
    var res_type = this.protein.residues[i].type;
    var html = "&nbsp;" + html_pad(res_id, 7) + html_pad(res_type, 3)
    var show_res_id = res_id + ":show";
    var checkbox = $("<input>")
        .attr({
            type:'checkbox', id:show_res_id, name:show_res_id,
            checked:false})
        .click( 
            function(event) {
              var check_id = 'input[name="' + show_res_id + '"' + ']';
              var v = $(check_id).is(':checked');
              sequence_display.set_residue_select(res_id, v);
            });
    var elem = $("<div></div>")
        .css({'display':'block','margin':'0','padding':'0'})
        .append(checkbox)
        .append($("<a>")
          .attr("href", "#" + res_id)
          .html(html)
          .click(function() { 
              controller.set_target_view_by_res_id(res_id);
              sequence_display.reset_borders();
          }))
    return { 'target':elem, 'select':checkbox };
  }
  
  var sequence_div = $("#sequence");
  for (var i=0; i<this.protein.residues.length; i+=1) {
    elem = this.create_residue_div(i);
    sequence_div.append(elem.target);
    this.div.push(elem);
  }
  
  this.scene.current_view.res_id = this.protein.residues[0].id;
  hash_tag = url().split('#')[1];
  if (hash_tag in this.protein.res_by_id) {
    this.controller.set_target_view_by_res_id(hash_tag);
  }
  
  this.reset_borders();
}


// other initializations


function resize_all_displays_in_window(event) {
  var w = window.innerWidth - 515;
  var h = window.innerHeight - 115;
  var canvas = $('#imageView')[0];
  canvas.width = w;
  canvas.height = h;
  $('#central_pad').width(w);
  var h_sequence = $('#sequence_header').outerHeight();
  $('#sequence').height(h - h_sequence);
  var h_header = $('#views_header').outerHeight();
  $('#views').height(h - h_header);
}


function get_pdb_id_from_url(loc) {
  var pieces = loc.split('#')[0].split('/');
  var i = pieces.length-1;
  return pieces[i];
}


function load_protein_onto_page(canvas_tag, pdb_id) {
  var loading_dialog;

  function create_loading_dialog(pdb_id) {
    var c = $('#central_pad');
    var offset = c.position()
    loading_dialog = $('<div></div>')
      .append('Loading ' + pdb_id + ' from server.<br><br>' +
              'If for the first time, the structure needs <br>' +
              'to be downloaded from rcsb.org, and bonds <br>' +
              'need to be calculated. This may take several <br>' +
              'minutes for large structures. <br><br>' +
              'After, the structure is cached on the server.')
      .attr('id', 'loading_message')
      .css({
          'position':'absolute',
          'z-index':9000,
          'top':offset.top + 30,
          'left':offset.left + 30,
      })
    c.append(loading_dialog)
    loading_dialog.ajaxError(
        function(event, XMLHttpRequest, ajaxOptions) {
            $(this).text('Server timed out.');
        });
  }

  function success(data, textStatus, XMLHttpRequest) {
    eval(data);
    if ("// Sorry" == data.substring(0, 8)) {
      $('#loading_message').html('PDB file too big.');
      return;
    }
    if (typeof lines == "undefined" || lines.length == 0) {
      $('#loading_message').html('Structure not found');
      return;
    }
    loading_dialog.remove();
    if (typeof filename == 'undefined') {
      filename = '';
    }
    protein = new Protein();
    protein.load(pdb_id, lines, bond_pairs, max_length, filename);
    scene = new Scene(protein);
    controller = new Controller(scene)
    canvas = new Canvas($(canvas_tag)[0]);
    protein_display = new ProteinDisplay(scene, canvas, controller);

    annotations_display = new AnnotationsDisplay(scene, controller);
    annotations_display.load_views_from_server();
    sequence_display = new SequenceDisplay(scene, controller);
    option_display = new OptionDisplay(scene, controller);
    register_callacks();
  }

  create_loading_dialog(pdb_id);
  $.get('/pdb/' + pdb_id + '.js', success);
}


function add_label() {
  if (protein_display.scene.current_view.i_atom < 0) {
    return;
  }
  keyboard_lock = true;
  var c = $('#central_pad');
  var t = c.position().top;
  var l = c.position().left;
  var w = c.width();
  var h = c.height();
  var w2 = 400;
  var h2 = 60;
  var o = 70;
  var dialog = $('<div>')
      .addClass("annotation_text")
      .css({'position':'absolute',
            'left': l + w/2 - w2/2,
            'top': t + h/2 - h2/2 - o,
            'width':w2,
            'height':h2,
            'padding':10,
            'border':'2px solid #888',
            'z-index':'9000',
            'background':'#ABB'})
      .append('Add label to centered atom:')
  var edit_text = $("<textarea></textarea>")
    .attr("type", "text")
    .addClass("annotation_text")
    .css({"width":'100%',
          "height":h2-28})
    .click(do_nothing);
  var save = $('<a></a>')
    .attr("href", "")
    .addClass("nav")
    .html("[save]")
    .click(
        function(event) { 
          var text = edit_text.val();
          controller.make_label(
              protein_display.scene.current_view.i_atom,
              text);
          keyboard_lock = false;
          dialog.remove();
          return false; 
        });
  var discard = $('<a></a>')
    .css({"margin-right":"3em"})
    .addClass("nav")
    .attr("href", "").html("[discard]")
    .click(
        function(event) { 
          keyboard_lock = false;
          dialog.remove();
          return false;
        });
  c.append(dialog
      .click(do_nothing)
      .append(edit_text)
      .append('<br>')
      .append(save)
      .append(' ')
      .append(discard));
}


function onkeydown(event) {
  if (!keyboard_lock) {
    var c = String.fromCharCode(event.keyCode).toUpperCase();
    var s = "[" + c + "]";
    if (c == 'V') {
      annotations_display.make_new_annotation();
      return;
    } else if ((c == "K") || (event.keyCode == 37)) {
      sequence_display.goto_prev_residue();
    } else if ((c == "J") || (event.keyCode == 39)) {
      sequence_display.goto_next_residue();
    } else if (c == "X") {
      var i_atom = scene.current_view.i_atom;
      if (i_atom >= 0) {
        var res_id = controller.protein.atoms[i_atom].res_id;
        sequence_display.toggle_residue_select(res_id);
      }
    } else if (event.keyCode == 38) {
      annotations_display.goto_prev_view();
    } else if (c == " " || event.keyCode == 40) {
      annotations_display.goto_next_view();
    } else if (c == 'B') {
      if (scene.current_view.show.all_atom) {
        option_display.set_backbone('ribbon');
      } else if (scene.current_view.show.ribbon) {
        option_display.set_backbone('trace');
      } else if (scene.current_view.show.trace){
        option_display.set_backbone('all_atom');
      }
    } else if (c == 'L') {
      option_display.toggle('ligands');
    } else if (c == 'S') {
      for (i=0; i<protein.residues.length; i+=1) {
        protein.residues[i].show = false;
      }
      option_display.toggle('sidechain');
    } else if (c == 'W') {
      option_display.toggle('water');
    } else if (c == 'H') {
      option_display.toggle('hydrogen');
    } else if (c == 'A') {
      add_label();
    } else {
      var i = parseInt(c);
      if ((i || i==0) && (i<scene.saved_views.length)) {
        var id = scene.saved_views[i].id;
        annotations_display.set_target_by_view_id(id);
      }
    }
    scene.changed = true;
  }
}


function register_callacks() {
  document.oncontextmenu = do_nothing;
  document.onkeydown = onkeydown;
  $(window).resize(
      function() { 
        resize_all_displays_in_window(); 
        scene.changed = true;
      });
  window.onorientationchange = function() { 
      resize_all_displays_in_window(); 
      scene.changed = true;
  }
  $("#save_view").click(
      function() {
        annotations_display.make_new_annotation();
        return false;
      });  
  $("#prev_view").click(
      function() {
        annotations_display.goto_prev_view();
        return false;
      });  
  $("#next_view").click(
      function() {
        annotations_display.goto_next_view();
        return false;
      });  
  $("#prev_residue").click(
      function() {
        sequence_display.goto_prev_residue();
        return false;
      });  
  $("#next_residue").click(
      function() {
        sequence_display.goto_next_residue();
        return false;
      });  
  $("#make_label").click(
      function() {
        add_label();
        return false;
      });  
}


function redraw_other_displays() {
  annotations_display.reset_borders();
  sequence_display.reset_borders();
  for (i=0; i<protein.residues.length; i+=1) {
    protein.residues[i].selected = false;
  }
  for (i=0; i<protein.residues.length; i+=1) {
    sequence_display.div[i].select.removeAttr('checked');
  }
  if ('selected' in scene.current_view) {
    if ((typeof scene.current_view.selected !== "undefined") 
        && (scene.current_view.selected != "")) {
      var selected_residues = eval(scene.current_view.selected);
      if (selected_residues !== null) {
        for (i=0; i<selected_residues.length; i+=1) {
          var j = selected_residues[i];
          protein.residues[j].selected = true;
          sequence_display.div[j].select.attr('checked', true);
        }
      }
    }
  }
}


function draw() {
  if (scene.changed) {
    if (scene.is_new_view_chosen) {
      redraw_other_displays();
      scene.is_new_view_chosen = false;
    }
    option_display.update();
    protein_display.draw();
    scene.changed = false;
  }
}
  

function start_loop() {
  ms_per_step = 25;
  last_time = (new Date).getTime();
  loop = function() {
    if (typeof scene === 'undefined') {
      return;
    }
    curr_time = (new Date).getTime();
    n_step = (curr_time - last_time)/ms_per_step;
    if (n_step < 1) {
      n_step = 1;
    }
    for (var i=0; i<n_step; i++) {
      scene.animate();
    }
    draw();
    last_time = curr_time;
  }
  interval_id = setInterval(loop, ms_per_step);
}


function init() {
  resize_all_displays_in_window();
  var pdb_id = get_pdb_id_from_url(url());
  $('title').html('jolecule - pdb:' + pdb_id);
  load_protein_onto_page('#imageView', pdb_id);
  start_loop();
}


if (window.addEventListener) {
  window.addEventListener('load', init, false); 
}
