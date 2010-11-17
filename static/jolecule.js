//////////////////////////////////////////////////////////
// 
// jolecule - the javascript based protein/dna viewer
//
// relies on server jolecule.appspot.com, which, in turn
// relies on the RCSB website http://www.pdb.org.
//
///////////////////////////////////////////////////////////


var keyboard_lock = false;
var atom_radius = 0.3;
var canvas;
var pdb_id;
var protein;
var scene;
var controller;
var protein_display;
var annotations_display;
var sequence_display;
var user = 'public';



// Some generic utility functions

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


// Major data structure

var Protein = function() { 
  this.atoms = []; 
  this.bonds = [];
  this.res_by_id = {};
  this.residues = [];
  this.ribbons = [];
  this.trace = [];
  
  this.make_atoms_from_pdb_lines = function(lines) {
    for (var i=0; i<lines.length; i+=1) {
      if (lines[i].substr(0,4)=="ATOM" ||
           lines[i].substr(0,6)=="HETATM" ) {
        var x = parseFloat(lines[i].substr(30,7));
        var y = parseFloat(lines[i].substr(38,7));
        var z = parseFloat(lines[i].substr(46,7));
        var chain = trim(lines[i][21]);
        var res_num = trim(lines[i].substr(22,5));
        var res_type = lines[i].substr(17, 3);
        var atom_type = trim(lines[i].substr(12,4));
        var label = res_num + ' - ' + res_type +
                    ' - ' + atom_type;
        if (chain) {
          label = chain + ":" + label;
        }
        var elem = trim(lines[i].substr(76,2));
        if (elem == "") {
          elem = trim(lines[i].substr(12,2));
        }
        this.atoms.push({
          'pos': v3.create(x, y, z),
          'res_type': res_type,
          'chain': chain,
          'res_num': res_num,
          'elem': elem,
          'i': i,
          'type': atom_type,
          'label': label}
        );
      }
    }
  }

  this.get_res_id_from_atom = function(atom) {
    var s = "";
    if (atom.chain) {
      s += atom.chain + ':';
    }
    s += atom.res_num;
    return s;
  }

  this.make_bonds = function(bond_pairs) {
    this.bonds = [];
    for (var i=0; i<bond_pairs.length; i+=1) {
      var j = bond_pairs[i][0];
      var k = bond_pairs[i][1];
      this.bonds.push(
          { atom1:this.atoms[j], atom2:this.atoms[k] });
    }
  }

  aa = ['ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS',
         'ILE', 'LYS', 'LEU', 'MET', 'ASN', 'PRO', 'GLN',
         'ARG', 'SER', 'THR', 'TRP', 'VAL', 'TYR'];
  dna = ['DA', 'DT', 'DG', 'DC'];
  rna = ['RA', 'RT', 'RG', 'RU'];

  this.make_residues = function() {
    this.res_by_id = {};
    this.residues = [];
    for (var i=0; i<this.atoms.length; i+=1) {
      var a = this.atoms[i];
      res_id = this.get_res_id_from_atom(a);
      if (!(res_id in this.res_by_id)) {
        var new_r = {
          'chain': a.chain,
          'num': a.res_num,
          'type': a.res_type,
          'id': res_id,
          'atoms': {},
        }
        new_r.is_water = a.res_type == "HOH";
        var r_type = trim(new_r.type)
        new_r.is_protein = 
           in_array(r_type, aa) || 
           in_array(r_type, dna) ||
           in_array(r_type, rna);
        new_r.is_ligands = !new_r.is_water && !new_r.is_protein;
        this.res_by_id[res_id] = new_r;
        this.residues.push(new_r);
      }
      this.res_by_id[res_id].atoms[a.type] = a;
      a.res_id = new_r.id;
      a.is_water = new_r.is_water;
      a.is_protein = new_r.is_protein;
      a.is_ligands = new_r.is_ligands;
    }
    for (var i=0; i<this.residues.length; i+=1) {
      var res = this.residues[i];
      if (this.has_aa_bb(i)) {
        res.target_view = res.atoms["CA"];
      } else if (this.has_nuc_bb(i)) {
        res.target_view = res.atoms["C3'"];
      } else {
        for (var k in res.atoms) {
          res.target_view = res.atoms[k];
          break;
        }
      }
    }
  }

  this.has_nuc_bb = function(i) {
    if ((i<0) || (i>=this.residues.length)) {
      return false;
    }
    if (("C3'" in this.residues[i].atoms) &&
        ("C4'" in this.residues[i].atoms) &&
        ("C1'" in this.residues[i].atoms)) {
      return true;
    }
    return false;
  };

  this.has_aa_bb = function(i) {
    if ((i<0) || (i>=this.residues.length)) {
      return false;
    }
    if (("CA" in this.residues[i].atoms) &&
        ("N" in this.residues[i].atoms) &&
        ("C" in this.residues[i].atoms)) {
      return true;
    }
    return false;
  };

  function flank(c, p, q) {
    var axis1 = v3.diff(p, q);
    var p_to_c = v3.diff(c, p);
    var axis2 = v3.perpendicular(p_to_c, axis1);
    var axis3 = v3.cross_product(axis1, axis2);
    var c_to_p1 = v3.normalized(axis3);
    var p1 = v3.sum(c, c_to_p1);
    var p2 = v3.diff(c, c_to_p1);
    return [p1, p2];
  }

  this.make_plates = function() {
    this.ribbons = [];
    var creases = [];
    var crease_atoms = [];
    var i;
    for (var j=0; j<this.residues.length-1; j+=1) {
      if (this.has_aa_bb(j)) {
        crease_atoms.push(this.residues[j].atoms["CA"]);
        if (this.has_aa_bb(j-1) && this.has_aa_bb(j+1)) {
          creases.push(flank(
              this.residues[j].atoms["CA"].pos, 
              this.residues[j-1].atoms["CA"].pos, 
              this.residues[j+1].atoms["CA"].pos));
        } else if (this.has_aa_bb(j-1)) {
          creases.push(flank(
              this.residues[j].atoms["CA"].pos, 
              this.residues[j-1].atoms["CA"].pos, 
              this.residues[j].atoms["C"].pos));
        } else if (this.has_aa_bb(j+1)) {
          creases.push(flank(
              this.residues[j].atoms["CA"].pos, 
              this.residues[j].atoms["N"].pos, 
              this.residues[j+1].atoms["CA"].pos));
        }
      }
      if (this.has_nuc_bb(j)) {
        crease_atoms.push(this.residues[j].atoms["C3'"]);
        if (this.has_nuc_bb(j-1) && this.has_nuc_bb(j+1)) {
          creases.push(flank(
              this.residues[j].atoms["C3'"].pos, 
              this.residues[j-1].atoms["C3'"].pos, 
              this.residues[j+1].atoms["C3'"].pos));
        } else if (this.has_nuc_bb(j-1)) {
          creases.push(flank(
              this.residues[j].atoms["C3'"].pos, 
              this.residues[j-1].atoms["C3'"].pos, 
              this.residues[j].atoms["O3'"].pos));
        } else if (this.has_nuc_bb(j+1)) {
          creases.push(flank(
              this.residues[j].atoms["C3'"].pos, 
              this.residues[j].atoms["C5'"].pos, 
              this.residues[j+1].atoms["C3'"].pos));
        }
      }
    }
    for (var j=1; j<creases.length; j+=1) {
      d1 = v3.distance(creases[j-1][0], creases[j][1]);
      if (d1 < 8) {
        i = j-1;
        bond = [crease_atoms[i], crease_atoms[j]];
        d2 = v3.distance(creases[i][1], creases[j][0]);
        e1 = v3.distance(creases[i][0], creases[j][0]);
        e2 = v3.distance(creases[i][1], creases[j][1]);
        if ((d1+d2) < (e1+e2)) {
          quad_coords = [
              creases[i][0].clone(), creases[i][1].clone(),
              creases[j][0], creases[j][1]];
        } else {
          quad_coords = [
              creases[i][0].clone(), creases[i][1].clone(),
              creases[j][1], creases[j][0]];
        }
        this.ribbons.push(
            {'bond':bond, 'quad_coords':quad_coords})
      }
    } 
  }

  this.make_trace = function() {
    this.trace = [];
    for (var j=1; j<this.residues.length; j+=1) {
      if (this.has_aa_bb(j-1) && this.has_aa_bb(j)) {
        var ca1 = this.residues[j-1].atoms["CA"];
        var ca2 = this.residues[j].atoms["CA"];
        if (v3.distance(ca1.pos, ca2.pos) < 8) {
          this.trace.push({atom1:ca1, atom2:ca2});
        }
      }
      if (this.has_nuc_bb(j-1) && this.has_nuc_bb(j)) {
        var c31 = this.residues[j-1].atoms["C3'"];
        var c32 = this.residues[j].atoms["C3'"];
        if (v3.distance(c31.pos, c32.pos) < 8) {
          this.trace.push({atom1:c31, atom2:c32});
        }
      }
    }
  }

  this.load = function(lines, bond_pairs, max_length) {
    this.make_atoms_from_pdb_lines(lines);
    this.make_residues();
    this.make_bonds(bond_pairs);
    this.make_plates();
    this.make_trace();
    this.max_length = max_length;
  }

  this.transform = function(matrix) {
    for (var i=0; i<this.atoms.length; i+=1) {
      this.atoms[i].pos.transform(matrix);
      this.atoms[i].z = this.atoms[i].pos.z
    }
    for (i=0; i<this.ribbons.length; i+=1) {
      for (j=0; j<4; j+=1) {
        this.ribbons[i].quad_coords[j].transform(matrix);
        this.ribbons[i].z = max_z_of_list(
          this.ribbons[i].quad_coords)
      }
    }
    for (i=0; i<this.bonds.length; i+=1) {
      this.bonds[i].z = Math.max(
          this.bonds[i].atom1.pos.z, 
          this.bonds[i].atom2.pos.z) 
          + 0.2;
    }
    for (i=0; i<this.trace.length; i+=1) {
      this.trace[i].z = Math.max(
          this.trace[i].atom1.pos.z, 
          this.trace[i].atom2.pos.z) 
          + 0.2;
    }
    this.max_z = 0;
    this.min_z = 1E6;
    for (var i=0; i<this.atoms.length; i+=1) {
      if (this.atoms[i].pos.z < this.min_z) {
        this.min_z = this.atoms[i].pos.z;
      }
      if (this.atoms[i].pos.z > this.max_z) {
        this.max_z = this.atoms[i].pos.z;
      }
    }
  }

  this.center = function() {
    var x_center = 0;
    var y_center = 0;
    var z_center = 0;
    var n = this.atoms.length;
    for (var i=0; i < n; i+=1) {
      x_center += this.atoms[i].pos.x;
      y_center += this.atoms[i].pos.y;
      z_center += this.atoms[i].pos.z;
    }
    return v3.create(
          -x_center/n, -y_center/n, -z_center/n);
  }
}


