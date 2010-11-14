import os
import string
import vector3d


class Atom:

  def __init__(self):
    self.is_hetatm = False
    self.pos = vector3d.Vector3d()
    self.vel = vector3d.Vector3d()
    self.mass = 0.0
    self.type = ""
    self.element = ""
    self.chain_id = " "
    self.res_type = ""
    self.res_num = ""
    self.res_insert = ""
    self.bfactor = 0.0
    self.occupancy = 0.0
    self.num = 0
    self.alt_conform = " "
    self.is_hetatm = False
    
  def copy(self):
    new_a = Atom()
    new_a.pos = self.pos.copy()
    new_a.vel = self.vel.copy()
    new_a.mass = self.mass
    new_a.type = self.type
    new_a.element = self.element
    new_a.chain_id = self.chain_id
    new_a.res_type = self.res_type
    new_a.res_num = self.res_num
    new_a.res_insert = self.res_insert
    new_a.bfactor = self.bfactor
    new_a.occupancy = self.occupancy
    new_a.num = self.num
    new_a.alt_conform = self.alt_conform
    new_a.is_hetatm = self.is_hetatm
    return new_a
    
  def pdb_str(self):
    if self.is_hetatm:
      field = "HETATM"
    else:
      field = "ATOM  "
    res_num = self.res_num
    if res_num >= 10000:
      res_num = res_num % 10000
    s ="%6s%5s %4s %3s %1s%4d%1s   %8.3f%8.3f%8.3f%6.2f%6.2f" \
            % (field, self.num, 
               pad_atom_type(self.type),
               self.res_type, self.chain_id,
               res_num, self.res_insert,
               self.pos.x, self.pos.y, self.pos.z,
               self.occupancy, self.bfactor)
    return s
               
  def __str__(self):
    return "%s%s-%s (% .1f % .1f % .1f)" \
            %  (self.res_type, self.res_num, 
                self.type, self.pos.x, 
                self.pos.y, self.pos.z)


def AtomFromPdbLine(line):
  """Returns an Atom object from an atom line in a pdb file."""
  atom = Atom()
  if line.startswith('HETATM'):
    atom.is_hetatm = True
  else:
    atom.is_hetatm = False
  atom.num = int(line[6:11])
  atom.type = line[12:16].strip(" ")
  element = ''
  for c in line[12:15]:
    if not c.isdigit() and c != " ":
      element += c
  if element[:2] in two_char_elements:
    atom.element = element[:2]
  else:
    atom.element = element[0]
  atom.alt_conform = line[16]
  atom.res_type = line[17:20]
  atom.chain_id = line[21]
  atom.res_num = int(line[22:26])
  atom.res_insert = line[26]
  if atom.res_insert == " ":
    atom.res_insert = ""
  x = float(line[30:38])
  y = float(line[38:46])
  z = float(line[46:54])
  atom.pos.set(x, y, z)
  try:
    atom.occupancy = float(line[54:60])
  except:
    atom.occupancy = 100.0
  try:
    atom.bfactor = float(line[60:66])
  except:
    atom.bfactor = 0.0
  return atom
  
  
def cmp_atom(a1, a2):
  if a1.num < a2.num:
    return -1
  else:
    return 0


def pad_atom_type(in_atom_type):
  atom_type = in_atom_type
  if len(atom_type) == 1:
    atom_type = " %s  " % atom_type
  elif len(atom_type) == 2:
    atom_type = " %s " % atom_type
  elif len(atom_type) == 3:
    if atom_type[0].isdigit():
      atom_type = "%s " % atom_type
    else:
      atom_type = " %s" % atom_type
  return atom_type


module_dir = os.path.dirname(__file__)
radii_fname = os.path.join(module_dir, "radii.txt")
f = open(radii_fname, 'r')
radii = eval(f.read())
f.close()
two_char_elements = [el for el, r in radii.items() if len(el) == 2]


def add_radii(atoms):
  for atom in atoms:
    if atom.element in radii:
      atom.radius = radii[atom.element]
    else:
      atom.radius = radii['.']


def get_center(atoms):
  center = vector3d.Vector3d(0, 0, 0)
  for atom in atoms:
    center += atom.pos
  center.scale(1.0/float(len(atoms)))
  return center


def get_width(atoms, center):
  max_diff = 0
  for atom in atoms:
    diff = vector3d.pos_distance(atom.pos, center)
    if diff > max_diff:
      max_diff = diff
  return 2*max_diff


class Molecule:

  def __init__(self, pdb=""):
    self.id = ''
    self._atoms = []
    if pdb:
      self.read_pdb(pdb)

  def blank(self):
    return Molecule(self.fname)

  def copy(self):
    new_m = self.blank()
    new_m.id = self.id
    for a in self._atoms:
      new_m._atoms.insert(a.copy())
    return new_m

  def n_atom(self):
    return len(self._atoms)

  def atoms(self):
    return self._atoms

  def atom(self, i):
    return _atoms[i]
    
  def clear(self):
    for atom in self._atoms:
      del atom
    del self._atoms[:]

  def transform(self, matrix):
    for atom in self._atoms:
      atom.pos.transform(matrix)

  def insert_atom(self, atom):
    self._atoms.append(atom)
    
  def erase_atom(self, atom_type):
    for atom in self._atoms:
      if atom.type == atom_type:
        self._atoms.remove(atom)
        del atom
        return

  def read_pdb(self, fname):
    self.clear()
    for line in open(fname, 'r').readlines():
      if line.startswith("ATOM") or line.startswith("HETATM"):
        atom = AtomFromPdbLine(line);
        if len(self._atoms) == 1:
          self.id = atom.chain_id
        self.insert_atom(atom)
      if line.startswith("ENDMDL"):
        return

  def write_pdb(self, pdb):
    f = open(pdb, 'w')
    n_atom = 0
    for atom in sorted(self._atoms, cmp=cmp_atom):
      n_atom += 1
      atom.num = n_atom
      f.write(atom.pdb_str() + '\n')
    f.close()

  def set_id(self, new_id):
    self.id = new_id
    for a in self.atoms():
      a.chain_id = new_id


def save_atoms(atoms, out_pdb, is_hetatm=None):
  f = open(out_pdb, 'w')
  i_chain = 0
  for i_atom, atom in enumerate(atoms):
    atom.num = i_atom + 1
    atom.res_num = atom.num % 10000
    if atom.num > 1 and atom.num % 10000 == 0:
      i_chain += 1
    atom.chain_id = string.ascii_uppercase[i_chain]
    if is_hetatm is True:
      atom.is_hetatm = True
    elif is_hetatm is False:
      atom.is_hetatm = False
    f.write(atom.pdb_str() + '\n')
  f.close()
