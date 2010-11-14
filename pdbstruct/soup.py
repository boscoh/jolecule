from string import ascii_uppercase
from molecule import AtomFromPdbLine, cmp_atom
from protein import Protein
from polymer import Polymer, Residue


class Soup:
  """
  A collection of chains and proteins etc.
  """

  def __init__(self, pdb=None):
    self._chains = []
    self._molecules = []
    self.box_dimension_str = None
    if pdb:
      self.read_pdb(pdb)

  def copy(self):
    new_s = Soup()
    new_s.box_dimension_str = self.box_dimension_str
    for c in self._chains:
      new_s._chains.append(c.copy())
    for m in self._molecules:
      new_s._molecules.append(m.copy())
    return new_s
    
  def clear(self):
    for chain in self._chains:
      chain.clear()
    del self._chains[:]
    
  def append_chain(self, chain):
    self._chains.append(chain)

  def delete_chain(self, i):
    del self._chains[i]
    
  def chains(self):
    return self._chains

  def chain(self, i):
    return self._chains[i]

  def residues(self):
    result = []
    for chain in self.chains():
      result.extend(chain.residues())
    return result

  def residue(self, i):
    return self.residues()[i]

  def n_residue(self):
    return len(self.residues())

  def atoms(self):
    result = []
    for chain in self.chains():
      result.extend(chain.atoms())
    return result
    
  def n_atom(self):
    return len(self.atom())

  def read_pdb(self, pdb):
    self.clear()
    chain_id = '-'
    res_num = None
    res_insert = ' '
    is_last_chain_protein = False
    for line in open(pdb, 'r').readlines():
      if line.startswith("ATOM"):
        atom = AtomFromPdbLine(line)
        if not is_last_chain_protein or chain_id != atom.chain_id:
          protein = Protein()
          protein.id = atom.chain_id
          chain_id = protein.id
          self.append_chain(protein)
          is_last_chain_protein = True
          res_num = None
        if (res_num != atom.res_num) or (res_insert != atom.res_insert):
          residue = Residue(
              atom.res_type, atom.chain_id,
              atom.res_num, atom.res_insert)
          residue.chain_id = chain_id
          protein.append_residue_no_renum(residue)
          res_num = atom.res_num
          res_insert = atom.res_insert
        protein.insert_atom(-1, atom)
      if line.startswith("HETATM"):
        atom = AtomFromPdbLine(line)
        if res_num != atom.res_num or chain_id != atom.chain_id:
          mol = Polymer()
          residue = Residue(atom.res_type, atom.chain_id, atom.res_num)
          residue.chain_id = atom.chain_id
          mol.append_residue_no_renum(residue)
          mol.id = atom.chain_id
          self.append_chain(mol)
          res_num = atom.res_num
          chain_id = atom.chain_id
          last_chain_is_polymer = False
        mol.insert_atom(0, atom);
      if line.startswith("TER"):
        chain_id = '-'
      if line.startswith("ENDMDL"):
        break

  def write_pdb(self, pdb):
    f = open(pdb, 'w')
    n_atom = 0
    for chain in self._chains:
      for res in chain.residues():
        res_atoms = res.atoms()
        res_atoms.sort(cmp_atom)
        for atom in res_atoms:
          n_atom += 1
          atom.num = n_atom
          f.write(atom.pdb_str() + '\n')
      if isinstance(chain, Protein):
        f.write("TER\n")
    f.close()

  def transform(self, m):
    for chain in self.chains():
      chain.transform(m)

  def load_residue_bfactors(self, res_bfactors):
    i = 0
    for chain in self.chains():
      for r in chain.residues():
        for atom in r.atoms():
          if i >= len(res_bfactors):
            return
          else:
            atom.bfactor = res_bfactors[i]
        i += 1