///////////////////////////////////////////
// Camera stores information about
// the direction and zoom that a protein
// should be viewed
///////////////////////////////////////////


var Camera = function() {
  this.pos = v3.create(0, 0, 0);
  this.up_v = v3.create(0, 1, 0);
  this.in_v = v3.create(0, 0, 1);  
  this.zoom = 0.0;
  this.z_front = 0.0;
  this.z_back = 0.0;
  
  this.is_visible_z = function(z) {
    if (z < (2*atom_radius - this.zoom)) {
      return false;
    }
    if (z > this.z_back) {
      return false;
    }
    if (z < this.z_front) {
      return false;
    }
    return true;
  };

  this.clone = function() {
    var c = new Camera();
    c.pos = this.pos.clone(),
    c.up_v = this.up_v.clone(),
    c.in_v = this.in_v.clone(),
    c.zoom = this.zoom, 
    c.z_front = this.z_front, 
    c.z_back = this.z_back;
    return c;
  }  
  
  this.transform = function(matrix) {
    this.pos.transform(matrix);
    this.up_v.transform(matrix);
    this.in_v.transform(matrix);
  }
}


function is_equal_camera(v, w) {
  if (v3.is_equal(v.pos, w.pos) &&
      v3.is_equal(v.up_v, w.up_v) &&
      v3.is_equal(v.in_v, w.in_v) &&
      (v.zoom == w.zoom) &&
      (v.z_front == w.z_front) &&
      (v.z_back == w.z_back)) {
    return true;
  }
  return false;
}


function is_aligned(v, w) {
  return v3.is_near_zero(v3.angle(v, w));
}


function get_camera_transform(ref, mov, n_step) {
  var ref1 = ref.pos;
  var ref2 = ref.up_v;
  var ref3 = ref.in_v;
  var mov1 = mov.pos;
  var mov2 = mov.up_v;
  var mov3 = mov.in_v;

  var disp = v3.diff(ref1, mov1);
  var t = v3.translation(disp);

  var axis1, torsion1, r1;
  var mov12 = v3.diff(mov2, mov1);
  var ref12 = v3.diff(ref2, ref1);
  if (is_aligned(mov12, ref12)) {
    r1 = new v3.Matrix();
    torsion1 = null;
  } else {
    axis1 = v3.cross_product(mov12, ref12);  
    torsion1 = v3.dihedral(ref12, axis1, mov12);
    r1 = v3.rotation(axis1, torsion1);
  }

  var axis2, torsion2, r2;
  var ref13 = v3.diff(ref3, ref1);
  var mov13 = v3.diff(mov3, mov1);
  mov13.transform(r1);
  if (v3.is_near_zero(v3.angle(ref13, mov13))) {
    r2 = new v3.Matrix();
    torsion2 = null;
  } else {
    axis2 = v3.cross_product(ref13, mov13);  
    torsion2 = v3.dihedral(ref13, axis2, mov13);
    r2 = v3.rotation(axis2, torsion2);
  }

  // now we have the parameters of the transform
  // build the transform (in terms of little steps)
  if (torsion1 === null) {
    var n = t;
  } else {
    var r1 = v3.rotation(axis1, torsion1/n_step);
    var n = v3.matrix_product(r1, t);
  }
  if (torsion2 === null) {
    var m = n;
  } else {
    var r2 = v3.rotation(axis2, torsion2/n_step);
    var m = v3.matrix_product(r2, n);
  }
  var disp2 = v3.scaled(disp, -(n_step-1)/n_step);

  return v3.matrix_product(v3.translation(disp2), m);
}


////////////////////////////////////////////////////
//
// View
// ----
// A view includes all pertinent viewing options
// needed to render the protein in the way
// for the user.
// 
// Inside a view are two cameras as a camera is
// defined in terms of an existing frame of 
// reference. The first camera refers to the 
// current_view camera.
// 
// The absolute camera is expressed with respect
// to the original frame of coordinate of the PDB.
//
////////////////////////////////////////////////////


var View = function() {
  this.id = 'view:000000';
  this.res_id = "";
  this.i_atom = -1;
  this.order = 0;
  this.camera = new Camera();
  this.abs_camera = new Camera();
  this.labels = [];
  this.distances = [];
  this.text = 'Default view of PDB file';
  this.time = "";
  this.creator = "";
  this.modifier = "";
  this.url = url();
  this.show = {  
      sidechain: true,
      hydrogen: false,
      water: false,
      ligands: true,
      trace: false,
      all_atom: false,
      ribbon: true,
  };

  this.clone = function() {
    var v = new View();
    v.id = this.id;
    v.res_id = this.res_id;
    v.i_atom = this.i_atom;
    v.labels = clone_list_of_dicts(this.labels);
    v.distances = clone_list_of_dicts(this.distances);
    v.order = this.order;
    v.text = this.text;
    v.time = this.time;
    v.url = this.url;
    v.abs_camera = this.abs_camera.clone();
    v.camera = this.camera.clone();
    v.show = clone_dict(this.show);
    return v;
  }

  this.extract_show = function(in_view) {
    this.res_id = in_view.res_id;
    this.show = clone_dict(in_view.show);
    this.labels = clone_list_of_dicts(in_view.labels);
    this.distances = clone_list_of_dicts(in_view.distances);
    this.text = in_view.text;
    this.time = in_view.time;
    this.url = in_view.url;
    this.i_atom = in_view.i_atom;
  }

}


/////////////////////////////////////////////////
// The Controller object of the MVC of the 
// program. Includes all views necessary to
// render the protein.
/////////////////////////////////////////////////


function get_current_date() {
  var current_view = new Date();
  var month = current_view.getMonth() + 1;
  var day = current_view.getDate();
  var year = current_view.getFullYear();
  return day + "/" + month + "/" + year;
}


