import polymer
import copy
import string
import os
import vector3d
import molecule

"""
protein.py contains 2 classes for use in structural analysis.

Protein() is a polymer object with methods that can splice,
insert and manipulate a protein backbone. There are basic
phi/psi manipulation methods. As well, there is a template
library to mutate residues, and chi-angle information can be
extracted from the sidechain. There are also routines to cap the
protein with methyl groups and to charge the terminii. TODO:
proline aargh!

Soup() is a container object that can hold chains of proteins
or any kind of polymer, for that matter.
"""


##############################################
# amino acids names for use with sequence
# conversion functions
##############################################


res_name_to_char = {
  "ALA":"A", "CYS":"C", "ASP":"D",
  "GLU":"E", "PHE":"F", "GLY":"G",
  "HIS":"H", "ILE":"I", "LYS":"K",
  "LEU":"L", "MET":"M", "ASN":"N",
  "PRO":"P", "GLN":"Q", "ARG":"R",
  "SER":"S", "THR":"T", "VAL":"V",
  "TRP":"W", "TYR":"Y", "ACE":">",
  "NME":"<",
}
res_char_to_name = {}
for name, char in res_name_to_char.items():
  res_char_to_name[char] = name


##############################################
# routines to deal with backbone splicings
##############################################


def _project_h(protein, i):
  if protein.residue(i).has_atom("H"):
    return
  ref1 = protein.residue(i).atom("N").pos
  ref2 = protein.residue(i).atom("CA").pos
  ref3 = protein.residue(i).atom("C").pos

  mov1 = _template.residue(1).atom("N").pos
  mov2 = _template.residue(1).atom("CA").pos
  mov3 = _template.residue(1).atom("C").pos

  mat = vector3d.Superposition3(ref1, ref2, ref3, mov1, mov2, mov3)

  return mat.transform_vec(_template.residue(1).atom("H").pos)
  
  
def _project_prev_c_ca(protein, i):
  """
  Projects the position of the C and CA atoms of the residue that
  would have been precedent to residue i.
  """
  if "ACE" in protein.residue(i).type:
    raise ValueError, "Can't project in N-terminal direction from ACE"

  if "NME" in protein.residue(i).type:
    ca_type = "CH3"
  else:
    ca_type = "CA"

  if protein.residue(i).has_atom("H"):
    ref1 = protein.residue(i).atom(ca_type).pos
    ref2 = protein.residue(i).atom("N").pos
    ref3 = protein.residue(i).atom("H").pos

    mov1 = _template.residue(1).atom("CA").pos
    mov2 = _template.residue(1).atom("N").pos
    mov3 = _template.residue(1).atom("H").pos
  elif protein.residue(i).type == "PRO":
    ref1 = protein.residue(i).atom(ca_type).pos
    ref2 = protein.residue(i).atom("N").pos

    ref_v = ref2 - ref1
    ref_w = protein.residue(i).atom("CD").pos - ref1
    ref3 = ref2 + vector3d.CrossProductVec(ref_v, ref_w).normal_vec()

    mov1 = _template.residue(1).atom("CA").pos
    mov2 = _template.residue(1).atom("N").pos

    mov_v = mov2 - mov1
    mov_w = _template.residue(1).atom("H").pos - mov1
    mov3 = mov2 + vector3d.CrossProductVec(mov_v, mov_w).normal_vec()
  else:
    # no H or PRO-CD: must assume a phi angle from _template
    ref1 = protein.residue(i).atom("N").pos
    ref2 = protein.residue(i).atom(ca_type).pos
    ref3 = protein.residue(i).atom("C").pos

    mov1 = _template.residue(1).atom("N").pos
    mov2 = _template.residue(1).atom("CA").pos
    mov3 = _template.residue(1).atom("C").pos

  mat = vector3d.Superposition3(ref1, ref2, ref3, mov1, mov2, mov3)

  c = _template.residue(0).atom("C").pos
  ca = _template.residue(0).atom("CH3").pos

  return mat.transform_vec(c), mat.transform_vec(ca)


def _get_n_peptide(protein, i):
  p = []

  if i > 0:
    if "ACE" in protein.residue(i-1).type:
      ca_type = "CH3"
    else:
      ca_type = "CA"

    p.append(protein.residue(i-1).atom(ca_type).pos)
    p.append(protein.residue(i-1).atom("C").pos)

  else:

    c, ca = _project_prev_c_ca(protein, i)

    p.append(ca)
    p.append(c)

  if "NME" in protein.residue(i).type:
    ca_type = "CH3"
  else:
    ca_type = "CA"

  p.append(protein.residue(i).atom("N").pos)
  p.append(protein.residue(i).atom(ca_type).pos)

  return p


