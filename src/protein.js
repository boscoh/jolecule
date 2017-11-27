////////////////////////////////////////////////////
//
// Protein
// -------
// The main data object that holds information
// about the protein. This object is responsible
// for reading the data from the PDB and turning
// it into a suitable javascript object.
// 
// The protein will be embedded in a Scene
// object that will handle all the different 
// viewing options.
// 
// Allowable actions on the Scene of the Protein
// will be made via the Controller object. This
// includes AJAX operations with the server 
// jolecule.appspot.com, and uses jQuery for the
// i/o operations with the server.
// 
////////////////////////////////////////////////////


import v3 from "./v3";

import {getWindowUrl, inArray, getCurrentDateStr} from "./util.js";

var user = 'public'; // will be overriden by server

function extract_atom_lines(data) {
  var lines = data.split(/\r?\n/);
  var pdb_lines = [];
  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if ((line.slice(0, 4) === "ATOM") ||
      (line.slice(0, 6) === "HETATM")) {
      pdb_lines.push(line);
    }
    if (line.slice(0, 3) == "END") {
      break;
    }
  }
  return pdb_lines;
}


function parsetTitleFromPdbText(text) {
  let result = "";
  let lines = text.split(/\r?\n/);
  for (let line of lines) {
    if (line.substring(0, 5) == 'TITLE') {
      result += line.substring(10);
    }
  }
  return result;
}


function get_central_atom_from_atom_dict(atom_dict) {
  var pos = v3.create(0, 0, 0);
  var n = 0;
  for (var k in atom_dict) {
    pos = v3.sum(pos, atom_dict[k].pos);
    n += 1;
  }
  pos.divideScalar(n);
  var central_atom = null
  var min_d = 1E6
  for (var k in atom_dict) {
    if (central_atom == null) {
      central_atom = atom_dict[k];
      continue;
    }
    var d = v3.distance(pos, atom_dict[k].pos);
    if (d < min_d) {
      central_atom = atom_dict[k];
      min_d = d;
    }
  }
  return central_atom;
}