var Scene = function(protein) {
  this.protein = protein;
  this.saved_views_by_id = {};
  this.saved_views = [];
  this.origin = new View();
  this.current_view = new View();
  this.target_view = null;
  this.n_update_step = -1;
  this.is_new_view_chosen = true;
  this.i_last_view = 0;
  this.saved_show = null;
  
  this.calculate_abs_camera = function(view) {
    var m_origin_view = this.origin.clone();
    var m_current_view = this.current_view.clone();
    var m = get_camera_transform(
        m_current_view.camera, m_origin_view.camera, 1);
    m_current_view.camera.transform(m);
    m_origin_view.camera.transform(m);
    view.abs_camera = m_current_view.camera;
  }
  
  this.restore_camera_from_abs_camera = function(view) {
    var current_camera = this.current_view.camera.clone();
    var m = get_camera_transform(
        this.current_view.camera, this.origin.camera, 1);
    current_camera.transform(m);
    var n = get_camera_transform(
        this.current_view.camera, current_camera, 1);
    view.camera = view.abs_camera.clone();
    view.camera.transform(n);  
  }  
  
  this.transform = function(matrix) {
    this.protein.transform(matrix);
    for (i=0; i<this.saved_views.length; i+=1) {
      this.saved_views[i].camera.transform(matrix);
    }
    if (this.target_view) {
      this.target_view.camera.transform(matrix);
    }
    this.origin.camera.transform(matrix);
    for (var i=0; i<this.current_view.distances.length; i+=1) {
      var dist = this.current_view.distances[i];
      this.current_view.distances[i].z = Math.max(
          this.protein.atoms[dist.i_atom1].pos.z,
          this.protein.atoms[dist.i_atom2].pos.z);
    }
  }

  this.translate = function(d) {
    this.transform(v3.translation(d));
  }

  this.set_target_view = function(view) {
    this.n_update_step = 12;
    this.target_view = view.clone();  
  }

  this.centered_atom = function() {
    var i = this.current_view.i_atom;
    return this.protein.atoms[i];
  }

  this.find_atom_nearest_to_origin = function() {
    for (var i=0; i< this.protein.residues.length; i+= 1) {
      var res = this.protein.residues[i];
      var p = res.target_view.pos;
      var d = p.x*p.x + p.y*p.y + p.z*p.z;
      if (d > 400) {
        continue;
      }
      for (var k in res.atoms) {
        p = res.atoms[k].pos;
        if (Math.abs(p.x)<0.1 && Math.abs(p.y)<0.1 &&
            Math.abs(p.z)<0.1) {
          return res.atoms[k].i;    
        }
      }
    }
    return -1;
  }
  
  this.get_i_saved_view_from_id = function(id) {
    var i = -1;
    for (var j=0; j<this.saved_views.length; j+=1) {
      if (this.saved_views[j].id == id) {
        i = j;
      }
    }
    return i;
  }

  this.remove_saved_view = function(id) {
    var i = this.get_i_saved_view_from_id(id);
    if (i<0) {
      return;
    }
    this.saved_views.splice(i,1);
    delete this.saved_views_by_id[id];
  }
  
  this.save_view = function(view) {
    var id = view.id;
    this.saved_views_by_id[id] = view;
    this.saved_views.push(view);
  }

  this.get_default_view = function() {
    this.current_view.order = -1;
    pdb_url = 'http://www.rcsb.org/pdb/explore' + 
        '/explore.do?structureId=' + pdb_id;
    pdb_wiki_url = "http://pdbwiki.org/index.php/" + 
        pdb_id
    this.current_view.text = 
        'Default view in PDB structure ' +
        "<a href='" + pdb_url +
        "'>" + pdb_id.toUpperCase() + "</a>." +
        " For more information, also check out the <a href='" + pdb_wiki_url +
        "'>PDB-wiki</a>.";
    return this.current_view.clone();
  }
  
  this.animate = function() {
    if (this.n_update_step < 0) {
      return;
    }
    if (this.n_update_step == 0) {
      this.current_view.extract_show(this.target_view);
      var i_atom = this.current_view.i_atom;
      if (i_atom == -1 || typeof i_atom == 'undefined') {
        this.current_view.i_atom = this.find_atom_nearest_to_origin();
      }
      i_atom = this.current_view.i_atom;
      if (i_atom > -1) {
        this.current_view.res_id = this.protein.atoms[i_atom].res_id;
      } else {
        this.current_view.res_id = this.protein.residues[0].id;
      }
      this.is_new_view_chosen = true;
    } else {
      o = get_camera_transform(
           this.current_view.camera, this.target_view.camera,
            this.n_update_step);
      this.transform(o);
      zoom_diff = 
          (this.target_view.camera.zoom - this.current_view.camera.zoom);
      this.current_view.camera.zoom += zoom_diff/this.n_update_step;
      z_front_diff = 
          this.target_view.camera.z_front - 
          this.current_view.camera.z_front;
      this.current_view.camera.z_front += 
          z_front_diff/this.n_update_step;
      z_back_diff = 
          this.target_view.camera.z_back - 
          this.current_view.camera.z_back;
      this.current_view.camera.z_back += 
          z_back_diff/this.n_update_step;
    }
    this.changed = true;
    this.n_update_step -= 1;
  }

  this.translate(this.protein.center());
  this.current_view = new View();
  this.current_view.res_id = this.protein.residues[0].id;
  this.current_view.camera.z_front = protein.min_z;
  this.current_view.camera.z_back = protein.max_z;
  this.current_view.camera.zoom = 
      Math.abs(2*protein.max_length);
  this.calculate_abs_camera(this.current_view);
  this.changed = true;
}


var Controller = function(scene) {
  this.protein = scene.protein;
  this.scene = scene;
  
 
  this.delete_dist = function(dist) {
    del_from_array(dist, this.scene.current_view.distances);
  }
  
  this.make_dist = function(atom1, atom2) {
    this.scene.current_view.distances.push({
      'i_atom1': atom1.i,
      'i_atom2': atom2.i,
      'z': atom2.z});
    this.scene.changed = true;
  }
  
  this.make_label = function(i_atom, text) {
    this.scene.current_view.labels.push({
        'i_atom': i_atom, 'text':text,
    });
    this.scene.changed = true;
  }
  
  this.delete_label = function(label) {
    del_from_array(label, this.scene.current_view.labels);
  }
  
  this.is_too_much_atomic_detail = function() {
    var n_aa = this.protein.residues.length;
    var camera = this.scene.current_view.camera;
    var z = camera.z_back - camera.z_front;
    return ((n_aa > 100) && (z > 15));
  }

  this.hide_atomic_details_for_mousemove = function() {
    if (this.is_too_much_atomic_detail()) {
      this.saved_show = clone_dict(this.scene.current_view.show);
      this.scene.current_view.show.ligands = false; 
      this.scene.current_view.show.hydrogen = false; 
      this.scene.current_view.show.sidechain = false; 
      this.scene.current_view.show.water = false; 
      this.scene.changed = true;
    }
  }
  
  this.restore_atomic_details_after_mousemove = function() {
    if (this.saved_show === null) {
      return;
    }
    this.scene.current_view.show = clone_dict(this.saved_show);
    this.saved_show = null;
    this.scene.changed = true;
  }
  
  this.rotate_xy = function(x_angle, y_angle) {
    x_axis = v3.create(1, 0, 0);
    rot_along_x = v3.rotation(x_axis, x_angle);
    y_axis = v3.create(0, 1, 0);
    rot_along_y = v3.rotation(y_axis, y_angle);
    matrix = v3.matrix_product(rot_along_x, rot_along_y);
    this.scene.transform(matrix);
  }

  this.rotate_z = function(z_angle) {
    z_axis = v3.create(0, 0, 1);
    rot_along_z = v3.rotation(z_axis, z_angle);
    this.scene.transform(rot_along_z);
  }

  this.adjust_zoom = function(zoom_diff) {
    var camera = this.scene.current_view.camera;
    camera.zoom += zoom_diff;
    if (camera.zoom < 8*atom_radius) {
      camera.zoom = 8*atom_radius;
    }
    this.changed = true;
  }
  
  this.set_target_view_by_id = function(id) {
    var view = this.scene.saved_views_by_id[id];
    this.i_last_view = this.scene.saved_views_by_id[id].order;
    this.scene.restore_camera_from_abs_camera(view);
    this.scene.set_target_view(view);
  }

  this.set_target_view_by_res_id = function(res_id) {
    this.scene.current_view.res_id = res_id;
    this.scene.current_view.i_atom = this.protein.res_by_id[res_id].target_view.i;
    var view = this.scene.current_view.clone();
    var pos = this.protein.res_by_id[res_id].target_view.pos;
    view.camera.transform(v3.translation(pos));
    this.scene.set_target_view(view);
  }

  this.set_target_view_by_atom = function(atom) {
    var view = this.scene.current_view.clone();
    view.res_id = atom.res_id;
    view.i_atom = atom.i;
    view.camera.transform(v3.translation(atom.pos));
    this.scene.set_target_view(view);
  }

  this.flatten_labels = function(view) {
    var s = "[";
    for (var i=0; i<view.labels.length; i+=1) {
      var label = view.labels[i];
      s += "[" + label.i_atom + ", ";
      s += "'" + escape(label.text) + "'], ";
    }
    s += "];";
    return s;
  }
  
  this.flatten_distances = function(view) {
    var s = "[";
    for (var i=0; i<view.distances.length; i+=1) {
      var distance = view.distances[i];
      s += "[" + distance.i_atom1 + ", ";
      s += distance.i_atom2 + "], ";
    }
    s += "];";
    return s;
  }

  this.flat_dict_from_view = function(view) {
    return {
      id: view.id,
      'pdb_id': pdb_id,
      order : view.order,
      show_sidechain: view.show.sidechain,
      show_hydrogen: view.show.hydrogen,
      show_water: view.show.water,
      show_ligands: view.show.ligands,
      show_trace: view.show.trace,
      show_ca_trace: view.show.trace,
      show_ribbon: view.show.ribbon,
      show_all_atom: view.show.all_atom,
      text: view.text,
      res_id: view.res_id,
      i_atom: view.i_atom,
      labels: this.flatten_labels(view),
      distances: this.flatten_distances(view),
      z_front: view.camera.z_front,
      z_back: view.camera.z_back,
      zoom: view.camera.zoom,
      camera_pos_x: view.abs_camera.pos.x,
      camera_pos_y: view.abs_camera.pos.y, 
      camera_pos_z: view.abs_camera.pos.z, 
      camera_up_x: view.abs_camera.up_v.x, 
      camera_up_y: view.abs_camera.up_v.y, 
      camera_up_z: view.abs_camera.up_v.z,
      camera_in_x: view.abs_camera.in_v.x, 
      camera_in_y: view.abs_camera.in_v.y, 
      camera_in_z: view.abs_camera.in_v.z, 
    }
  }
  
  this.save_view_to_server = function(view) {
    var flat_dict = this.flat_dict_from_view(view)
    $.post('/ajax/new_view', flat_dict, do_nothing);
  }
  
  this.save_current_view = function(new_id) {
    var new_view = this.scene.current_view.clone();
    new_view.text = 'Insert text here';
    new_view.creator = user;
    new_view.id = new_id;
    new_view.time = get_current_date();
    this.scene.calculate_abs_camera(new_view);
    this.scene.saved_views_by_id[new_id] = new_view;
    this.scene.i_last_view += 1;
    if (this.scene.i_last_view >= this.scene.saved_views.length) {
      this.scene.saved_views.push(new_view);
    } else {
      this.scene.saved_views.splice(this.i_last_view, 0, new_view);
      this.scene.saved_views[this.scene.i_last_view] = new_view;
    }
    for (var i=this.scene.i_last_view; i<this.scene.saved_views.length; i+=1) {
      this.scene.saved_views[i].order = i;
    }
    this.save_view_to_server(new_view);
  }

  this.resort_saved_views = function() {
    function cmp(a, b) {
      var x = a.order;
      var y = b.order;
      return ((x < y) ? -1 : ((x > y) ? 1 : 0));
    }
    this.scene.saved_views.sort(cmp);
    for (var i=0; i<this.scene.saved_views.length; i+=1) {
      this.scene.saved_views[i].order = i;
    }
  }
  
  this.is_saved_views_in_order = function() {
    for (i=0; i<this.scene.saved_views.length; i++) {
      if (i != this.scene.saved_views[i].order) {
        return false;
      }
    }
    return true;
  }
  
  this.delete_view = function(id, after_success) {
    var controller = this;
    success = function(data) {
      controller.scene.remove_saved_view(id);
      after_success(data);
    }
    $.post(
         '/ajax/pdb/delete', 
         {'pdb_id': pdb_id, 'id':id}, 
         success);
  }

  this.restore_distances = function(flat_distances_string) {
    var flat_distances = eval(flat_distances_string);
    var distances = [];
    for (var i=0; i<flat_distances.length; i+=1) {
      var distance = {}
      distance.i_atom1 = flat_distances[i][0];
      distance.i_atom2 = flat_distances[i][1];
      distance.z = 0;
      distances.push(distance);
    }
    return distances;
  }
  
  this.restore_labels = function(flat_labels_string) {
    var flat_labels = eval(flat_labels_string);
    var labels = [];
    for (var i=0; i<flat_labels.length; i+=1) {
      var label = {}
      label.i_atom = flat_labels[i][0];
      label.text = unescape(flat_labels[i][1]);
      label.z = 0;
      labels.push(label);
    }
    return labels
  }
  
  this.view_from_dict = function(flat_dict) {
    view = new View();

    view.id = flat_dict.id;
    view.pdb_id = flat_dict.pdb_id;
    view.lock = flat_dict.lock;
    view.text = flat_dict.text;
    view.time = flat_dict.time;
    view.creator = flat_dict.creator;
    view.modifier = flat_dict.modifier;
    view.order = flat_dict.order;
    view.res_id = flat_dict.res_id;
    view.i_atom = flat_dict.i_atom;
    if ('labels' in flat_dict) {
      view.labels = this.restore_labels(
          flat_dict.labels);
    }
    if ('distances' in flat_dict) {
      view.distances = this.restore_distances(
          flat_dict.distances);
    }
  
    if ('show_all_atom' in flat_dict) {
      view.show.all_atom = flat_dict.show_all_atom;
    } else if ('show_backbone' in flat_dict) {
      view.show.all_atom = flat_dict.backbone;
    }
    view.show.all_atom = flat_dict.show_all_atom;
    view.show.sidechain = flat_dict.show_sidechain;
    view.show.hydrogen = flat_dict.show_hydrogen;
    view.show.trace = flat_dict.show_trace;
    view.show.water = flat_dict.show_water;
    view.show.ribbon = flat_dict.show_ribbon;
    view.show.ligands = flat_dict.show_ligands;

    view.abs_camera.pos.x = flat_dict.camera_pos_x;
    view.abs_camera.pos.y = flat_dict.camera_pos_y; 
    view.abs_camera.pos.z = flat_dict.camera_pos_z;
    view.abs_camera.up_v.x = flat_dict.camera_up_x; 
    view.abs_camera.up_v.y = flat_dict.camera_up_y; 
    view.abs_camera.up_v.z = flat_dict.camera_up_z;
    view.abs_camera.in_v.x = flat_dict.camera_in_x; 
    view.abs_camera.in_v.y = flat_dict.camera_in_y; 
    view.abs_camera.in_v.z = flat_dict.camera_in_z; 

    view.camera.z_front = flat_dict.z_front;
    view.camera.z_back = flat_dict.z_back;
    view.camera.zoom = flat_dict.zoom;
    view.abs_camera.z_front = flat_dict.z_front;
    view.abs_camera.z_back = flat_dict.z_back;
    view.abs_camera.zoom = flat_dict.zoom;

    return view;
  }


  this.load_views_from_server = function(pdb_id, after_success) {
    var controller = this;
    var scene = this.scene

    function success(data, textStatus, XMLHttpRequest) {
      var default_view = scene.get_default_view();
      var default_id = default_view.id;
      scene.save_view(default_view);
      controller.save_view_to_server(default_view);
      var view_dicts = eval(data);
      for (var i=0; i<view_dicts.length; i+=1) {
        var view_dict = view_dicts[i];
        var view = controller.view_from_dict(view_dict);
        if (view.id == default_id) {
          continue;
        }
        if (typeof view.order == "undefined") {
          view.order = i+1;          
        }
        scene.save_view(view);
      }
      if (!controller.is_saved_views_in_order()) {
        controller.resort_saved_views();
      }
      scene.is_new_view_chosen = true;
      after_success();
    }
    
    $.get('/ajax/pdb/' + pdb_id, success);
  }

  this.set_backbone_option = function(option) {
    this.scene.current_view.show.all_atom = false;
    this.scene.current_view.show.trace = false;
    this.scene.current_view.show.ribbon = false;
    this.scene.current_view.show[option] = true;
    this.scene.changed = true;
  }

  this.set_show_option = function(option, bool) {
    this.scene.current_view.show[option] = bool;
    this.scene.changed = true;
  }

  this.get_show_option = function(option) {
    return this.scene.current_view.show[option];
  }
  
}