def _project_next_n_ca(protein, i):
  if "NME" in protein.residue(i).type:
    raise ValueError, "Cant' project in C-terminal direction from NME"

  if "ACE" in protein.residue(i).type:
    ca_type = "CH3"
  else:
    ca_type = "CA"

  ref1 = protein.residue(i).atom(ca_type).pos
  ref2 = protein.residue(i).atom("C").pos
  ref3 = protein.residue(i).atom("O").pos

  mov1 = _template.residue(2).atom("CA").pos
  mov2 = _template.residue(2).atom("C").pos
  mov3 = _template.residue(2).atom("O").pos

  mat = vector3d.Superposition3(ref1, ref2, ref3, mov1, mov2, mov3)

  n = _template.residue(3).atom("N").pos
  ca = _template.residue(3).atom("CA").pos

  return mat.transform_vec(n), mat.transform_vec(ca)


def _get_c_peptide(protein, i):
  p = []

  if "ACE" in protein.residue(i).type:
    ca_type = "CH3"
  else:
    ca_type = "CA"

  p.append(protein.residue(i).atom(ca_type).pos)
  p.append(protein.residue(i).atom("C").pos)

  if i < protein.n_residue()-1:

    if "NME" in protein.residue(i+1).type:
      ca_type = "CH3"
    else:
      ca_type = "CA"

    p.append(protein.residue(i+1).atom("N").pos)
    p.append(protein.residue(i+1).atom(ca_type).pos)

  else:
    n, ca = _project_next_n_ca(protein, i)

    p.append(n)
    p.append(ca)

  return p


def _splice_to_c_terminus(protein, fragment, j, k):
  last = protein.n_residue()-1
  ref = _get_c_peptide(protein, last)
  mov = _get_n_peptide(fragment, j)

  rot = vector3d.Superposition3(ref[0], ref[1], ref[2],
                       mov[0], mov[1], mov[2])

  insert = fragment.extract(j, k)
  insert.transform(rot)

  protein.insert(last+1, insert)


def _splice_to_n_terminus(protein, fragment, j, k):
  ref = _get_n_peptide(protein, 0)
  mov = _get_c_peptide(fragment, k-1)

  rot = vector3d.Superposition3(ref[0], ref[1], ref[2],
                       mov[0], mov[1], mov[2])

  insert = fragment.extract(j, k)
  insert.transform(rot)

  protein.insert(0, insert)


def _splice(protein, i, fragment, j, k):
  insert = fragment.extract(0, fragment.n_residue())

  if i > 0:
    ref = _get_c_peptide(protein, i-1)
    mov = _get_n_peptide(insert, j)

    rot1 = vector3d.Superposition3(ref[0], ref[1], ref[2],
                          mov[0], mov[1], mov[2])
    for res in insert.residues():
      res.transform(rot1)

  if i < protein.n_residue():
    ref = _get_c_peptide(insert, k-1)
    mov = _get_n_peptide(protein, i)

    rot2 = vector3d.Superposition3(ref[0], ref[1], ref[2],
                          mov[0], mov[1], mov[2])

    for res in protein.residues()[i:]:
      res.transform(rot2)

  for res in reversed(insert.residues()[j:k]):
    protein.insert_residue(i, res)


##############################################
# routines to deal with sidechain topolgies
##############################################


def get_atom_sidechain_nesting(atom_type):
  """
  Analyzes atom name to see what chi angle it responds to.
  -1: backbone, 0:chi1...
  """
  label = atom_type
  while label[-1].isdigit():
    label = label[:-1]
  while label[0].isdigit():
    label = label[1:]
  if len(label) < 2:
    nesting = -1
  else:
    nesting = "ABGDEZH".find(label[1]) - 2
    if label[0] == "H":
      nesting += 1
  return nesting


def _read_chi_topology(fname):
  chi_topology = {}
  curr_res_type = ""
  for line in open(fname, "r").readlines():
    word_list = line.split()
    if word_list:
      if ":" in word_list[0]:
        curr_res_type = word_list[1]
        chi_topology[curr_res_type] = []
      elif curr_res_type:
        chi_topology[curr_res_type].append(word_list[0:4])
  return chi_topology


