import copy
import string
import molecule
import os

class Residue:

  def __init__(self, in_type, in_chain_id, in_num, in_insert=''):
    self.type = in_type
    self.chain_id = in_chain_id
    self.num = in_num
    self.insert = in_insert
    self._atom_dict = {}
    self.parent = None
 
  def __str__(self):
    atom_name_list = [a.type for a in self.atoms()]
    atom_name = " ".join(atom_name_list)
    return "%s-%s { %s }" % (self.type, self.num, atom_name)

  def copy(self):
    new_residue = Residue(
       self.type, self.chain_id, self.num, self.insert)
    for a in self._atom_dict.values():
      new_residue._atom_dict[a.type] = a.copy()
    return new_residue
  
  def n_atom(self):
    return len(self._atom_dict)
    
  def atom(self, atom_type):
    return self._atom_dict[atom_type]
    
  def has_atom(self, atom_type):
    return atom_type in self._atom_dict.keys()
    
  def atoms(self):
    return self._atom_dict.values()
    
  def n_atom(self):
    return len(self._atom_dict.values())
  
  def atom_name(self, atom_type):
    return self.type + self.num + ":" + atom_type

  def insert_atom(self, atom):
    self._atom_dict[atom.type] = atom
    atom.chain_id = self.chain_id
    atom.res_num = self.num
    atom.res_type = self.type
    atom.res_insert = self.insert
  
  def erase_atom(self, atom_type):
    atom = self._atom_dict[atom_type]
    del self._atom_dict[atom_type]
    self.parent._atoms.remove(atom)
    
  def set_chain_id(self, chain_id):
    self.chain_id = chain_id
    for a in self.atoms():
      a.chain_id = chain_id
    
  def set_num(self, i, insert=""):
    self.num = i
    self.insert = insert
    for atom in self.atoms():
      atom.res_num = self.num
      atom.res_insert = insert
     
  def set_type(self, new_type):
    self.type = new_type
    for a in self.atoms():
      a.res_type = new_type
      
  def change_atom_type(self, old_type, new_type):
    if self.has_atom(old_type):
      a = self.atom(old_type)
      a.type = new_type
      del self._atom_dict[old_type]
      self._atom_dict[new_type] = a

  def inc_num(self):
    self.set_num(self.num+1, self.insert)

  def dec_num(self):
    self.set_num(self.num-1, self.insert)
    
  def dec_insert(self):
    l = self.insert;
    if l == "A" or l == "a":
      self.insert = ''
    else:
      i = string.ascii_letters.find(l)
      self.insert = string.ascii_letters[i-1]

  def transform(self, matrix):
     for atom in self.atoms():
       atom.pos.transform(matrix)

  