var Protein = function () {
  this.atoms = [];
  this.bonds = [];
  this.res_by_id = {};
  this.residues = [];
  this.ribbons = [];
  this.trace = [];
  this.parsing_error = '';
  this.default_html = "";

  var aa = ['ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS',
    'ILE', 'LYS', 'LEU', 'MET', 'ASN', 'PRO', 'GLN',
    'ARG', 'SER', 'THR', 'TRP', 'VAL', 'TYR'];
  var dna = ['DA', 'DT', 'DG', 'DC', 'A', 'T', 'G', 'C'];
  var rna = ['RA', 'RU', 'RC', 'RG', 'A', 'G', 'C', 'U'];
  var chonp = ['C', 'H', 'O', 'N', 'P'];

  function delete_numbers(text) {
    return text.replace(/\d+/, '')
  }

  this.make_atoms_from_pdb_lines = function (lines, pdb_id) {
    let atoms = [];
    if (lines.length == 0) {
      this.parsing_error = 'No atom lines';
      return
    }
    var chains = [];
    var i_chain = -1;
    for (var i = 0; i < lines.length; i += 1) {
      try {
        if (lines[i].substr(0, 4) == "ATOM" ||
          lines[i].substr(0, 6) == "HETATM") {
          var x = parseFloat(lines[i].substr(30, 7));
          var y = parseFloat(lines[i].substr(38, 7));
          var z = parseFloat(lines[i].substr(46, 7));
          var chain = _.trim(lines[i][21]);
          var res_num = _.trim(lines[i].substr(22, 5));
          var res_type = _.trim(lines[i].substr(17, 3));
          var atom_type = _.trim(lines[i].substr(12, 4));
          var label = res_num + ' - ' + res_type +
            ' - ' + atom_type;
          var bfactor = parseFloat(lines[i].substr(60, 6));
          var elem = delete_numbers(_.trim(lines[i].substr(76, 2)));
          if (elem == "") {
            elem = delete_numbers(_.trim(atom_type)).substr(0, 1);
          }
          var is_chonmp = inArray(elem, chonp);

          var alt = _.trim(lines[i].substr(16, 1));

          if (chain) {
            label = chain + ":" + label;
          }
          if (chain == " ") {
            i_chain = -1;
          } else {
            i_chain = chains.indexOf(chain);
            if (i_chain == -1) {
              chains.push(chain);
              i_chain = chains.length - 1;
            }
          }
          var is_protein_or_nucleotide =
            inArray(res_type, aa) ||
            inArray(res_type, dna) ||
            inArray(res_type, rna);
          if (!is_protein_or_nucleotide) {
            i_chain = -1;
          }
          atoms.push({
              'pdb_id': pdb_id,
              'pos': v3.create(x, y, z),
              'res_type': res_type,
              'alt': alt,
              'is_alt': false,
              'chain': chain,
              'i_chain': i_chain,
              'is_chonmp': is_chonmp,
              'res_num': res_num,
              'elem': elem,
              'i': i,
              'type': atom_type,
              'label': label,
              'bfactor': bfactor
            }
          );
        }
      } catch (e) {
        this.parsing_error = 'line ' + i;
        console.log(`> Error: "${lines[i]}"`);
        return;
      }
    }
    return atoms;
  }

  this.get_central_atom = function () {
    var center = this.center();
    var central_atom = null;
    var min_d = 1E6
    for (var i = 0; i < this.atoms.length; i += 1) {
      if (central_atom == null) {
        central_atom = this.atoms[i];
        continue;
      }
      var d = v3.distance(center, this.atoms[i].pos);
      if (d < min_d) {
        central_atom = this.atoms[i];
        min_d = d;
      }
    }
    return central_atom;
  }

  this.get_res_id_from_atom = function (atom) {
    // console.log("Protein.get_res_id_from_atom", atom.pdb_id);
    var s = "";
    if (atom.pdb_id) {
      s += atom.pdb_id + ':';
    }
    if (atom.chain) {
      s += atom.chain + ':';
    }
    s += atom.res_num;
    return s;
  }

  this.get_prev_res_id = function (res_id) {
    var i = this.get_i_res_from_res_id(res_id);
    if (i <= 0) {
      i = this.residues.length - 1;
    } else {
      i -= 1;
    }
    ;
    return this.residues[i].id
  }

  this.get_next_res_id = function (res_id) {
    var i = this.get_i_res_from_res_id(res_id);
    if (i >= this.residues.length - 1) {
      i = 0;
    } else {
      i += 1;
    }
    ;
    return this.residues[i].id
  }

  this.make_bonds = function (bond_pairs) {
    this.bonds = []
    for (var i = 0; i < bond_pairs.length; i += 1) {
      var j = bond_pairs[i][0];
      var k = bond_pairs[i][1];
      this.bonds.push(
        {
          atom1: this.atoms[j],
          atom2: this.atoms[k],
          i_chain: this.atoms[k].i_chain
        });
    }
  }

  this.make_residue = function (a, res_id) {
    var new_r = {
      'chain': a.chain,
      'num': a.res_num,
      'type': a.res_type,
      'id': res_id,
      'selected': false,
      'atoms': {},
      'iAtom': null,
    }
    new_r.is_water = a.res_type == "HOH";
    var r_type = _.trim(new_r.type)
    new_r.is_protein = inArray(r_type, aa);
    new_r.is_nuc = inArray(r_type, dna) || inArray(r_type, rna);
    new_r.is_protein_or_nuc = new_r.is_protein || new_r.is_nuc;
    new_r.is_grid = a.res_type == "XXX";
    new_r.is_ligands = !new_r.is_water && !new_r.is_protein_or_nuc && !new_r.is_grid;
    this.res_by_id[res_id] = new_r;
    this.residues.push(new_r);
  }

  this.addResiduesFromNewAtoms = function (atoms) {
    var res_id = '';
    for (var i = 0; i < atoms.length; i += 1) {
      var a = atoms[i];
      var new_res_id = this.get_res_id_from_atom(a);
      if (new_res_id != res_id) {
        this.make_residue(a, new_res_id);
        res_id = new_res_id;
      }
      var res = this.res_by_id[res_id];
      if (a.type in res.atoms) {
        a.is_alt = true;
      } else {
        res.atoms[a.type] = a;
        a.is_alt = false;
      }
      a.res_id = res.id;
      a.is_water = res.is_water;
      a.is_protein_or_nuc = res.is_protein_or_nuc;
      a.is_ligands = res.is_ligands;
      a.is_grid = res.is_grid;
    }
    for (var i = 0; i < this.residues.length; i += 1) {
      var res = this.residues[i];
      res.i = i;
      if (this.has_aa_bb(i)) {
        res.iAtom = res.atoms["CA"].i
      } else if (this.has_nuc_bb(i)) {
        res.iAtom = res.atoms["C3'"].i
      } else {
        res.iAtom = get_central_atom_from_atom_dict(res.atoms).i
      }
    }
  }

  this.has_nuc_bb = function (i) {
    if ((i < 0) || (i >= this.residues.length)) {
      return false;
    }
    if (("C3'" in this.residues[i].atoms) &&
      ("O3'" in this.residues[i].atoms) &&
      ("C2'" in this.residues[i].atoms) &&
      ("C5'" in this.residues[i].atoms) &&
      ("C4'" in this.residues[i].atoms) &&
      ("O4'" in this.residues[i].atoms) &&
      ("C1'" in this.residues[i].atoms)) {
      return true;
    }
    return false;
  };

  this.isSugarPhosphateConnected = function (iRes0, iRes1) {
    let res0 = this.residues[iRes0]
    let res1 = this.residues[iRes1]

    if (('C3\'' in res0.atoms) &&
      ('C1\'' in res0.atoms) &&
      ('C5\'' in res0.atoms) &&
      ('O3\'' in res0.atoms) &&
      ('P' in res1.atoms) &&
      ('C3\'' in res1.atoms) &&
      ('C1\'' in res1.atoms) &&
      ('C5\'' in res1.atoms)) {
      // detect nucloetide phosphate sugar bond
      let o3 = res0.atoms['O3\'']
      let p = res1.atoms['P']
      if (v3.distance(o3.pos, p.pos) < 2.5) {
        return true
      }
    }

    return false
  }

  this.getNormalOfNuc = function (iRes) {
    let atoms = this.residues[iRes].atoms
    let forward = v3.diff(atoms['C3\''].pos, atoms['C5\''].pos)
    let up = v3.diff(atoms['C1\''].pos, atoms['C3\''].pos)
    return v3.crossProduct(forward, up)
  }

  this.has_aa_bb = function (i) {
    if ((i < 0) || (i >= this.residues.length)) {
      return false;
    }
    if (("CA" in this.residues[i].atoms) &&
      ("N" in this.residues[i].atoms) &&
      ("C" in this.residues[i].atoms)) {
      return true;
    }
    return false;
  };

  this.isPeptideConnected = function (iRes0, iRes1) {
    let res0 = this.residues[iRes0]
    let res1 = this.residues[iRes1]

    if (('C' in res0.atoms) &&
      ('N' in res1.atoms) &&
      ('CA' in res0.atoms) &&
      ('CA' in res1.atoms)) {
      // detect a potential peptide bond

      let c = res0.atoms['C']
      let n = res1.atoms['N']
      if (v3.distance(c.pos, n.pos) < 2) {
        return true
      }
    }

    return false
  }

  this.checkNonStandardResdiues = function() {
    let nResidue = this.getNResidue()
    for (let iResidue = 0; iResidue < nResidue; iResidue += 1) {

      let residue = this.getResidue(iResidue)

      if (!residue.is_protein_or_nuc) {
        // Handles non-standard amino-acids and nucleotides that are
        // covalently bonded with the correct atom types to
        // neighbouring residues
        if (iResidue > 0) {
          if (this.isPeptideConnected(iResidue - 1, iResidue)) {
            residue.iAtom = residue.atoms['CA'].i
            residue.is_protein_or_nuc = true
          } else if (this.isSugarPhosphateConnected(iResidue - 1, iResidue)) {
            residue.iAtom = residue.atoms['C3\''].i
            residue.is_protein_or_nuc = true
            residue.ss = 'R'
            residue.normal = this.getNormalOfNuc(iResidue)
          }
        }

        if (iResidue < nResidue - 1) {
          if (this.isPeptideConnected(iResidue, iResidue + 1)) {
            residue.iAtom = residue.atoms['CA'].i
            residue.is_protein_or_nuc = true
          } else if (this.isSugarPhosphateConnected(iResidue, iResidue + 1)) {
            residue.iAtom = residue.atoms['C3\''].i
            residue.is_protein_or_nuc = true
            residue.ss = 'R'
            residue.normal = this.getNormalOfNuc(residue)
          }
        }
      }
    }
  }

  this.assignBondsToResidues = function () {
    for (let res of this.residues) {
      res.bonds = []
    }

    for (let bond of this.bonds) {
      let atom1 = bond.atom1
      let atom2 = bond.atom2

      if (atom1.is_alt || atom2.is_alt) {
        continue
      }

      let res1 = this.res_by_id[atom1.res_id]
      let res2 = this.res_by_id[atom2.res_id]

      res1.bonds.push(bond)

      if (res1 !== res2) {
        res2.bonds.push(bond)
      }
    }
  }

  this.calc_max_length = function (atoms) {
    var maxima = [0.0, 0.0, 0.0];
    var minima = [0.0, 0.0, 0.0];
    var spans = [0.0, 0.0, 0.0];

    function comp(v, i) {
      if (i == 0) return v.x;
      if (i == 1) return v.y;
      if (i == 2) return v.z;
    }

    for (var j = 0; j < 3; j++) {
      for (var i = 0; i < atoms.length; i += 1) {
        if (minima[j] > comp(atoms[i].pos, j)) {
          minima[j] = comp(atoms[i].pos, j);
        }
        if (maxima[j] < comp(atoms[i].pos, j)) {
          maxima[j] = comp(atoms[i].pos, j);
        }
      }
      spans[j] = maxima[j] - minima[j];
    }
    return Math.max(spans[0], spans[1], spans[2]);
  }

  this.get_close_pairs = function (vertices) {
    var padding = 0.05;
    var div = 5.0;
    var inv_div = 1.0 / div;
    var maxima = [0.0, 0.0, 0.0];
    var minima = [0.0, 0.0, 0.0];
    var spans = [0.0, 0.0, 0.0];
    var sizes = [0, 0, 0];

    for (var i_dim = 0; i_dim < 3; i_dim++) {
      for (var i = 0; i < vertices.length; i += 1) {
        if (minima[i_dim] > vertices[i][i_dim]) {
          minima[i_dim] = vertices[i][i_dim];
        }
        if (maxima[i_dim] < vertices[i][i_dim]) {
          maxima[i_dim] = vertices[i][i_dim];
        }
      }
      minima[i_dim] -= padding;
      maxima[i_dim] += padding;
      spans[i_dim] = maxima[i_dim] - minima[i_dim];
      sizes[i_dim] = Math.ceil(spans[i_dim] * inv_div);
    }

    function vertex_to_space(v) {
      var result = []
      for (var j = 0; j < 3; j++) {
        result.push(Math.round((v[j] - minima[j]) * inv_div));
      }
      return result
    }

    function space_to_hash(s) {
      return s[0] * sizes[1] * sizes[2] + s[1] * sizes[2] + s[2];
    }

    var cells = {};
    var spaces = [];
    for (var i = 0; i < vertices.length; i++) {
      var vertex = vertices[i];
      var space = vertex_to_space(vertex);
      spaces.push(space);
      var space_hash = space_to_hash(space);
      if (!(space_hash in cells)) {
        cells[space_hash] = [];
      }
      cells[space_hash].push(i);
    }

    function neighbourhood_in_dim(space, i_dim) {
      var start = Math.max(0, space[i_dim] - 1);
      var end = Math.min(sizes[i_dim], space[i_dim] + 2);
      var result = [];
      for (var i = start; i < end; i++) {
        result.push(i);
      }
      return result;
    }

    function space_neighbourhood(space) {
      var result = [];
      var neighbourhood0 = neighbourhood_in_dim(space, 0);
      var neighbourhood1 = neighbourhood_in_dim(space, 1);
      var neighbourhood2 = neighbourhood_in_dim(space, 2);
      for (var s0 = 0; s0 < neighbourhood0.length; s0++) {
        for (var s1 = 0; s1 < neighbourhood1.length; s1++) {
          for (var s2 = 0; s2 < neighbourhood2.length; s2++) {
            result.push([neighbourhood0[s0],
              neighbourhood1[s1],
              neighbourhood2[s2]]);
          }
        }
      }
      return result;
    }

    var pairs = [];
    for (var i = 0; i < vertices.length; i++) {
      var neighbourhood = space_neighbourhood(spaces[i]);
      for (var j_neigh = 0; j_neigh < neighbourhood.length; j_neigh++) {
        var hash = space_to_hash(neighbourhood[j_neigh]);
        if (hash in cells) {
          var cell = cells[hash]
          for (var j_cell = 0; j_cell < cell.length; j_cell++) {
            var j = cell[j_cell];
            if (i < j) {
              pairs.push([i, j]);
            }
          }
        }
      }
    }
    return pairs;
  }

  this.calc_bonds = function (atoms) {

    var vertices = [];
    for (var i = 0; i < atoms.length; i++) {
      var atom = atoms[i];
      vertices.push([atom.pos.x, atom.pos.y, atom.pos.z]);
    }
    var close_pairs = this.get_close_pairs(vertices);

    var result = [];
    var small_cutoff = 1.2;
    var medium_cutoff = 1.9;
    var large_cutoff = 2.4;
    var CHONPS = ['C', 'H', 'O', 'N', 'P', 'S'];
    for (var i_pair = 0; i_pair < close_pairs.length; i_pair++) {
      var a0 = atoms[close_pairs[i_pair][0]];
      var a1 = atoms[close_pairs[i_pair][1]];
      // HACK: to avoid the water grid bond calculation
      // step that kills the rendering
      if ((a0.res_type == "HOH") || (a1.res_type == "HOH")) {
        continue;
      }
      if ((a0.res_type == "XXX") || (a1.res_type == "XXX")) {
        continue;
      }
      var dist = v3.distance(a0.pos, a1.pos);
      var cutoff;
      if ((a0.alt != "") && (a1.alt != "")) {
        if (a0.alt != a1.alt) {
          continue;
        }
      }
      if ((a0.elem == "H") || (a1.elem == "H")) {
        cutoff = small_cutoff;
      } else if (inArray(a0.elem, CHONPS) && inArray(a1.elem, CHONPS)) {
        cutoff = medium_cutoff;
      } else {
        cutoff = large_cutoff;
      }
      if (dist <= cutoff) {
        result.push(close_pairs[i_pair]);
      }
    }
    return result;
  }

  this.find_bb_hb_partners = function (self) {

    // Find backbone hydrogen bonds for secondary structure

    var vertices = [];
    var atoms = [];
    for (var j = 0; j < this.residues.length; j += 1) {
      var residue = this.residues[j];
      residue.hb_partners = [];
      residue.i = j;
      if (!residue.is_protein_or_nuc) {
        continue;
      }
      if ("O" in residue.atoms) {
        var a = residue.atoms["O"];
        vertices.push([a.pos.x, a.pos.y, a.pos.z])
        atoms.push(a);
      }
      if ("N" in residue.atoms) {
        var a = residue.atoms["N"];
        vertices.push([a.pos.x, a.pos.y, a.pos.z])
        atoms.push(a);
      }
    }

    var cutoff = 3.5;
    var close_pairs = this.get_close_pairs(vertices);
    for (var i_pair = 0; i_pair < close_pairs.length; i_pair++) {
      var a0 = atoms[close_pairs[i_pair][0]];
      var a1 = atoms[close_pairs[i_pair][1]];
      if (a0.res_id == a1.res_id) {
        continue;
      }
      var dist = v3.distance(a0.pos, a1.pos);
      if (dist <= cutoff) {
        var res0 = this.res_by_id[a0.res_id];
        var res1 = this.res_by_id[a1.res_id];
        if (!inArray(res1.i, res0.hb_partners)) {
          if ((a0.elem == "O") && (a1.elem == "N")) {
            res0.hb_partners.push(res1.i);
          }
        }
        if (!inArray(res0.i, res1.hb_partners)) {
          if ((a1.elem == "O") && (a0.elem == "N")) {
            res1.hb_partners.push(res0.i);
          }
        }
      }
    }
  }

  this.is_conh = function (i_res1, i_res0) {
    if ((i_res0 < 0) || (i_res0 >= this.residues.length)) {
      return false;
    }
    if ((i_res1 < 0) || (i_res1 >= this.residues.length)) {
      return false;
    }
    var i_res0 = this.residues[i_res0].i
    return inArray(i_res0, this.residues[i_res1].hb_partners);
  }

  this.res_diff = function (i_res0, i_res1) {
    var atom0 = this.getResidueCentralAtom(i_res0)
    var atom1 = this.getResidueCentralAtom(i_res1)
    return v3.diff(atom0.pos, atom1.pos);
  }

  this.find_ss = function () {

    // Find Secondary Structure
    // H - alpha-helix/3-10-helix
    // E - beta-sheet
    // C - coil
    // - - ligand
    // W - water
    // D - DNA or RNA
    // R - non-standard nucleotide

    for (var j = 0; j < this.residues.length; j += 1) {
      var residue = this.residues[j];
      residue.ss = "-";
      if (residue.is_water) {
        residue.ss = "W";
      }
      if (residue.is_protein_or_nuc) {
        if (this.has_nuc_bb(j)) {
          residue.ss = "D";
        }
        if (this.has_aa_bb(j)) {
          residue.ss = "C";
        }
      }
      residue.normals = [];
    }

    this.find_bb_hb_partners();

    var n_res = this.residues.length;
    for (var i_res1 = 0; i_res1 < this.residues.length; i_res1 += 1) {

      var residue = this.residues[i_res1];
      var atoms = residue.atoms;

      if (residue.ss == "D") {
        var forward = v3.diff(atoms["C3'"].pos, atoms["C5'"].pos);
        var up = v3.diff(atoms["C1'"].pos, atoms["C3'"].pos);
        var normal = v3.crossProduct(forward, up);
        residue.normals.push(normal);
      }

      // alpha-helix
      if (this.is_conh(i_res1, i_res1 + 4) && this.is_conh(i_res1 + 1, i_res1 + 5)) {
        var normal1 = this.res_diff(i_res1, i_res1 + 4);
        var normal2 = this.res_diff(i_res1 + 1, i_res1 + 5);
        for (var i_res2 = i_res1 + 1; i_res2 < i_res1 + 5; i_res2 += 1) {
          this.residues[i_res2].ss = 'H';
          this.residues[i_res2].normals.push(normal1);
          this.residues[i_res2].normals.push(normal2);
        }
      }

      // 3-10 helix
      if (this.is_conh(i_res1, i_res1 + 3) && this.is_conh(i_res1 + 1, i_res1 + 4)) {
        var normal1 = this.res_diff(i_res1, i_res1 + 3);
        var normal2 = this.res_diff(i_res1 + 1, i_res1 + 4);
        for (var i_res2 = i_res1 + 1; i_res2 < i_res1 + 4; i_res2 += 1) {
          this.residues[i_res2].ss = 'H';
          this.residues[i_res2].normals.push(normal1);
          this.residues[i_res2].normals.push(normal2);
        }
      }

      for (var i_res2 = i_res1 + 1; i_res2 < this.residues.length; i_res2 += 1) {

        if ((Math.abs(i_res1 - i_res2) <= 5)) {
          continue;
        }

        var beta_residues = [];

        // parallel beta sheet pairs
        if (this.is_conh(i_res1, i_res2 + 1) &&
          this.is_conh(i_res2 - 1, i_res1)) {
          beta_residues = beta_residues.concat(
            [i_res1, i_res2])
        }
        if (this.is_conh(i_res1 - 1, i_res2) &&
          this.is_conh(i_res2, i_res1 + 1)) {
          beta_residues = beta_residues.concat(
            [i_res1, i_res2])
        }

        // anti-parallel hbonded beta sheet pairs
        if (this.is_conh(i_res1, i_res2) &&
          this.is_conh(i_res2, i_res1)) {
          beta_residues = beta_residues.concat(
            [i_res1, i_res2])
          var normal = this.res_diff(i_res1, i_res2);
          this.residues[i_res1].normals.push(normal);
          this.residues[i_res2].normals.push(v3.scaled(normal, -1));
        }

        // anti-parallel non-hbonded beta sheet pairs
        if (this.is_conh(i_res1 - 1, i_res2 + 1) &&
          this.is_conh(i_res2 - 1, i_res1 + 1)) {
          beta_residues = beta_residues.concat(
            [i_res1, i_res2])
          var normal = this.res_diff(i_res1, i_res2);
          this.residues[i_res1].normals.push(v3.scaled(normal, -1));
          this.residues[i_res2].normals.push(normal);
        }

        for (var i = 0; i < beta_residues.length; i += 1) {
          var i_res = beta_residues[i];
          this.residues[i_res].ss = "E";
        }

      }

    }

    // average normals to make a nice average
    for (var i_res1 = 0; i_res1 < this.residues.length; i_res1 += 1) {
      var res = this.residues[i_res1];
      if (res.normals.length == 0) {
        res.normal = null;
      } else {
        var normal = v3.create(0, 0, 0);
        for (var i = 0; i < res.normals.length; i += 1) {
          normal = v3.sum(normal, res.normals[i]);
        }
        res.normal = v3.normalized(normal);
      }
    }

    // flip every second beta-strand normal so they are
    // consistently pointing in the same direction
    for (let i_res1 = 1; i_res1 < this.residues.length; i_res1 += 1) {
      let prevRes = this.residues[i_res1 - 1]
      let res = this.residues[i_res1];
      if ((res.ss === prevRes.ss) && (res.ss ==="E")) {
        if (res.normal.dot(prevRes.normal) < 0) {
          res.normal.negate()
        }
      }
    }

  }

  this.load = function (protein_data) {

    this.pdb_id = protein_data['pdb_id'];
    console.log(`> Protein.load parsing ${this.pdb_id}`);

    this.default_html = this.pdb_id + ": "
      + parsetTitleFromPdbText(protein_data['pdb_text']);

    var atom_lines = extract_atom_lines(protein_data['pdb_text']);
    let newAtoms = this.make_atoms_from_pdb_lines(atom_lines, this.pdb_id);

    this.atoms = _.concat(this.atoms, newAtoms);

    for (var i = 0; i < this.atoms.length; i += 1) {
      this.atoms[i].i = i;
    }

    this.addResiduesFromNewAtoms(newAtoms);

    this.checkNonStandardResdiues()

    console.log(`> Protein.load ${newAtoms.length} atoms`);

    this.make_bonds(this.calc_bonds(this.atoms));
    this.assignBondsToResidues()
    console.log(`> Protein.load ${this.bonds.length} bonds`);

    this.max_length = this.calc_max_length(this.atoms);

    this.find_ss();

    console.log(`> Protein.load ${this.residues.length} residues`);
  }

  this.getAtom = function (iAtom) {
    return this.atoms[iAtom]
  }

  this.getNAtom = function() {
    return this.atoms.length
  }

  this.getResidue = function (iRes) {
    return this.residues[iRes]
  }

  this.getResidueAtom = function(iRes, atomType) {
    return this.residues[iRes].atoms[atomType]
  }

  this.getResidueCentralAtom = function(iRes) {
    let res = this.residues[iRes]
    return this.getAtom(res.iAtom)
  }

  this.eachResidueAtom = function(iRes, callback) {
    for (let atom of _.values(this.residues[iRes].atoms))  {
      callback(atom)
    }
  }

  this.getNResidue = function() {
    return this.residues.length
  }

  this.center = function () {
    var x_center = 0;
    var y_center = 0;
    var z_center = 0;
    var n = this.atoms.length;
    for (var i = 0; i < n; i += 1) {
      x_center += this.atoms[i].pos.x;
      y_center += this.atoms[i].pos.y;
      z_center += this.atoms[i].pos.z;
    }
    return v3.create(
      x_center / n, y_center / n, z_center / n);
  }

  this.get_i_res_from_res_id = function (res_id) {
    for (var i = 0; i < this.residues.length; i += 1) {
      if (this.residues[i].id == res_id) {
        return i;
      }
    }
    return i;
  }

  this.clear_selected = function () {
    for (var i = 0; i < this.residues.length; i += 1) {
      this.residues[i].selected = false;
    }
  }

  this.are_close_residues = function (j, k) {
    var res_j = this.residues[j];
    var res_k = this.residues[k];
    var atom_j = this.getAtom(res_j.iAtom)
    var atom_k = this.getAtom(res_k.iAtom)
    if (v3.distance(atom_j.pos, atom_k.pos) > 17) {
      return false;
    }
    for (var l in res_j.atoms) {
      var atom_l = res_j.atoms[l];
      for (var m in res_k.atoms) {
        var atom_m = res_k.atoms[m];
        if (v3.distance(atom_l.pos, atom_m.pos) < 4) {
          console.log('> Protein.are_close_residues', atom_l.label, atom_m.label)
          return true;
        }
      }
    }
    return false;
  }

  this.select_neighbors = function (i_res, b) {
    this.residues[i_res].selected = b;
    let residue = this.getResidue(i_res)
    residue = this.residues[i_res]
    for (var j_res = 0; j_res < this.residues.length; j_res += 1) {
      if (this.are_close_residues(j_res, i_res)) {
        this.residues[j_res].selected = b;
      }
    }
  }

}