_module_dir = os.path.dirname(__file__)
_chi_topology = _read_chi_topology(os.path.join(_module_dir, "chi.txt"))

def get_res_chi_topology(res_type):
  """Gets the atom types for each chi angle in a residue type"""
  if res_type in ["HSE"]:
    res_type = "HIS"
  if _chi_topology.has_key(res_type):
    result = copy.deepcopy(_chi_topology[res_type])
  else:
    result = []
  # deal with some name mangling
  if res.type == "ILE" and res.has_atom("CD1"):
    for i in range(0, len(result)):
      for j in range(0, len(result[i])):
        if result[i][j] == "CD":
          result[i][j] = "CD1"
          break
  return result


def calculate_chi(residue, j):
  res_chi_topology = get_res_chi_topology(residue.type)
  if j < len(res_chi_topology):
    p = [residue.atom(atom_type).pos for atom_type in res_chi_topology[j]]
    angle = vector3d.pos_dihedral(p[0], p[1], p[2], p[3])
    return vector3d.normalize_angle(angle)
  raise ValueError, "No Chi%d angle for res %d" % (j, i)


def get_n_chi(res_type):
  return len(get_res_chi_topology(res_type))


_template = polymer.Polymer(os.path.join(_module_dir, "template.pdb"))
template_residues = [res.type for res in _template.residues()]


def ResidueFromType(res_type):
  for res in _template.residues():
    if res_type == res.type:
      return res.copy()
  raise ValueError, "Don't have template for %s", res_type


def check_for_atoms(res, atom_types, action_str=""):
  for atom_type in atom_types:
    if not res.has_atom(atom_type):
      res_name = "%s%s-%s" % (res.chain_id, res.num, res.type)
      raise ValueError, "%s: missing %s in %s" % \
                          (action_str, atom_type, res_name)
    



#########################################
# Main protein class
#########################################