var AnnotationsDisplay = function(scene, controller) {
  this.scene = scene;
  this.controller = controller;
  this.div = {}; 
  
  this.set_view_order = function(id, order) {
    var view = this.scene.saved_views_by_id[id];
    var a = this.div[id].all.find('a').eq(0);
    view.order = order;
    a.text('['+view.order+']');
    this.controller.save_view_to_server(view);
  }

  this.reset_borders = function() {
    for (var id in this.div) {
      var last_id = this.scene.saved_views[this.scene.i_last_view].id;
      if (last_id == id) {
        this.div[id].all.css(
            {"border":"1px dotted #CCC"});
      } else {
        this.div[id].all.css(
          {"border":"1px solid white"});
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
      this_item.div[id].all.remove();
      delete this_item.div[id];
      if (this_item.scene.i_last_view >= this_item.scene.saved_views.length) {
        this_item.scene.i_last_view -= 1;
      }
      this_item.reset_goto_buttons();
      this_item.reset_borders();
    }
    this.controller.delete_view(id, success);
  }

  this.remove_button = function(id) {
    var this_item = this;
    return $('<div></div>')
       .css({'margin-right':'0em', 'float':'right'})
       .append($('<a>')
         .attr("href", "#delete"+id)
         .css({"font-size":".75em"})
         .html("[x]"))
         .click(function() { 
            this_item.remove_view(id); 
            return false;
         });
  }

  this.swap_up = function(i_id) {
    var i = this.scene.get_i_saved_view_from_id(i_id);
    var j = i-1;
    var j_id = this.scene.saved_views[j].id;
    if (i < 2) {
      return;
    }
    i_div = this.div[i_id].all;
    j_div = this.div[j_id].all;
    this.scene.saved_views[j].order = i;
    this.scene.saved_views[i].order = j;
    i_div.insertBefore(j_div);
    this.set_view_order(j_id, i);
    this.set_view_order(i_id, j);
    this.controlller.resort_saved_views();
    if (j==1) {
      this.div[i_id].swap_up.hide();
      this.div[j_id].swap_up.show();
    }    
  }

  this.goto_button = function(id, text) {
    var this_item = this;
    return $('<a>')
      .attr("href", "#"+id)
      .css({"float":"left", "padding-right":"0.5em"})
      .html('[' + text + ']')
      .click(function () { 
        var id = this.href.split('#')[1];
        this_item.set_target_by_view_id(id);
      });
  }

  this.edit_box = function(id) {
    var this_item = this;
    var view = this.scene.saved_views_by_id[id];
    this_item.div[id].edit_text = $("<textarea></textarea>")
      .css({"width":"100%", 
            "height":"8em",
            "font-family":"serif",
            "font-size":"1em"})
      .click(do_nothing);
    var save = $('<a></a>')
      .attr("href", "")
      .css({"font-size":".75em"})
      .html("[save]")
      .click(
          function(event) { 
            var text = this_item.div[id].edit_text.val();
            this_item.div[id].show_text.html(text);
            keyboard_lock = false;
            this_item.div[id].edit.hide();
            this_item.div[id].show.show(); 
            view.text = text;
            this_item.controller.save_view_to_server(view);
            return false; 
          });
    var discard = $('<a></a>')
      .css({"margin-right":"3em", "font-size":".75em"})
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
        .css({"font-size":".75em"})
        .attr('style', 'display:block;')
        .html(view.text)
    var edit_link = $('<a>')
        .attr("href", "#edit"+ id)
        .css({"margin-right":"1em",
              "font-size":".75em"})
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
        .attr("href", "#swap_up"+ id)
        .css({"margin-right":".5em",
              "font-size":".75em"})
        .html("[up]")
        .click(
            function(event) { 
              this_item.swap_up(id);
              return false; 
           })
    this_item.div[id].show = $('<div>')
      .append(this_item.div[id].show_text)
    if (view.order > 0) {
      this_item.div[id].show
          .append($('<div>')
              .css({"float":"right",
                    "font-size":".75em"})
              .html('~ ' + view.creator + 
                    ' on ' + view.time))
          .append("<br clear=all>")
      this_item.div[id].show
        .append(this_item.div[id].swap_up)
    }
    if (view.order == 1) {
      this_item.div[id].swap_up.hide()
    }
    if ((id != 'view:000000') && (!view.lock)) {
      this_item.div[id].show
        .append(edit_link)
        .append(this.remove_button(id));
    }
    return this_item.div[id].show;
  }

  this.text_box = function(id) {
    this.div[id].text_box = $('<div></div>')
        .css({"width":"220px",
              "padding-bottom":"1em"})
        .append(this.show_box(id))
        .append(this.edit_box(id))
    return this.div[id].text_box;
  }

  this.make_annotations_display = function(id) {
    var i = this.scene.get_i_saved_view_from_id(id);
    var view = this.scene.saved_views_by_id[id];
    var j = view.order;
    this.div[id] = {};
    this.div[id].all = $('<table></table>')
    this.div[id].all.css({"cellpadding":"5px"});
    this.div[id].all.append(
        $('<td>')
            .append(this.goto_button(id, j))
            .css({"vertical-align":"top"}))
    this.div[id].all.append(
        $('<td>')
            .append(this.text_box(id))
            .css({"vertical-align":"top"}))
    return this.div[id].all;
  }

  this.make_new_annotation = function() {
    new_id = random_id();
    this.scene.save_current_view(new_id);
    var div = this.make_annotations_display(new_id);
    if (this.scene.i_last_view == this.scene.saved_views.length - 1) {
      $("#views").append(div);
    } else {
      var j = this.scene.i_last_view-1;
      var j_id = this.scene.saved_views[j].id;
      var j_div = this.div[j_id].all;
      div.insertAfter(j_div);
    }
    var view = this.scene.saved_views_by_id[new_id];
    this.reset_goto_buttons();
    this.reset_borders();
    $("#views").scrollTo(this.div[new_id].all);
  }

  this.load_views_from_server = function(pdb_id) {
    var controller = this.controller;
    var this_item = this;
    
    function after_success() {
      for (var i=0; i<this_item.scene.saved_views.length; i+=1) {
        var id = this_item.scene.saved_views[i].id;
        var div = this_item.make_annotations_display(id);
        $('#views').append(div);
      }
      hash_tag = url().split('#')[1];
      if (hash_tag in this_item.scene.saved_views_by_id) {
        this_item.set_target_by_view_id(hash_tag);
      }
    }
    
    this.controller.load_views_from_server(
         pdb_id, after_success);
  }

}


///////////////////////////////////////////////////
// Object wrapper around the 2D canvas for HTML5
///////////////////////////////////////////////////


function pos_dom(in_dom) {
  var curr_dom = in_dom;
  var curr_left = curr_top = 0;
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


var Canvas = function(canvas_dom) {
  this.dom = canvas_dom;
  if (!this.dom.getContext) {
    alert('Error: no canvas.getContext!');
    return;
  }
  this.draw_context = this.dom.getContext('2d');
  if (!this.draw_context) {
    alert('Error: failed to getContext!');
    return;
  }
  this.width = this.dom.width;
  this.height = this.dom.height;
  this.half_width = this.width/2;
  this.half_height = this.height/2;
  var h = this.height;
  var w = this.width;
  this.scale = Math.sqrt(h*h + w*w);
  this.x_mouse;
  this.y_mouse;

  var pos = pos_dom(this.dom);
  this.x = pos[0];
  this.y = pos[1];
  
  this.get_x = function() {
    pos = pos_dom(this.dom);
    return pos[0];
  }
  
  this.get_y = function() {
    pos = pos_dom(this.dom);
    return pos[1];
  }

  this.extract_mouse_xy = function(event) {
    this.x_mouse = event.clientX - this.get_x();
    this.y_mouse = event.clientY - this.get_y();
    if (event.touches) {
      this.x_mouse = event.touches[0].clientX - this.get_x();
      this.y_mouse = event.touches[0].clientY - this.get_y();
    }
  }
  
  this.line = function(x1, y1, x2, y2, color, width) {
    this.draw_context.beginPath();
    this.draw_context.moveTo(x1, y1);
    this.draw_context.lineTo(x2, y2);
    this.draw_context.lineWidth = width;
    this.draw_context.strokeStyle = color;
    this.draw_context.stroke();
  };

  this.solid_circle = function(x, y, r, color, edgecolor) {
    this.draw_context.beginPath();
    this.draw_context.arc(x, y, r, 0, 2*Math.PI, true);
    this.draw_context.closePath();
    this.draw_context.fillStyle = color;
    this.draw_context.fill();
    this.draw_context.strokeStyle = edgecolor;
    this.draw_context.lineWidth = 1;
    this.draw_context.stroke();
  };

  this.solid_line = function(
      x1, y1, x2, y2, th, color, edgecolor) {
    var dx = y1 - y2;
    var dy = x2 - x1;
    var d  = Math.sqrt(dx*dx + dy*dy);
    dx /= d;
    dy /= d;
    this.draw_context.beginPath();
    this.draw_context.moveTo(x1 + dx * th, y1 + dy * th);
    this.draw_context.lineTo(x2 + dx * th, y2 + dy * th);
    this.draw_context.lineTo(x2 - dx * th, y2 - dy * th);
    this.draw_context.lineTo(x1 - dx * th, y1 - dy * th);
    this.draw_context.closePath();
    this.draw_context.fillStyle = color;
    this.draw_context.fill();
    this.draw_context.strokeStyle = edgecolor;
    this.draw_context.linewidth = 1;
    this.draw_context.stroke();
  };

  this.quad = function(
      x1, y1, x2, y2, x3, y3, x4, y4, 
      color, edgecolor) {
    this.draw_context.beginPath();
    this.draw_context.moveTo(x1, y1);
    this.draw_context.lineTo(x2, y2);
    this.draw_context.lineTo(x3, y3);
    this.draw_context.lineTo(x4, y4);
    this.draw_context.closePath();
    this.draw_context.fillStyle = color;
    this.draw_context.fill();
    this.draw_context.strokeStyle = edgecolor;
    this.draw_context.lineWidth = 1;
    this.draw_context.stroke();
  };

  this.text = function(text, x, y, font, color, align) {
    this.draw_context.fillStyle = color;
    this.draw_context.font = font;
    this.draw_context.textAlign = align;
    this.draw_context.textBaseline = 'middle';
    this.draw_context.fillText(text, x, y);
  }

  this.get_textwidth = function(text, font) {
    this.draw_context.font = font;
    this.draw_context.textAlign = 'center';
    return this.draw_context.measureText(text).width;
  }
  
  this.draw_popup = function(x, y, text, fillstyle) {
    var h = 20;
    var w = this.get_textwidth(text, '10px sans-serif') + 20;
    var y1 = 30;
    var arrow_w = 5;
    this.draw_context.beginPath();
    this.draw_context.moveTo(x-arrow_w, y-y1);
    this.draw_context.lineTo(x, y);
    this.draw_context.lineTo(x+arrow_w, y-y1);
    this.draw_context.lineTo(x+w/2, y-y1);
    this.draw_context.lineTo(x+w/2, y-h-y1);
    this.draw_context.lineTo(x-w/2, y-h-y1);
    this.draw_context.lineTo(x-w/2, y-y1);
    this.draw_context.closePath();
    this.draw_context.fillStyle = fillstyle;
    this.draw_context.fill();
    this.text(
        text, x, y-h/2-y1, '10px sans-serif', '#000', 'center');
  };

  this.draw_background = function() {
    var w = this.width;
    var h = this.height;
    this.draw_context.clearRect(0, 0, w, h); 
    this.line(w/2, 0, w/2, h, "#040", 1);
    this.line(0, h/2, w, h/2, "#040", 1);
  }
}


//////////////////////////////////////////////////
//  The Z-Slab this_item that sits on the right-hand
//  side of the canvas
//////////////////////////////////////////////////


var ZSlabDisplay = function(canvas, scene, controller) {
  this.canvas = canvas;
  this.controller = controller;
  this.scene = scene;
  this.max_z_length = 2.0*this.scene.protein.max_length;

  this.width = 30;
  this.height = function() { 
    return this.canvas.height - 10; 
  }
  
  this.x = function() {
    return this.canvas.width - this.width - 1;
  }
  this.y = 5;

  this.inside = function(x, y) {
    if ((x >= this.x()) &&
        (x <= this.x() + this.width) &&
        (y >= this.y) &&
        (y <= this.y + this.height())) {
      return true;
    }
    return false;
  }
  
  this.y_to_z = function(y) {
    var z = (0.5 - (y-this.y)/this.height())*this.max_z_length
    return z;
  }

  this.draw_background = function() {
    this.canvas.draw_context.fillStyle = 
        "rgba(40, 40, 40, 0.75)";
    this.canvas.draw_context.fillRect(
      this.x(), this.y, this.width, this.height());
    this.canvas.text(
        'zslab', this.x() + this.width/2, this.y + 12,
        '14px serif', "rgb(0, 130, 0)", 'center');
  }

  this.draw_protein_box = function() {
    var protein = this.scene.protein;
    var min_z = protein.min_z;
    var max_z = protein.max_z;
    var fraction = max_z/this.max_z_length;
    var y1 = this.y + (0.5 - fraction)*this.height();
    fraction = (max_z - min_z)/this.max_z_length
    var height1 = fraction*this.height();
    this.canvas.draw_context.fillStyle = 
        "rgba(60, 60, 60, 0.75)";
    this.canvas.draw_context.fillRect(
        this.x()+2, y1, this.width-4, height1);
  }

  this.draw_cutoffs = function() {
    var ym = this.y + this.height()/2;
    var x1 = this.x();
    var x2 = this.x()+this.width;

    this.canvas.line(x1, ym, x2, ym, "#040", 1);

    var font = '14px serif';
    var camera = this.scene.current_view.camera;
    if (this.controller.is_too_much_atomic_detail()) {
      var color = "rgb(100, 120, 0)";
    } else {
      var color = "rgb(0, 150, 0)";
    }

    var x1 = this.x();
    var x2 = this.x()+this.width;
    var y_mag = this.height() - 5;
    var fraction = camera.z_back/this.max_z_length;
    var y1 = this.y + (0.5 - fraction)*y_mag;
    this.canvas.line(x1, y1, x2, y1, color, 3);
    var xm = this.x() + this.width/2;
    var y2 = ym - 2;
    this.canvas.line(xm, y1, xm, y2, color, 3);
    this.canvas.text(
        'back', xm, y1-10, font, color, 'center');

    var y1 = ym + 2;
    fraction = camera.z_front/this.max_z_length;
    var y2 = this.y + (0.5 - fraction)*y_mag + 5;
    this.canvas.line(x1, y2, x2, y2, color, 3);
    this.canvas.line(xm, y1, xm, y2, color, 3);
    this.canvas.text(
        'front', xm, y2+10, font, color, 'center');
  }
  
  this.draw = function() {
    this.draw_background();
    this.draw_protein_box();
    this.draw_cutoffs();
  }
  
  this.mousedown = function(x, y) {
    this.back = this.y_to_z(y) > 0;
    this.front = !this.back;
    this.mousemove_y(y);
  }  

  this.mousemove_y = function(y) {
    var z = this.y_to_z(y);
    var camera = this.scene.current_view.camera;
    if (this.back) {
      camera.z_back = Math.max(2, z);
    } else if (this.front) {
      camera.z_front = Math.min(-2, z);
    }
    this.scene.changed = true;
  }
  
  this.mouseup = function() {
    this.front = false;
    this.back = false;
  }
  
  this.is_mouse_pressed = function() {
    return this.front || this.back;
  }
}



///////////////////////////////////////////////////////
// 
// ProteinDisplay draws the Protein in the current View
// onto the Canvas, and sends mouse input to the 
// Controller.
//
///////////////////////////////////////////////////////


element_rgb = {
  "X": [100, 110, 100],
  "C": [180, 180, 180],
  "N": [100, 100, 255],
  "O": [255, 100, 100],
  "H": [200, 200, 180],
  "S": [255, 255, 100],
}


function fraction_rgb(rgb, f) {
  return [ 
      Math.round(f*rgb[0]), 
      Math.round(f*rgb[1]),
      Math.round(f*rgb[2])];
}


function rgb_to_string(rgb) {
  return 'rgb(' + 
     Math.round(rgb[0]) + ', ' + 
     Math.round(rgb[1]) + ', ' + 
     Math.round(rgb[2]) + ')';
}


function z_compare(a, b) { 
  return b.z - a.z; 
}


function max_z_of_list(v_list) {
  var z = v_list[0].z;
  for (var i=1; i<v_list.length; i+=1) {
    if (v_list[i].z > z) {
      z = v_list[i].z;
    }
  }
  return z;
}


function z_rgb(z, rgb, camera) {
  var z_diff = camera.z_back - z;
  var z_fraction = z_diff/camera.z_back;
  if (z_fraction < 0.1) {
    z_fraction = 0.1;
  } else if (z_fraction > 1) {
    z_fraction = 1;
  }
  return fraction_rgb(rgb, z_fraction);
}


var ProteinDisplay = function(scene, canvas, controller) {
  this.scene = scene;
  this.controller = controller;
  this.protein = scene.protein;
  this.canvas = canvas;
  this.z_list = [];

  this.hover_atom = null;
  this.hover_dist = null;
  this.hover_label = null;
  this.pressed_atom = null;
  this.is_measuring_distance = false;
  this.is_mouse_pressed = false;
  this.pinch_reference_zoom = -1;
  
  this.zslab_display = new ZSlabDisplay(canvas, scene, controller);

  backbone_atoms = [
    'N', 'C', 'O', 'H', 'HA', 
    'P', 'OP1', "O5'", 'OP2', "C5'", "O5'", "O3'", "C4'"];

  this.atom_filter = function(a) {
    var show = this.scene.current_view.show;
    if (a.elem == "H" && !show.hydrogen) {
      return false;
    }
    if (a.is_water) {
      return show.water;
    }
    if (a.is_ligands) {
      return show.ligands;
    }    
    // only protein left, always show
    if (a.type == "CA" || a.type == "C3'") {
      return true;
    }
    if (in_array(a.type, backbone_atoms)) {
      return show.all_atom;
    }
    return show.sidechain;
  }

  this.is_visible = function(pos) {
    return this.scene.current_view.camera.is_visible_z(pos.z);
  }
  
  this.make_z_list = function() {
    this.z_list = [];
    for (i=0; i<this.protein.atoms.length; i+=1) {
      var a = this.protein.atoms[i];
      if (this.atom_filter(a)) {
        if (this.is_visible(this.protein.atoms[i])) {
          this.protein.atoms[i].is_atom = true;
          this.protein.atoms[i].is_bond = false;
          this.protein.atoms[i].is_dist = false;
          this.z_list.push(this.protein.atoms[i]);
        }
      }
    }
    for (j=0; j<this.protein.bonds.length; j+=1) {
      var bond = this.protein.bonds[j];
      if (this.atom_filter(bond.atom1) && 
          this.atom_filter(bond.atom2)) {
          if (this.is_visible(bond.atom1.pos) &&
              this.is_visible(bond.atom2.pos)) {
            bond.is_atom = false;
            bond.is_bond = true;
            bond.is_dist = false;
            bond.r = atom_radius/2;
            this.z_list.push(bond);
          }
      }
    }
    if (this.scene.current_view.show.trace) {
      for (var j=0; j<this.protein.trace.length; j+=1) {
        var trace = this.protein.trace[j];
        if (this.is_visible(trace.atom1.pos) &&
            this.is_visible(trace.atom2.pos)) {
          trace.is_atom = false;
          trace.is_bond = true;
          trace.is_dist = false;
          trace.r = 1*atom_radius;
          this.z_list.push(trace);
        }
      }
    }
    if (this.scene.current_view.show.ribbon) {
      for (i=0; i<this.protein.ribbons.length; i+=1) {
        var ribbon = this.protein.ribbons[i];
        if (this.is_visible(ribbon.bond[0].pos) &&
            this.is_visible(ribbon.bond[1].pos)) {
          ribbon.is_atom = false;
          ribbon.is_bond = false;
          ribbon.is_quad = true;
          ribbon.is_dist = false;
          this.z_list.push(ribbon);
        }
      }
    }
    var distances = this.scene.current_view.distances;
    for (var i=0; i<distances.length; i+=1) {
      var atom1 = this.protein.atoms[distances[i].i_atom1];
      var atom2 = this.protein.atoms[distances[i].i_atom2];
      if (this.atom_filter(atom1) && 
          this.atom_filter(atom2)) {
        if (this.is_visible(atom1.pos) &&
            this.is_visible(atom2.pos)) {
          var dist = {}
          dist.atom1 = atom1;
          dist.atom2 = atom2;
          dist.z = distances[i].z;
          dist.is_atom = false;
          dist.is_bond = false;
          dist.is_quad = false;
          dist.is_dist = true;
          this.z_list.push(dist);
        }
      }
    }
    
    this.z_list.sort(z_compare);
  }

  this.project_to_canvas = function(pos) {
    var z = pos.z + this.scene.current_view.camera.zoom;
    return v3.create(
      this.canvas.scale*pos.x/z + this.canvas.half_width,
      this.canvas.scale*pos.y/z + this.canvas.half_height,
      z);
  }

  this.scan_for_hover_atom = function(x, y) {
    this.hover_atom = null;
    this.hover_dist = null;
    this.hover_label = null;
    for (var i=0; i<this.z_list.length; i+=1) {
      if (this.z_list[i].is_atom) {
        a = this.z_list[i];
        proj = this.project_to_canvas(a.pos);
        i_atom = a.i;
        for (var m=0; m<this.scene.current_view.labels.length; m+=1) {
          var i_atom_label = this.scene.current_view.labels[m].i_atom;
          if (i_atom == i_atom_label) {
            var w = 100;
            var h = 20;
            var y1 = 30;
            if (x >= (proj.x-w/2) && x <= (proj.x+w/2) && 
                y >= (proj.y-h-y1) && y <= (proj.y-y1)) {
              this.hover_label = this.scene.current_view.labels[m];
            }
          }
        }
        r = this.canvas.scale*atom_radius/proj.z;
        y_diff = proj.y - y;
        x_diff = proj.x - x;
        r_sq = y_diff*y_diff + x_diff*x_diff;
        if (r_sq < r*r) {
          this.hover_atom = a;
        }
      } else if (this.z_list[i].is_dist) {
        d = this.z_list[i];
        if (this.is_visible(d.atom1.pos) &&
            this.is_visible(d.atom2.pos)) {
          var w = 40;
          var h = 14;
          proj1 = this.project_to_canvas(d.atom1.pos);
          proj2 = this.project_to_canvas(d.atom2.pos);
          xm = (proj1.x + proj2.x)/2;
          ym = (proj1.y + proj2.y)/2;
          if (x >= xm-w/2 && x <= xm+w/2 &&
              y >= ym-h/2 && y <= ym+h/2) {
              this.hover_dist = d;
          }
        }
      } 
    }
  }

  this.rgb_from_z_obj = function(z_obj) {
    if (z_obj.is_atom) {
      if (this.hover_atom === z_obj) {
        return [0, 255, 0];
      }
      atom_elem = z_obj.elem;
      if (atom_elem in element_rgb) {
        return element_rgb[atom_elem];
      }
    }
    return element_rgb['X'];
  }

  this.i_atom_of_label = function(z_obj) {
    for (var i=0; i<this.scene.current_view.labels.length; i+=1) {
      var i_atom = this.scene.current_view.labels[i].i_atom;
      if (i_atom == z_obj.i) {
        return i;
      }
    }
    return -1;
  }
  
  this.draw_distance = function(pos1, pos2, fill_style) { 
    var width = 40;
    var height = 14;
    var text = v3.distance(pos1, pos2).toFixed(2);
    proj1 = this.project_to_canvas(pos1);
    proj2 = this.project_to_canvas(pos2);
    xm = (proj1.x + proj2.x)/2;
    ym = (proj1.y + proj2.y)/2;
    this.canvas.draw_context.fillStyle = fill_style;
    this.canvas.draw_context.fillRect(
        xm-width/2, ym-height/2, width, height);
    this.canvas.line(
        proj1.x, proj1.y, proj2.x, proj2.y, fill_style, 2);
    this.canvas.text(
        text, xm, ym, '10px sans-serif', '#000', 'center');
  }
  
  this.draw_z_list = function() {
    for (var k=0; k<this.z_list.length; k+=1) {
      var z_obj = this.z_list[k];
      var z = z_obj.z;
      rgb = z_rgb(
          z_obj.z, this.rgb_from_z_obj(z_obj), 
          this.scene.current_view.camera);
      var color = rgb_to_string(rgb);
      var edge_color = rgb_to_string(fraction_rgb(rgb, 0.5));
      var z_disp = z+this.scene.current_view.camera.zoom;
      if (z_obj.is_atom) {
        r = this.canvas.scale*atom_radius/z_disp;
        proj = this.project_to_canvas(z_obj.pos);
        this.canvas.solid_circle(
            proj.x, proj.y, r, color, edge_color);
        var m = this.i_atom_of_label(z_obj);
        if (m >= 0) {
          if (this.scene.current_view.labels[m] == this.hover_label) {
            var in_rgb = [180, 100, 100];
          } else {
            var in_rgb = [180, 180, 180];
          }
          rgb = z_rgb(z_obj.z, in_rgb, this.scene.current_view.camera);
          this.canvas.draw_popup(
             proj.x, proj.y, '' + this.scene.current_view.labels[m].text,
             rgb_to_string(rgb));
        }   
      } else if (z_obj.is_bond) {
        r = this.canvas.scale*z_obj.r/z_disp;
        proj2 = this.project_to_canvas(z_obj.atom1.pos);
        proj3 = this.project_to_canvas(z_obj.atom2.pos);
        this.canvas.solid_line(
            proj2.x, proj2.y, proj3.x, proj3.y, 
            r, color, edge_color);
      } else if (z_obj.is_quad) {
        proj1 = this.project_to_canvas(z_obj.quad_coords[0]);
        proj2 = this.project_to_canvas(z_obj.quad_coords[1]);
        proj3 = this.project_to_canvas(z_obj.quad_coords[2]);
        proj4 = this.project_to_canvas(z_obj.quad_coords[3]);
        this.canvas.quad(
            proj1.x, proj1.y, proj2.x, proj2.y,
            proj3.x, proj3.y, proj4.x, proj4.y, 
            color, edge_color);
      } else if (z_obj.is_dist) {
        if (z_obj == this.hover_dist) {
          var in_rgb = [180, 100, 100];
        } else {
          var in_rgb = [100, 180, 100];
        }
        rgb = z_rgb(z_obj.z, in_rgb, this.scene.current_view.camera);
        this.draw_distance(
            z_obj.atom1.pos, z_obj.atom2.pos, rgb_to_string(rgb));
      }
    }
  }
  
  this.draw_hover_popup = function() {
    if (this.hover_atom != null) {
      if (this.is_visible(this.hover_atom.pos)) {
        proj = this.project_to_canvas(this.hover_atom.pos);
        this.canvas.draw_popup(
            proj.x, proj.y, '' + this.hover_atom.label,
            "rgba(255, 255, 255, 0.7)");
      }
    }
  }
  
  this.draw = function() {
    this.canvas.draw_background();
    this.make_z_list();
    this.draw_z_list();
    this.scan_for_hover_atom(
      this.canvas.x_mouse, this.canvas.y_mouse)
    this.draw_hover_popup();
    this.zslab_display.draw();
    if (this.is_measuring_distance) {
      var centered_atom = this.scene.centered_atom();
      if (this.hover_atom == centered_atom) {
      } else if (this.hover_atom == null) {
        this.canvas.line(
            this.canvas.half_width, this.canvas.half_height,
            this.canvas.x_mouse, this.canvas.y_mouse, 
            'green', 2);
      } else {
        this.draw_distance(
            this.hover_atom.pos, centered_atom.pos, 
            "rgba(100, 180, 100, 0.7)");
      }
    }
  }

  this.gesturestart = function(event) {
    event.preventDefault();
    this.pinch_reference_zoom = this.scene.current_view.camera.zoom;
    return false;
  }
  
  this.gesturechange = function(event) {
    event.preventDefault();
    var camera = this.scene.current_view.camera;
    var zoom_dif = this.pinch_reference_zoom/event.scale - camera.zoom;
    this.controller.adjust_zoom(y_diff);
    return false;
  }
  
  this.gestureend = function(event) {
    this.pinch_reference_zoom = -1;
    return false;
  }

  this.mousedown = function(event) {
    this.canvas.extract_mouse_xy(event);
    var x = this.canvas.x_mouse;
    var y = this.canvas.y_mouse;
    this.scan_for_hover_atom(x, y);
    
    if (this.zslab_display.inside(x, y)) {
      this.zslab_display.mousedown(x, y);
      this.scene.changed = true;
      return false;
    }

    this.x_mouse_pressed = this.canvas.x_mouse;
    this.y_mouse_pressed = this.canvas.y_mouse;
    this.pressed_atom = this.hover_atom;
    this.is_mouse_pressed = true;

    if (this.hover_dist != null) {
      this.controller.delete_dist(this.hover_dist);
    } else if (this.hover_label != null) {
      this.controller.delete_label(this.hover_label);
    } else if (this.pressed_atom != null &&
        this.scene.centered_atom() == this.pressed_atom) {
      this.is_measuring_distance = true;
    } else {
      this.controller.hide_atomic_details_for_mousemove();
    }
    
    this.scene.changed = true;
    return false;
  }
  
  this.console_mouse = function() {
    if (this.hover_atom != null) {
      console.log("hover " + this.hover_atom);
    } else {
      console.log("hover null");
    }
  }
  
  this.mousemove = function(event) {
    this.canvas.extract_mouse_xy(event);
    var x = this.canvas.x_mouse;
    var y = this.canvas.y_mouse;
    this.scan_for_hover_atom(x, y);
    this.scene.changed = true;

    if (this.zslab_display.is_mouse_pressed()) {
      this.zslab_display.mousemove_y(y);
      return false;
    }
    
    if ((this.pinch_reference_zoom > 0) || 
        (!this.is_mouse_pressed) ||
        (this.is_measuring_distance)) {
      return false;
    }

    var shift_down = (event.shiftKey==1);
    var right_mouse_button = (event.button == 2) || 
                             (event.which==3);
    x_diff = x - this.x_mouse_pressed;
    y_diff = y - this.y_mouse_pressed;
    if (shift_down || right_mouse_button) {
      this.controller.adjust_zoom(0.25*y_diff);
      this.controller.rotate_z(0.025*x_diff);
    } else {
      this.controller.rotate_xy(0.025*y_diff, -0.025*x_diff);
    }
    this.x_mouse_pressed = x;
    this.y_mouse_pressed = y;

    this.scene.changed = true;
    
    return false;
  }
  
  this.mouseup = function(event) {
    if (this.zslab_display.is_mouse_pressed()) {
      this.zslab_display.mouseup();
      return false;
    } 
    if (this.is_measuring_distance) {
      if (this.hover_atom !== null &&
          this.hover_atom !== this.scene.centered_atom()) {
        this.controller.make_dist(
          scene.centered_atom(), this.hover_atom);
      }
      this.is_measuring_distance = false;
    } else {
      this.controller.restore_atomic_details_after_mousemove();
      if (this.pressed_atom != null) {
        this.canvas.extract_mouse_xy(event);
        this.make_z_list();
        var x = this.canvas.x_mouse;
        var y = this.canvas.y_mouse;
        this.scan_for_hover_atom(x, y);
        if (this.pressed_atom == this.hover_atom) {
          this.controller.set_target_view_by_atom(this.hover_atom);
        }
      }
    }
    this.is_mouse_pressed = false;
    return false;
  }

}


/////////////////////////////////////
// show option controls
/////////////////////////////////////


function set_backbone_option(option) {
  $('#all_atom').attr('checked', false);
  $('#trace').attr('checked', false);
  $('#ribbon').attr('checked', false);
  $('#' + option).attr('checked', true);
  controller.set_backbone_option(option);
}


function set_show_option(option, bool) {
  var check_id = 'input[name=' + option + ']';
  $(check_id).attr('checked', bool);
  controller.set_show_option(option, bool);
}


function toggle_show_option(option) {
  set_show_option(option, !controller.get_show_option(option));
}


function create_option_display() {
  function register_show_checkbox(name) {
    var check_id = 'input[name=' + name + ']';
    $(check_id).click(function() { 
      var v = $(check_id + ':checked').val();
      scene.current_view.show[name] = v;
      scene.changed = true;
    });
    $(check_id).attr('checked', scene.current_view.show[name]);
  }
  register_show_checkbox('sidechain');
  register_show_checkbox('water');
  register_show_checkbox('hydrogen');
  register_show_checkbox('ligands');

  var check_id = 'input[name=backbone]';
  $(check_id).click(function() { 
    var v = $(check_id + ':checked').val();
    controller.set_show_option(v, true);
  });
}


function update_option_display() {
  set_show_option('ligands', scene.current_view.show.ligands);
  set_show_option('hydrogen', scene.current_view.show.hydrogen);
  set_show_option('sidechain', scene.current_view.show.sidechain);
  set_show_option('water', scene.current_view.show.water);
  if (scene.current_view.show.ribbon) {
    set_backbone_option('ribbon');
  } else if (scene.current_view.show.trace) {
    set_backbone_option('trace');
  } else {
    set_backbone_option('all_atom');
  }
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
        this.div[i].css({"border":"1px dotted #CCC"});
        $("#sequence").scrollTo(this.div[i]);
      } else {
        this.div[i].css({"border":"1px solid white"});
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
  
  this.goto_next_view = function() {
    var res_id = this.scene.current_view.res_id;
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

  this.goto_prev_view = function() {
    var res_id = this.scene.current_view.res_id;
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
  
  var sequence_div = $("#sequence");
  var sequence_display = this;
  for (var i=0; i<this.protein.residues.length; i+=1) {
    var res_id = this.protein.residues[i].id;
    var res_type = this.protein.residues[i].type;
    var html = html_pad(res_id, 7) + html_pad(res_type, 3)
    var elem = $("<div></div>")
        .css({'display':'block'})
        .append($("<a>")
          .attr("href", "#" + res_id)
          .css({"display":"block",
                "margin":"0",
                "padding":"0"})
          .html(html)
          .click(function() { 
              var m = this.href.split('#')[1];
              controller.set_target_view_by_res_id(m);
              sequence_display.reset_borders();
          }))
    sequence_div.append(elem);
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


function resize_window(event) {
  var w = window.innerWidth - 550;
  var h = window.innerHeight - 150;
  canvas.dom.width = w;
  canvas.dom.height = h;
  canvas.width = w;
  canvas.height = h;
  canvas.half_width = w/2;
  canvas.half_height = h/2;
  canvas.scale = Math.sqrt(h*h + w*w);
  $('#middle').width(w);
  $('#views').height(h + 40);
  $('#sequence').height(h + 40);
}


function get_pdb_id_from_url(loc) {
  var pieces = loc.split('#')[0].split('/');
  var i = pieces.length-1;
  return pieces[i];
}


function init_pdb(pdb_id) {
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
          'padding':30,
          'font-size':'1.5em',
          'background-color':'black',
          'position':'absolute',
          'z-index':9000,
          'top':offset.top + 30,
          'left':offset.left + 30,
      })
    c.append(loading_dialog)
    loading_dialog.ajaxError(function(event, XMLHttpRequest, ajaxOptions) {
      $(this).text('Server timed out.');
    });
  }

  function success(data, textStatus, XMLHttpRequest) {
    eval(data);
    if ("// Sorry" == data.substring(0, 8)) {
      msg = 'Sorry, but Google App Engine has <br>' + 
            'a 1MB restriction in fetching structures<br>' + 
            'from external sites such as the PDB.';
      $('#loading_message').html(msg);
      return;
    }
    if (typeof lines == "undefined" || lines.length == 0) {
      $('#loading_message').html('Structure not found');
      return;
    }
    loading_dialog.remove();
    protein = new Protein();
    protein.load(lines, bond_pairs, max_length);
    scene = new Scene(protein);
    controller = new Controller(scene)
    protein_display = new ProteinDisplay(scene, canvas, controller);
    annotations_display = new AnnotationsDisplay(scene, controller);
    annotations_display.load_views_from_server(pdb_id);
    sequence_display = new SequenceDisplay(scene, controller);
    create_option_display();
  }

  function load_user(data, textStatus, XMLHttpRequest) {
    user = data;
    // console.log('user = ' + user);
  }

  create_loading_dialog(pdb_id);
  $.get('/pdb/' + pdb_id + '.js', success);
  $.get('/ajax/user', load_user);
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
  var w2 = 200;
  var h2 = 60;
  var o = 70;
  var dialog = $('<div>')
      .css({'position':'absolute',
            'left': l + w/2 - w2/2,
            'top': t + h/2 - h2/2 - o,
            'width':w2,
            'height':h2,
            'padding':10,
            'z-index':'9000',
            'background':'#FFF'})
  var edit_text = $("<textarea></textarea>")
    .attr("type", "text")
    .css({"width":'100%',
          "height":h2-12,
          "font-family":"serif",
          "font-size":"1.33em"})
    .click(do_nothing);
  var save = $('<a></a>')
    .attr("href", "")
    .css({"font-size":"1em"})
    .html("[save]")
    .click(
        function(event) { 
          var text = edit_text.val();
          scene.make_label(
              protein_display.scene.current_view.i_atom,
              text);
          keyboard_lock = false;
          dialog.remove();
          return false; 
        });
  var discard = $('<a></a>')
    .css({"margin-right":"3em", "font-size":"1em"})
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
    var c = String.fromCharCode(event.keyCode);
    var s = "[" + c + "]";
    if (c == 'V') {
      annotations_display.make_new_annotation();
      return;
    } else if (event.keyCode == 38) {
      scene.i_last_view -= 1;
      if (scene.i_last_view < 0) {
        scene.i_last_view = scene.saved_views.length - 1;
      }
      var id = scene.saved_views[scene.i_last_view].id;
      annotations_display.set_target_by_view_id(id);
    } else if ((c == "K") || (event.keyCode == 37)) {
      sequence_display.goto_prev_view();
    } else if ((c == "J") || (event.keyCode == 39)) {
      sequence_display.goto_next_view();
    } else if (c == " " || event.keyCode == 40) {
      scene.i_last_view += 1;
      if (scene.i_last_view >= scene.saved_views.length) {
        scene.i_last_view = 0;
      }
      var id = scene.saved_views[scene.i_last_view].id;
      annotations_display.set_target_by_view_id(id);
    } else if (c == 'B') {
      if (scene.current_view.show.all_atom) {
        set_backbone_option('ribbon');
      } else if (scene.current_view.show.ribbon) {
        set_backbone_option('trace');
      } else if (scene.current_view.show.trace){
        set_backbone_option('all_atom');
      }
    } else if (c == 'L') {
      toggle_show_option('ligands');
    } else if (c == 'S') {
      toggle_show_option('sidechain');
    } else if (c == 'W') {
      toggle_show_option('water');
    } else if (c == 'H') {
      toggle_show_option('hydrogen');
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
  canvas.dom.addEventListener(
      'mousedown', 
      function(e) { protein_display.mousedown(e); }, 
      false);
  canvas.dom.addEventListener(
      'mousemove',
      function(e) { protein_display.mousemove(e); }, 
      false);
  canvas.dom.addEventListener(
      'mouseup', 
      function(e) { protein_display.mouseup(e); }, 
      false);
  canvas.dom.addEventListener(
      'touchstart', 
      function(e) { 
          e.preventDefault();
          protein_display.mousedown(e); 
      }, 
      false);
  canvas.dom.addEventListener(
      'touchmove',
      function(e) { 
          e.preventDefault();
          protein_display.mousemove(e); 
      }, 
      false);
  canvas.dom.addEventListener(
      'touchend', 
      function(e) { protein_display.mouseup(e); }, 
      false);
  canvas.dom.addEventListener(
      'touchcancel', 
      function(e) { protein_display.mouseup(e); }, 
      false);
  canvas.dom.addEventListener(
      'gesturestart',
      function(e) { 
          protein_display.gesturestart(e);
      }, 
      false);
  canvas.dom.addEventListener(
      'gesturechange',
      function(e) { 
          protein_display.gesturechange(e); 
      }, 
      false);
  canvas.dom.addEventListener(
      'gestureend',
      function(e) { protein_display.gestureend(e); }, 
      false);
  document.oncontextmenu = do_nothing;
  document.onkeydown = onkeydown;
  canvas.dom.onselectstart = do_nothing;
  canvas.dom.unselectable = "on";
  $(window).resize(
      function() { 
        resize_window(); 
        scene.changed = true;
      });
  $("#save_view").click(
      function() {
        annotations_display.make_new_annotation();
        return false;
      });  
}


function loop() {
  if (typeof scene !== 'undefined') {
    scene.animate();
    if (scene.changed) {
      update_option_display();
      protein_display.draw();
      scene.changed = false;
    }
    if (scene.is_new_view_chosen) {
      annotations_display.reset_borders();
      sequence_display.reset_borders();
      scene.is_new_view_chosen = false;
    }
  }
  timer = setTimeout('loop()', 20)
}


function init() {
  canvas = new Canvas($('#imageView')[0]);
  resize_window();
  register_callacks();
  pdb_id = get_pdb_id_from_url(url());
  $('title').html('jolecule - pdb:' + pdb_id);
  init_pdb(pdb_id);
  loop();
}


if (window.addEventListener) {
  window.addEventListener('load', init, false); 
}