class Polymer(molecule.Molecule):

  def __init__(self, s=""):
    molecule.Molecule.__init__(self)
    self._residues = []
    if s:
      if os.path.isfile(s):
        self.read_pdb(s)
      else:
        self.read_text(s)

  def blank(self):
    return Polymer()
    
  def copy(self):
    new_p = self.blank()
    new_p.id = self.id
    for r in self._residues:
      new_p.append_residue_no_renum(r.copy())
    return new_p
    
  def residue(self, i):
    return self._residues[i]
    
  def residues(self):
    return self._residues

  def insert_atom(self, i, atom):
    self._atoms.append(atom)
    self.residue(i).insert_atom(atom)
    
  def erase_atom(self, i, atom_type):
    atom = self.residue(i).atom(atom_type)
    self._atoms.remove(atom)
    self.residue(i).erase_atom(atom_type)
    del atom
    
  def clear(self):
    del self._residues[:]
    molecule.Molecule.clear(self)
    
  def n_residue(self):
    return len(self._residues)
    
  def insert_residue(self, i, res):
    is_insertion = False
    if i < self.n_residue()-1:
      save_res_num = self.residue(i).num
      if self.residue(i+1).num == save_res_num:
        is_insertion = True

    if self.n_residue() == 0:
      res.set_num(res.num, res.insert)
    elif i < self.n_residue():
      res.set_num(self.residue(i).num, self.residue(i).insert)
    else:
      res.set_num(self.residue(i-1).num, "")
      res.inc_num()
    
    self._residues.insert(i, res)
    for atom in res.atoms():
      self.insert_atom(i, atom)

    self.residue(i).set_chain_id(self.id)

    for j in range(i+1, self.n_residue()):
      self.residue(j).inc_num()

    if is_insertion:
      while self.residue(i+1).insert:
        for j in range(i+1, self.n_residue()):
          if self.residue(j).res_num == save_res_num:
            self.residue(k).dec_insert()

    self.residue(i).parent = self
    
  def append_residue_no_renum(self, res):
    "Appends residue *without* renumbering of res.num"
    self._residues.append(res)
    # res.set_chain_id(self.id)
    for atom in self.residue(-1).atoms():
      self.insert_atom(-1, atom)
    # self.residue(-1).set_chain_id(self.id)
    self.residue(-1).parent = self

  def erase_residue(self, i):  
    save_res_num = self.residue(i).num

    for atom in self.residue(i).atoms():
      self._atoms.remove(atom)
      del atom
    self._residues.pop(i)  
    
    if i < self.n_residue():
      if self.residue(i).num == save_res_num:
        # erasing residue in an insertion
        for j in range(i, self.n_residue()):
          if self.residue(j).num == erase_res_num_int:
            self.residue(j).dec_insert()
      else:
        for j in range(i, self.n_residue()):
          self.residue(j).dec_num()
    
  def extract(self, i, j):
    extract = self.blank()
    for res in self.residues()[i:j]:
      extract.append_residue_no_renum(res.copy())
    return extract
 
  def insert(self, i, insert):
    for res in reversed(insert.residues()):
      self.insert_residue(i, res.copy())
    
  def set_id(self, new_id):
    molecule.Molecule.set_id(self, new_id)
    for r in self.residues():
      r.chain_id = new_id

  def __str__(self):
    res_name_list = [str(res) for res in self._residues]
    return "\n".join(res_name_list)
 
  def load_residue_bfactors(self, res_bfactors):
    for i, r in enumerate(self.residues()):
      for atom in r.atoms():
        if i >= len(res_bfactors):
          return
        else:
          atom.bfactor = res_bfactors[i]

  def i_residue(self, chain_id, num):
    for i, r in enumerate(self.residues()):
      if r.chain_id == chain_id and r.num == num:
        return i
    return None
    
  def read_pdb(self, fname):
    self.clear()
    res_type = ""
    res_num = None
    res_insert = " "
    i = -1
    for line in open(fname, 'r').readlines():
      if line.startswith("ATOM") or line.startswith("HETATM"):
        atom = molecule.AtomFromPdbLine(line);
        if (res_num != atom.res_num) or (res_insert != atom.res_insert) or \
           (res_type != atom.res_type):
          res_num = atom.res_num
          res_insert = atom.res_insert
          res_type = atom.res_type
          residue = Residue(atom.res_type, atom.chain_id,
                            atom.res_num, atom.res_insert)
          self.append_residue_no_renum(residue)
        self.insert_atom(i, atom)
      if line.startswith("ENDMDL"):
        return

  def read_text(self, text):
    self.clear()
    res_type = ""
    res_num = None
    res_insert = " "
    i = -1
    for line in text.splitlines():
      if line.startswith("ATOM") or line.startswith("HETATM"):
        atom = molecule.AtomFromPdbLine(line);
        if (res_num != atom.res_num) or (res_insert != atom.res_insert) or \
           (res_type != atom.res_type):
          res_num = atom.res_num
          res_insert = atom.res_insert
          res_type = atom.res_type
          residue = Residue(atom.res_type, atom.chain_id,
                            atom.res_num, atom.res_insert)
          self.append_residue_no_renum(residue)
        self.insert_atom(i, atom)
      if line.startswith("ENDMDL"):
        return

  def write_pdb(self, pdb):
    f = open(pdb, 'w')
    n_atom = 0
    for res in self.residues():
      res_atoms = res.atoms()
      res_atoms.sort(molecule.cmp_atom)
      for atom in res_atoms:
        n_atom += 1
        atom.num = n_atom
        f.write(atom.pdb_str() + '\n')
    f.close()