class Protein(polymer.Polymer):
  """
  The Protein class provides functionality to get conformational
  parameters from a protein molecule from a residue-centric point
  of view. There are routines to mutate, and get phi/psi/chi angles.
  There is also some capping routines - methyl groups or simple
  charges.
  """
  def __init__(self, pdb=""):
    polymer.Polymer.__init__(self, pdb)

  def blank(self):
    return Protein()

  def n_chi(self, i):
    if _chi_topology.has_key(self.residue(i).type):
      return len(_chi_topology[self.residue(i).type])
    else:
      return 0

  def chi(self, i, j):
    res = self.residue(i)
    if _chi_topology.has_key(res.type):
      if j < len(_chi_topology[res.type]):
        p = [res.atom(atom_type).pos
            for atom_type in _chi_topology[res.type][j]]
        angle = vector3d.pos_dihedral(p[0], p[1], p[2], p[3])
        return vector3d.normalize_angle(angle)
    raise ValueError, "No Chi%d angle for res %s-%d" % (j, res.type, i)

  def set_chi(self, i, j, chi):
    res = self.residue(i)

    if "PRO" in res.type:
      raise ValueError, "Can't do chi of PRO"

    if j < 0 or j >= len(_chi_topology[res.type]):
      raise ValueError, "Residue doesn't have this chi"

    p = [res.atom(atom_type).pos
         for atom_type in _chi_topology[res.type][j]]

    anchor = p[1]
    center = p[2]
    axis = center - anchor
    delta_chi = chi - self.chi(i, j)
    rot = vector3d.Rotation(axis, delta_chi, center)

    for atom in res.atoms():
      if get_atom_sidechain_nesting(atom.type) >= j:
        atom.pos.transform(rot)

  def phi(self, i):
    if "ACE" in self.residue(i).type:
      raise ValueError, "Can't calculate phi of ACE"

    if i == 0:
      if "PRO" in self.residue(i).type:
        atoms = [(i, "CD1"), (i, "N"), (i, "CA"), (i, "C")]
      elif self.residue(i).has_atom("H"):
        atoms = [(i, "H"), (i, "N"), (i, "CA"), (i, "C")]
      elif self.residue(i).has_atom("H1"):
        atoms = [(i, "H1"), (i, "N"), (i, "CA"), (i, "C")]
      else:
        raise ValueError, "Can't find atoms to calculate phi"
    else:
      if "ACE" in self.residue(i-1).type:
        atoms = [(i-1, "CH3"), (i, "N"), (i, "CA"), (i, "C")]
      else:
        atoms = [(i-1, "C"), (i, "N"), (i, "CA"), (i, "C")]

    p = [self.residue(j).atom(a_type).pos for j, a_type in atoms]
    return vector3d.normalize_angle(vector3d.pos_dihedral(p[0], p[1], p[2], p[3]))

  def psi(self, i):
    if "NME" in self.residue(i).type:
      raise ValueError, "Can't calculate psi of NME"

    if i < self.n_residue() - 1:
      p1 = self.residue(i).atom("N").pos
      p2 = self.residue(i).atom("CA").pos
      p3 = self.residue(i).atom("C").pos
      p4 = self.residue(i+1).atom("N").pos
      angle = vector3d.pos_dihedral(p1, p2, p3, p4)
    else:
      p1 = self.residue(i).atom("N").pos
      p2 = self.residue(i).atom("CA").pos
      p3 = self.residue(i).atom("C").pos
      p4 = self.residue(i).atom("O").pos
      angle = math.pi + vector3d.pos_dihedral(p1, p2, p3, p4)

    return vector3d.normalize_angle(angle)

  def set_phi(self, i, phi):
    res = self.residue(i)
    if "ACE" in res.type:
      raise ValueError, "Can't calculate phi of ACE"

    if "NME" in res.type:
      anchor = res.atom("CH3").pos
    else:
      anchor = res.atom("CA").pos

    center = res.atom("N").pos
    axis = center - anchor
    delta_phi = phi - self.phi(i)
    rot = vector3d.Rotation(axis, delta_phi, center)

    backbone_atom_types = ["H", "H2", "H3"]
    pos_list = [res.atom(type).pos
                for type in backbone_atom_types
                if res.has_atom(type)]

    for pos in pos_list:
      pos.transform(rot)

    for r in self.residues()[:i]:
      r.transform(rot)

  def set_psi(self, i, psi):
    res = self.residue(i)

    if "NME" in res.type:
      raise ValueError, "Can't calculate phi of NME"

    if "ACE" in res.type:
      anchor = res.atom("CH3").pos
    else:
      anchor = res.atom("CA").pos

    center = res.atom("C").pos
    axis = center - anchor
    delta_psi = psi - self.psi(i)
    rot = vector3d.Rotation(axis, delta_psi, center)

    backbone_atom_types = ["O", "OXT", "HXT"]
    pos_list = [res.atom(type).pos
                for type in backbone_atom_types
                if res.has_atom(type)]
    for pos in pos_list:
      pos.transform(rot)

    for r in self.residues()[i+1:]:
      r.transform(rot)

  def extend_n_end(self, res_type):
    j = template_residues.index(res_type)
    if self.residue(0).type == "ACE":
      _splice(self, 1, _template, j, j+1)
    else:
      for a in ['H', '2H', '3H']:
        if self.residue(0).has_atom(a):
          self.residue(0).erase_atom(a)
      _splice_to_n_terminus(self, _template, j, j+1)

  def extend_c_end(self, res_type):
    j = template_residues.index(res_type)
    last = self.n_residue()-1
    if self.residue(last).type == "NME":
      _splice(self, last, _template, j, j+1)
    else:
      for a in ['OXT']:
        if self.residue(last).has_atom(a):
          self.residue(last).erase_atom(a)
      _splice_to_c_terminus(self, _template, j, j+1)

  def cap(self):
    if self.residue(self.n_residue()-1).type != "NME":
      self.extend_c_end("NME")
    if self.residue(0).type != "ACE":
      self.extend_n_end("ACE")

  def uncap(self):
    if self.residue(0).type == "ACE":
      self.erase_residue(0)
    last = self.n_residue()-1
    if self.residue(last).type == "NME":
      self.erase_residue(last)

  def is_capped(self):
    return self.residue(0).type == "ACE" \
           and self.residue(self.n_residue()-1).type == "NME"

  def charge_c_end(self):
    self.uncap()
    last = self.n_residue()-1
    if not self.residue(last).has_atom("OXT"):
      r = self.residue(last)
      check_for_atoms(r, ['CA', 'C', 'O'], 'Adding OXT to Cterm')
      terminal_oxygen = molecule.Atom()
      terminal_oxygen.element = "O"
      terminal_oxygen.type = "OXT"
      terminal_oxygen.pos = vector3d.RotatedPos(180*vector3d.DEG2RAD,
                                                self.residue(last).atom("CA").pos,
                                                self.residue(last).atom("C").pos,
                                                self.residue(last).atom("O").pos)
      self.insert_atom(last, terminal_oxygen)

  def charge_n_end(self):
    if not self.residue(0).has_atom("2H"):
      terminal_hydrogen = molecule.Atom()
      terminal_hydrogen.element = "H"
      terminal_hydrogen.type = "2H"
      if self.residue(0).has_atom("1H"):
        h_atom = self.residue().atom("1H")
      elif self.residue(0).has_atom("H"):
        h_atom = self.residue().atom("H")
      else:
        h_atom = molecule.Atom()
        h_atom.element = "H"
        h_atom.type = "1H"
        h_atom.pos = _project_h(self, 0)
        self.insert_atom(0, h_atom)
      check_for_atoms(r, ['CA', 'N'], 'Adding H to Nterm')
      terminal_hydrogen.pos = vector3d.RotatedPos(120*vector3d.DEG2RAD,
                                                 self.residue(0).atom("CA").pos,
                                                 self.residue(0).atom("N").pos,
                                                 h_atom.pos)
      self.insert_atom(0, terminal_hydrogen)
    if not self.residue(0).has_atom("3H"):
      terminal_hydrogen = molecule.Atom()
      terminal_hydrogen.element = "H"
      terminal_hydrogen.type = "3H"
      check_for_atoms(r, ['CA', 'N', '2H'], 'Adding 2H to Nterm')
      terminal_hydrogen.pos = vector3d.RotatedPos(120*vector3d.DEG2RAD,
                                                 self.residue(0).atom("CA").pos,
                                                 self.residue(0).atom("N").pos,
                                                 self.residue(0).atom("2H").pos)
      self.insert_atom(0, terminal_hydrogen)

  def splice_protein(self, i, insert, j, k):
    """Warning: Can't splice outside caps"""
    if i == 0:
      _splice_to_n_terminus(self, insert, j, k)
    elif i == self.n_residue():
      _splice_to_c_terminus(self, insert, j, k)
    else:
      _splice(self, i, insert, j, k)

  def extend_protein(self, insert):
    j = 0
    if insert.residue(0).type == "ACE":
      j +=1
    k = insert.n_residue()
    last = self.n_residue()-1
    if self.residue(last).type == "NME":
      if insert.residue(k-1) == "NME":
        k -= 1
      _splice(self, last, insert, j, k)
    else:
      _splice_to_c_terminus(self, insert, j, k)

  def mutate(self, i, res_type):
    if res_type == self.residue(i).type:
      return

    new_res = ResidueFromType(res_type)

    old_chi = []
    for j in range(0, self.n_chi(i)):
      try:
        old_chi.append(self.chi(i, j))
      except:
        old_chi.append(0.0)

    delete_atom_list = [atom.type for atom in self.residue(i).atoms()
                       if not new_res.has_atom(atom.type)]

    for atom_type in delete_atom_list:
      self.residue(i).erase_atom(atom_type)

    ref1 = self.residue(i).atom("N").pos
    ref2 = self.residue(i).atom("CA").pos
    ref3 = self.residue(i).atom("C").pos

    mov1 = new_res.atom("N").pos
    mov2 = new_res.atom("CA").pos
    mov3 = new_res.atom("C").pos

    m = vector3d.Superposition3(ref1, ref2, ref3, mov1, mov2, mov3)

    new_res.transform(m)

    backbone_atom_types = ['C', 'O', 'H', 'N', 'CA',
                           'H', 'H2', 'H3', 'OXT', 'HXT']
    for atom in new_res.atoms():
      if atom.type not in backbone_atom_types:
        if self.residue(i).has_atom(atom.type):
          self.residue(i).atom(atom.type).pos = atom.pos
        else:
          self.residue(i).insert_atom(atom)

    res_num = self.residue(i).num
    res_insert = self.residue(i).insert
    self.residue(i).set_num(res_num, res_insert)
    self.residue(i).type = res_type
    for atom in self.residue(i).atoms():
      atom.res_type = res_type

    n_chi = min(len(old_chi), self.n_chi(i))
    for j in range(0, n_chi):
      self.set_chi(i, j, old_chi[j])


def ProteinFromSequence(sequence):
  p = Protein()
  res_type = res_char_to_name[sequence[0]]
  res = ResidueFromType(res_type)
  p.append_residue_no_renum(res)
  p.residue(0).set_num(1)
  for char in sequence[1:]:
    res_type = res_char_to_name[char]
    p.extend_c_end(res_type)
  return p