///////////////////////////////////////////
// Camera stores information about
// the direction and zoom that a protein
// should be viewed
///////////////////////////////////////////


var Camera = function () {
  this.pos = v3.create(0, 0, 0);
  this.up_v = v3.create(0, 1, 0);
  this.in_v = v3.create(0, 0, 1);
  this.zoom = 0.0;
  this.z_front = 0.0;
  this.z_back = 0.0;

  this.clone = function () {
    var c = new Camera();
    c.pos = this.pos.clone(),
      c.up_v = this.up_v.clone(),
      c.in_v = this.in_v.clone(),
      c.zoom = this.zoom,
      c.z_front = this.z_front,
      c.z_back = this.z_back;
    return c;
  }

  this.transform = function (matrix) {
    this.pos.applyMatrix4(matrix);
    this.up_v.applyMatrix4(matrix);
    this.in_v.applyMatrix4(matrix);
  }
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
  if (v3.isAligned(mov12, ref12)) {
    r1 = new v3.Matrix4();
    torsion1 = null;
  } else {
    axis1 = v3.crossProduct(mov12, ref12);
    torsion1 = v3.dihedral(ref12, axis1, mov12);
    r1 = v3.rotation(axis1, torsion1);
  }

  var axis2, torsion2, r2;
  var ref13 = v3.diff(ref3, ref1);
  var mov13 = v3.diff(mov3, mov1);
  mov13.applyMatrix4(r1);
  if (v3.isNearZero(v3.angle(ref13, mov13))) {
    r2 = new v3.Matrix4();
    torsion2 = null;
  } else {
    axis2 = v3.crossProduct(ref13, mov13);
    torsion2 = v3.dihedral(ref13, axis2, mov13);
    r2 = v3.rotation(axis2, torsion2);
  }

  // now we have the parameters of the transform
  // build the transform (in terms of little steps)
  if (torsion1 === null) {
    var n = t;
  } else {
    var r1 = v3.rotation(axis1, torsion1 / n_step);
    var n = v3.matrixProduct(r1, t);
  }
  if (torsion2 === null) {
    var m = n;
  } else {
    var r2 = v3.rotation(axis2, torsion2 / n_step);
    var m = v3.matrixProduct(r2, n);
  }
  var disp2 = v3.scaled(disp, -(n_step - 1) / n_step);

  return v3.matrixProduct(v3.translation(disp2), m);
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


var View = function () {
  this.id = 'view:000000';
  this.res_id = "";
  this.i_atom = -1;
  this.order = 1;
  this.abs_camera = new Camera();
  this.selected = [];
  this.labels = [];
  this.distances = [];
  this.text = 'Default view of PDB file';
  this.creator = "";
  this.url = getWindowUrl();
  this.show = {
    sidechain: true,
    peptide: true,
    hydrogen: false,
    water: false,
    ligands: true,
    trace: false,
    all_atom: false,
    ribbon: true,
  };

  this.clone = function () {
    var v = new View();
    v.id = this.id;
    v.res_id = this.res_id;
    v.i_atom = this.i_atom;
    v.selected = this.selected;
    v.labels = _.cloneDeep(this.labels);
    v.distances = _.cloneDeep(this.distances);
    v.order = this.order;
    v.text = this.text;
    v.time = this.time;
    v.url = this.url;
    v.abs_camera = this.abs_camera.clone();
    v.show = _.cloneDeep(this.show);
    return v;
  }

  this.copy_metadata_from_view = function (in_view) {
    this.res_id = in_view.res_id;
    this.show = _.cloneDeep(in_view.show);
    this.labels = _.cloneDeep(in_view.labels);
    this.distances = _.cloneDeep(in_view.distances);
    this.text = in_view.text;
    this.time = in_view.time;
    this.url = in_view.url;
    this.i_atom = in_view.i_atom;
    this.selected = in_view.selected;
  }
}


/////////////////////////////////////////////////
// The Scene object contains the protein data
// and all necessary data to display the protein
// in the correct view with labels and distance
// measures.
/////////////////////////////////////////////////

var Scene = function (protein) {
  this.max_update_step = 20;
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

  this.set_target_view = function (view) {
    this.n_update_step = this.max_update_step;
    this.target_view = view.clone();
  }

  this.centered_atom = function () {
    var i = this.current_view.i_atom;
    return this.protein.getAtom(i)
  }

  this.get_i_saved_view_from_id = function (id) {
    var i = -1;
    for (var j = 0; j < this.saved_views.length; j += 1) {
      if (this.saved_views[j].id == id) {
        i = j;
      }
    }
    return i;
  }

  this.insert_view = function (j, new_id, new_view) {
    this.saved_views_by_id[new_id] = new_view;
    if (j >= this.saved_views.length) {
      this.saved_views.push(new_view);
    } else {
      this.saved_views.splice(j, 0, new_view);
    }
    this.i_last_view = j;
    for (var i = 0; i < this.saved_views.length; i++) {
      this.saved_views[i].order = i;
    }
  }

  this.remove_saved_view = function (id) {
    var i = this.get_i_saved_view_from_id(id);
    if (i < 0) {
      return;
    }
    this.saved_views.splice(i, 1);
    delete this.saved_views_by_id[id];
    for (var i = 0; i < this.saved_views.length; i++) {
      this.saved_views[i].order = i;
    }
    if (this.i_last_view >= this.saved_views.length) {
      this.i_last_view = this.saved_views.length - 1;
    }
    this.changed = true;
    this.is_new_view_chosen = true;
  }

  this.save_view = function (view) {
    var id = view.id;
    this.saved_views_by_id[id] = view;
    this.saved_views.push(view);
  }

}


/////////////////////////////////////////////////
// The Controlller object that carries out the 
// actions on the protein and the views in the
// Scene, and also to interact with the server
/////////////////////////////////////////////////

var Controller = function (scene) {
  this.zoom_min = 2.4;
  this.protein = scene.protein;
  this.scene = scene;

  this.delete_dist = function (i) {
    this.scene.current_view.distances.splice(i, 1);
    this.scene.changed = true;
  }

  this.make_dist = function (atom1, atom2) {
    this.scene.current_view.distances.push({
      'i_atom1': atom1.i,
      'i_atom2': atom2.i,
      'z': atom2.z
    });
    this.scene.changed = true;
  }

  this.make_label = function (i_atom, text) {
    this.scene.current_view.labels.push({
      'i_atom': i_atom, 'text': text,
    });
    this.scene.changed = true;
  }

  this.delete_label = function (i) {
    this.scene.current_view.labels.splice(i, 1);
    this.scene.changed = true;
  }

  this.set_target_view = function (view) {
    this.scene.set_target_view(view);
  }

  this.set_target_view_by_id = function (id) {
    var view = this.scene.saved_views_by_id[id];
    this.scene.i_last_view = this.scene.saved_views_by_id[id].order;
    this.set_target_view(view);
  }

  this.set_target_view_by_res_id = function (res_id) {
    var view = this.scene.current_view.clone();
    view.res_id = res_id;
    view.i_atom = this.protein.res_by_id[res_id].iAtom;
    let atom = this.protein.getAtom(view.i_atom)
    this.set_target_view(view);
  }

  this.set_target_view_by_atom = function (atom) {
    var view = this.scene.current_view.clone();
    view.res_id = atom.res_id;
    view.i_atom = atom.i;
    this.set_target_view(view);
  }

  this.set_target_prev_residue = function () {
    var curr_res_id;
    if (this.scene.n_update_step >= 0) {
      curr_res_id = this.scene.target_view.res_id;
    } else {
      curr_res_id = this.scene.current_view.res_id;
    }
    var res_id = this.protein.get_prev_res_id(curr_res_id);
    this.set_target_view_by_res_id(res_id);
  }

  this.set_target_next_residue = function () {
    var curr_res_id;
    if (this.scene.n_update_step >= 0) {
      curr_res_id = this.scene.target_view.res_id;
    } else {
      curr_res_id = this.scene.current_view.res_id;
    }
    var res_id = this.protein.get_next_res_id(curr_res_id);
    this.set_target_view_by_res_id(res_id);
  }

  this.set_target_prev_view = function () {
    var scene = this.scene;
    scene.i_last_view -= 1;
    if (scene.i_last_view < 0) {
      scene.i_last_view = scene.saved_views.length - 1;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    this.set_target_view_by_id(id);
    return id;
  }

  this.set_target_next_view = function () {
    var scene = this.scene;
    scene.i_last_view += 1;
    if (scene.i_last_view >= scene.saved_views.length) {
      scene.i_last_view = 0;
    }
    var id = scene.saved_views[scene.i_last_view].id;
    this.set_target_view_by_id(id);
    return id;
  }

  this.swapViews = function (i, j) {
    this.scene.saved_views[j].order = i;
    this.scene.saved_views[i].order = j;
    var dummy = this.scene.saved_views[j];
    this.scene.saved_views[j] = this.scene.saved_views[i];
    this.scene.saved_views[i] = dummy
  }

  this.get_view_dict = function (view) {
    return {
      version: 2,
      view_id: view.id,
      creator: view.creator,
      pdb_id: view.pdb_id,
      order: view.order,
      show: view.show,
      text: view.text,
      res_id: view.res_id,
      i_atom: view.i_atom,
      labels: view.labels,
      selected: view.selected,
      distances: view.distances,
      camera: {
        slab: {
          z_front: view.abs_camera.z_front,
          z_back: view.abs_camera.z_back,
          zoom: view.abs_camera.zoom,
        },
        pos: [
          view.abs_camera.pos.x,
          view.abs_camera.pos.y,
          view.abs_camera.pos.z
        ],
        up: [
          view.abs_camera.up_v.x,
          view.abs_camera.up_v.y,
          view.abs_camera.up_v.z,
        ],
        in: [
          view.abs_camera.in_v.x,
          view.abs_camera.in_v.y,
          view.abs_camera.in_v.z,
        ],
      }
    }
  }

  this.get_view_dicts = function () {
    var view_dicts = [];
    for (var i = 1; i < this.scene.saved_views.length; i += 1) {
      var view = this.scene.saved_views[i];
      var view_dict = this.get_view_dict(view);
      view_dicts.push(view_dict);
    }
    return view_dicts;
  }

  this.make_selected = function () {
    var result = [];
    for (var i = 0; i < this.protein.residues.length; i += 1) {
      if (this.protein.residues[i].selected) {
        result.push(i);
      }
    }
    return result;
  }

  this.clear_selected = function () {
    this.protein.clear_selected();
    this.scene.current_view.selected = this.make_selected();
    this.scene.changed = true;
    this.scene.is_new_view_chosen = true;
  }

  this.select_residue = function (i, v) {
    this.protein.residues[i].selected = v;
    this.scene.current_view.selected = this.make_selected();
    this.scene.is_new_view_chosen = true;
    this.scene.changed = true;
  }

  this.toggle_neighbors = function () {
    var res_id = this.scene.current_view.res_id;
    var i_res = this.protein.get_i_res_from_res_id(res_id);
    if (this.last_neighbour_res_id == res_id) {
      var b = false;
      this.last_neighbour_res_id = null;
    } else {
      var b = true;
      this.last_neighbour_res_id = res_id;
    }
    this.protein.select_neighbors(i_res, b);
    this.scene.current_view.selected = this.make_selected();
    this.scene.changed = true;
    this.scene.is_new_view_chosen = true;
  }

  this.save_current_view = function (new_id) {
    var j = this.scene.i_last_view + 1;
    var new_view = this.scene.current_view.clone();
    new_view.text = 'Click edit to change this text.';
    new_view.pdb_id = this.protein.pdb_id;
    var time = getCurrentDateStr();
    if (user == '' || typeof user == 'undefined') {
      new_view.creator = '~ [public] @' + time;
    } else {
      new_view.creator = '~ ' + user + ' @' + time;
    }
    new_view.id = new_id;
    new_view.selected = this.make_selected();
    this.scene.insert_view(j, new_id, new_view)
    return j;
  }

  this.delete_view = function (id) {
    this.scene.remove_saved_view(id);
  }

  this.view_from_dict = function (flat_dict) {
    var view = new View();

    view.id = flat_dict.view_id;
    view.view_id = flat_dict.view_id;
    view.pdb_id = flat_dict.pdb_id;
    view.lock = flat_dict.lock;
    view.text = flat_dict.text;
    view.creator = flat_dict.creator;
    view.order = flat_dict.order;
    view.res_id = flat_dict.res_id;
    view.i_atom = flat_dict.i_atom;

    view.labels = flat_dict.labels;
    view.selected = flat_dict.selected;
    view.distances = flat_dict.distances;

    view.show = flat_dict.show;
    if (!(view.show.all_atom || view.show.trace || view.show.ribbon)) {
      view.show.ribbon = true;
    }

    view.abs_camera.pos.x = flat_dict.camera.pos[0];
    view.abs_camera.pos.y = flat_dict.camera.pos[1];
    view.abs_camera.pos.z = flat_dict.camera.pos[2];

    view.abs_camera.up_v.x = flat_dict.camera.up[0];
    view.abs_camera.up_v.y = flat_dict.camera.up[1];
    view.abs_camera.up_v.z = flat_dict.camera.up[2];

    view.abs_camera.in_v.x = flat_dict.camera.in[0];
    view.abs_camera.in_v.y = flat_dict.camera.in[1];
    view.abs_camera.in_v.z = flat_dict.camera.in[2];

    view.abs_camera.z_front = flat_dict.camera.slab.z_front;
    view.abs_camera.z_back = flat_dict.camera.slab.z_back;
    view.abs_camera.zoom = flat_dict.camera.slab.zoom;

    return view;
  }

  this.sort_views_by_order = function () {
    var order_sort = function (a, b) {
      return a.order - b.order;
    }
    this.scene.saved_views.sort(order_sort);
    for (var i = 0; i < this.scene.saved_views.length; i += 1) {
      this.scene.saved_views[i].order = i;
    }
  }

  this.load_views_from_flat_views = function (view_dicts) {
    for (var i = 0; i < view_dicts.length; i += 1) {
      var view = this.view_from_dict(view_dicts[i]);
      if (view.id === "view:000000") {
        continue;
      }
      this.scene.save_view(view);
    }
    this.sort_views_by_order();
    scene.is_new_view_chosen = true;
  }

  this.set_backbone_option = function (option) {
    this.scene.current_view.show.all_atom = false;
    this.scene.current_view.show.trace = false;
    this.scene.current_view.show.ribbon = false;
    this.scene.current_view.show[option] = true;
    this.scene.changed = true;
  }

  this.set_show_option = function (option, bool) {
    console.log('> Controller.set_show_option', option, bool);
    this.scene.current_view.show[option] = bool;
    this.scene.changed = true;
  }

  this.get_show_option = function (option) {
    return this.scene.current_view.show[option];
  }

  this.toggle_show_option = function (option) {
    var val = this.get_show_option(option);
    this.set_show_option(option, !val);
  }

  this.flag_changed = function () {
    this.scene.changed = true;
  }

  this.set_current_view = function (view) {
    this.scene.current_view = view;
    this.scene.changed = true;
  }
}


export {
  Protein,
  Camera,
  View,
  Controller,
  Scene
};