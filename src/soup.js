import v3 from './v3'
import { getWindowUrl, inArray, getCurrentDateStr } from './util.js'
import * as glgeom from './glgeom'
import { getClosePairs } from './pairs.js'
import Store from './store.js'

let user = 'public' // will be overriden by server

function delete_numbers (text) {
  return text.replace(/\d+/, '')
}

function pushToListInDic(dict, key, value) {
  if (!(key in dict)) {
    dict[key] = []
  }
  dict[key].push(value)
}

function extractAtomLines (data) {
  const lines = data.split(/\r?\n/)
  let result = []
  for (let line of lines) {
    if ((line.slice(0, 4) === 'ATOM') ||
      (line.slice(0, 6) === 'HETATM')) {
      result.push(line)
    }
    if (line.slice(0, 3) === 'END') {
      break
    }
  }
  return result
}

function parsetTitleFromPdbText (text) {
  let result = ''
  let lines = text.split(/\r?\n/)
  for (let line of lines) {
    if (line.substring(0, 5) === 'TITLE') {
      result += line.substring(10)
    }
  }
  return result
}

function getClosestAtom (pos, atoms) {
  let closestAtom = null
  let min_d = 1E6
  for (let atom of atoms) {
    if (closestAtom === null) {
      closestAtom = atom
    } else {
      let d = v3.distance(pos, atom.pos)
      if (d < min_d) {
        closestAtom = atom
        min_d = d
      }
    }
  }
  return closestAtom
}

function getCenter (atoms) {
  let result = v3.create(0, 0, 0)
  for (let atom of atoms) {
    result = v3.sum(result, atom.pos)
  }
  result.divideScalar(atoms.length)
  return result
}

function intToChar (i) {
  return i ? String.fromCharCode(i) : ''
}

const proteinResTypes = [
  'ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS',
  'ILE', 'LYS', 'LEU', 'MET', 'ASN', 'PRO', 'GLN',
  'ARG', 'SER', 'THR', 'TRP', 'VAL', 'TYR']

const dnaResTypes = ['DA', 'DT', 'DG', 'DC', 'A', 'T', 'G', 'C']

const rnaResTypes = ['RA', 'RU', 'RC', 'RG', 'A', 'G', 'C', 'U']

function getResIdFromAtom (atom) {
  let s = ''
  if (atom.pdb_id) {
    s += atom.pdb_id + ':'
  }
  if (atom.chain) {
    s += atom.chain + ':'
  }
  s += atom.res_num
  return s
}

const residueStoreFields = [
  ['atomOffset', 1, 'uint32'],
  ['atomCount', 1, 'uint16'],
  ['iCentralAtom', 1, 'uint32'],
  ['iResType', 1, 'uint16'],
  ['resno', 1, 'int32'],
  ['sstruc', 1, 'uint8'],
  ['inscode', 1, 'uint8'],
  ['selected', 1, 'uint8'],
  ['iColor', 1, 'uint8'],
  ['isPolymer', 1, 'uint8']
]

class ResidueProxy {

  constructor (soup, iRes) {
    this.soup = soup
    if (Number.isInteger(iRes)) {
      this.load(iRes)
    }
  }

  load (iRes) {
    /**
     * {
        type: resType,
        id: res_id,
        selected: false,
        isPolymer: isPolymer,
        isWater: isWater,
        isGrid: isGrid,
        isLigand: !isWater && !isPolymer && !isGrid,
        bonds: [],
        color: null,
      }
     */
    this.i = iRes
    this.residue = {}
    this.residue.i = this.i
    this.residue.getCentralAtom = () => this.getCentralAtom()
    this.residue.iAtom = this.soup.residueStore.iCentralAtom[this.i]
    this.residue.isPolymer = this.soup.residueStore.isPolymer[this.i] == 1
    let iColor = this.soup.residueStore.iColor[this.i]
    this.residue.color = this.soup.colorTable[iColor]
    this.residue.selected = this.soup.residueStore.selected[this.i] === 1
    let iResType = this.soup.residueStore.iResType[this.i]
    this.residue.resType = this.soup.residueTypes[iResType]
    if (this.i in this.soup.residueNormal) {
      this.residue.normal = this.soup.residueNormal[this.i]
    } else {
      this.residue.normal = null
    }
    this.residue.getAtom = (atomType) => this.getAtom(atomType)
    this.residue.checkAtomTypes = (atomTypes) => this.checkAtomTypes(atomTypes)
    this.residue.eachAtom = (cb) => this.eachAtom(cb)
    this.residue.getAtoms = () => this.getAtoms()
    this.residue.getResId = () => getResIdFromAtom(this.getCentralAtom())
    this.residue.ss = intToChar(this.soup.residueStore.sstruc[this.i])
    return this.residue
  }



  getAtoms () {
    let iStart = this.soup.residueStore.atomOffset[this.i]
    let n = this.soup.residueStore.atomCount[this.i]
    let iEnd = iStart + n
    let atoms = []
    for (let i = iStart; i < iEnd; i += 1) {
      atoms.push(this.soup.atoms[i])
    }
    return atoms
  }

  getCentralAtom () {
    return this.soup.getAtom(this.residue.iAtom)
  }

  eachAtom (callback) {
    for (let a of this.getAtoms()) {
      callback(a)
    }
  }

  getAtom (atomType) {
    for (let a of this.getAtoms()) {
      if (a.type === atomType) {
        return a
      }
    }
    return null
  }

  checkAtomTypes (atomTypes) {
    for (let atomType of atomTypes) {
      let a = this.getAtom(atomType)
      if (a !== null) {
        return true
      }
    }
    return false
  }
}

/**
 * Soup
 * -------
 * The main data object that holds information
 * about the soup. This object is responsible
 * for reading the data from the PDB and turning
 * it into a suitable javascript object.
 *
 * The soup will be embedded in a Scene
 * object that will handle all the different
 * viewing options.
 *
 * Allowable actions on the Scene of the Soup
 * will be made via the Controller object. This
 * includes AJAX operations with the server
 * jolecule.appspot.com, and uses jQuery for the
 * i/o operations with the server.
 */
class Soup {

  constructor () {
    this.atoms = []
    this.iResByResId = {}
    this.bonds = []
    this.parsingError = ''
    this.default_html = ''

    this.nhPartners = {}
    this.normals = {}
    this.residueNormal = {}
    this.residueStore = new Store(residueStoreFields)
    this.residueProxy = new ResidueProxy(this)
    this.residueTypes = []
    this.residueBonds = []

    this.colorTable = []
    this.grid = {
      bCutoff: 0.8,
      bMax: 2,
      bMin: 0.4,
      changed: true,
      isElem: {}
    }
  }

  load (protein_data) {

    this.pdb_id = protein_data['pdb_id']

    let title = parsetTitleFromPdbText(protein_data['pdb_text'])
    this.default_html = this.pdb_id + ': ' + title

    let atomLines = extractAtomLines(protein_data['pdb_text'])
    let newAtoms = this.makeAtomsFromPdbLines(atomLines, this.pdb_id)
    this.atoms = _.concat(this.atoms, newAtoms)
    for (let i = 0; i < this.atoms.length; i += 1) {
      this.atoms[i].i = i
    }

    this.addResiduesFromNewAtoms(newAtoms)

    this.calcBonds()
    this.assignBondsToResidues()

    this.calcMaxLength()

    this.findSecondaryStructure()

    console.log(
      `Soup.load added ${this.pdb_id}: ` +
      `${this.getAtomCount()} atoms, ` +
      `${this.bonds.length} bonds, ` +
      `${this.getResidueCount()} residues`)
  }

  makeAtomsFromPdbLines (lines, pdb_id) {
    let atoms = []
    if (lines.length === 0) {
      this.parsingError = 'No atom lines'
      return
    }
    for (let i = 0; i < lines.length; i += 1) {
      let line = lines[i]
      try {
        if (line.substr(0, 4) === 'ATOM' ||
          line.substr(0, 6) === 'HETATM') {

          let x = parseFloat(line.substr(30, 7))
          let y = parseFloat(line.substr(38, 7))
          let z = parseFloat(line.substr(46, 7))

          let chain = _.trim(line[21])

          let res_num = _.trim(line.substr(22, 5))
          let res_type = _.trim(line.substr(17, 3))

          let atom_type = _.trim(line.substr(12, 4))
          let label = res_num + ' - ' + res_type + ' - ' + atom_type

          let bfactor = parseFloat(line.substr(60, 6))

          let elem = delete_numbers(_.trim(line.substr(76, 2)))
          if (elem === '') {
            elem = delete_numbers(_.trim(atom_type)).substr(0, 1)
          }

          let alt = _.trim(line.substr(16, 1))

          if (chain) {
            label = chain + ':' + label
          }

          atoms.push({
            'pdb_id': pdb_id,
            'pos': v3.create(x, y, z),
            'res_type': res_type,
            'alt': alt,
            'chain': chain,
            'res_num': res_num,
            'elem': elem,
            'i': i,
            'type': atom_type,
            'label': label,
            'bfactor': bfactor
          })
        }
      } catch (e) {
        this.parsingError = 'line ' + i
        console.log(`Error: "${line}"`)
        return
      }
    }
    return atoms
  }

  getCentralAtom () {
    return getClosestAtom(this.center(), this.atoms)
  }

  makeResidue (atom, resId) {
    let iRes = this.getResidueCount()
    let resType = _.trim(atom.res_type)
    let isProtein = inArray(resType, proteinResTypes)
    let isNucleotide = inArray(resType, dnaResTypes) || inArray(resType, rnaResTypes)
    let isPolymer = isProtein || isNucleotide
    let newRes = {
      normal: null
    }

    this.residueStore.count += 1
    this.residueStore.growIfFull()

    this.iResByResId[resId] = iRes

    if (!_.includes(this.residueTypes, resType)) {
      this.residueTypes.push(resType)
    }
    this.residueStore.iResType[iRes] = this.residueTypes.indexOf(resType)
    this.residueStore.isPolymer[iRes] = isPolymer ? 1 : 0
    this.residueStore.atomCount[iRes] = 0
    this.residueStore.atomOffset[iRes] = atom.i
  }

  addResiduesFromNewAtoms (atoms) {
    let lastResId = ''

    for (let a of atoms) {
      let resId = getResIdFromAtom(a)
      if (resId !== lastResId) {
        this.makeResidue(a, resId)
        lastResId = resId
      }
      let iRes = this.iResByResId[resId]
      this.residueStore.atomCount[iRes] += 1
      a.iRes = iRes
    }

    let nResidue = this.getResidueCount()
    for (let iRes = 0; iRes < nResidue; iRes += 1) {
      let res = this.getResidue(iRes)

      // set central atom of residue
      let iAtom
      if (this.hasProteinBackbone(iRes)) {
        iAtom = res.getAtom('CA').i
      } else if (this.hasSugarBackbone(iRes)) {
        iAtom = res.getAtom('C3\'').i
      } else {
        let atoms = res.getAtoms()
        iAtom = getClosestAtom(getCenter(atoms), atoms).i
      }

      // check non-standard residue types
      if (!res.isPolymer) {
        if (iRes > 0) {
          if (this.isPeptideConnected(iRes - 1, iRes)) {
            iAtom = res.getAtom('CA').i
            this.residueStore.isPolymer[iRes] = 1
          } else if (this.isSugarPhosphateConnected(iRes - 1, iRes)) {
            iAtom = res.getAtom('C3\'').i
            this.residueStore.isPolymer[iRes] = 1
            this.setResidueSs(iRes, 'R')
          }
        }
      }

      this.residueStore.iCentralAtom[iRes] = iAtom
    }
  }

  setResidueSs (iRes, ss) {
    this.residueStore.sstruc[iRes] = ss.charCodeAt(0)
  }

  setResidueColor (iRes, color) {
    if (!_.includes(this.colorTable, color)) {
      this.colorTable.push(color)
    }
    this.residueStore.iColor[iRes] = this.colorTable.indexOf(color)
  }

  /**
   * TODO: replace with bounding box?
   */
  calcMaxLength () {
    let atoms = this.atoms

    let maxima = [0.0, 0.0, 0.0]
    let minima = [0.0, 0.0, 0.0]
    let spans = [0.0, 0.0, 0.0]

    function comp (v, i) {
      if (i === 0) return v.x
      if (i === 1) return v.y
      if (i === 2) return v.z
    }

    for (let iDim = 0; iDim < 3; iDim++) {
      for (let iAtom = 0; iAtom < atoms.length; iAtom += 1) {
        if (minima[iDim] > comp(atoms[iAtom].pos, iDim)) {
          minima[iDim] = comp(atoms[iAtom].pos, iDim)
        }
        if (maxima[iDim] < comp(atoms[iAtom].pos, iDim)) {
          maxima[iDim] = comp(atoms[iAtom].pos, iDim)
        }
      }
      spans[iDim] = maxima[iDim] - minima[iDim]
    }
    this.maxLength = Math.max(spans[0], spans[1], spans[2])
  }

  calcBonds () {

    this.bonds = []

    const small_cutoff = 1.2
    const medium_cutoff = 1.9
    const large_cutoff = 2.4
    const CHONPS = ['C', 'H', 'O', 'N', 'P', 'S']

    let vertices = _.map(this.atoms, a => [a.pos.x, a.pos.y, a.pos.z])

    for (let pair of getClosePairs(vertices)) {

      let atom1 = this.atoms[pair[0]]
      let atom2 = this.atoms[pair[1]]

      // HACK: to avoid the water grid bond calculation
      // step that kills the rendering
      if ((atom1.res_type === 'HOH') || (atom2.res_type === 'HOH')) {
        continue
      }
      if ((atom1.res_type === 'XXX') || (atom2.res_type === 'XXX')) {
        continue
      }

      if ((atom1.alt !== '') && (atom2.alt !== '')) {
        if (atom1.alt !== atom2.alt) {
          continue
        }
      }

      let cutoff
      if ((atom1.elem === 'H') || (atom2.elem === 'H')) {
        cutoff = small_cutoff
      } else if (
        inArray(atom1.elem, CHONPS) &&
        inArray(atom2.elem, CHONPS)) {
        cutoff = medium_cutoff
      } else {
        cutoff = large_cutoff
      }

      if (v3.distance(atom1.pos, atom2.pos) <= cutoff) {
        this.bonds.push({atom1, atom2})
      }
    }
  }

  assignBondsToResidues () {
    for (let bond of this.bonds) {
      let atom1 = bond.atom1
      let atom2 = bond.atom2
      pushToListInDic(this.residueBonds, atom1.iRes, bond)
      if (atom1.iRes !== atom2.iRes) {
        pushToListInDic(this.residueBonds, atom2.iRes, bond)
      }
    }
  }

  hasSugarBackbone (iRes) {
    return this.getResidue(iRes).checkAtomTypes([
      'C3\'', 'O3\'', 'C5\'', 'O4\'', 'C1\''])
  }

  /**
   * Detect phosphate sugar bond
   */
  isSugarPhosphateConnected (iRes0, iRes1) {
    if (this.hasSugarBackbone(iRes0) &&
      this.hasSugarBackbone(iRes1) &&
      this.getResidue(iRes1).checkAtomTypes(['P'])) {
      let o3 = this.getResidue(iRes0).getAtom('O3\'')
      let p = this.getResidue(iRes1).getAtom('P')
      if (v3.distance(o3.pos, p.pos) < 2.5) {
        return true
      }
    }
    return false
  }

  getNucleotideNormal (iRes) {
    let c3 = this.getResidue(iRes).getAtom('C3\'')
    let c5 = this.getResidue(iRes).getAtom('C5\'')
    let c1 = this.getResidue(iRes).getAtom('C1\'')
    let forward = v3.diff(c3.pos, c5.pos)
    let up = v3.diff(c1.pos, c3.pos)
    return v3.crossProduct(forward, up)
  }

  hasProteinBackbone (iRes) {
    return this.getResidue(iRes).checkAtomTypes(['CA', 'N', 'C'])
  }

  /**
   * Detect peptide bond
   * @returns {boolean}
   */
  isPeptideConnected (iRes0, iRes1) {
    if (this.hasProteinBackbone(iRes0) && this.hasProteinBackbone(iRes1)) {
      let c = this.getResidue(iRes0).getAtom('C')
      let n = this.getResidue(iRes1).getAtom('N')
      if (v3.distance(c.pos, n.pos) < 2) {
        return true
      }
    }
    return false
  }

  /**
   * Methods to calculate secondary-structure using Kabsch-Sanders
   */

  /**
   * Find backbone hydrogen bonds
   */
  findBackboneHbonds () {
    let atoms = []
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      let residue = this.getResidue(iRes)
      if (residue.isPolymer) {
        for (let aTypeName of ['O', 'N']) {
          let a = residue.getAtom(aTypeName)
          if (a !== null) {
            atoms.push(a)
          }
        }
      }
    }

    let vertices = _.map(atoms, a => [a.pos.x, a.pos.y, a.pos.z])
    let cutoff = 3.5
    for (let pair of getClosePairs(vertices)) {
      let a0 = atoms[pair[0]]
      let a1 = atoms[pair[1]]
      if ((a0.elem === 'O') && (a1.elem === 'N')) {
        [a0, a1] = [a1, a0]
      }
      if (!((a0.elem === 'N') && (a1.elem === 'O'))) {
        continue
      }
      let iRes0 = a0.iRes
      let iRes1 = a1.iRes
      if (iRes0 === iRes1) {
        continue
      }
      if (v3.distance(a0.pos, a1.pos) <= cutoff) {
        pushToListInDic(this.nhPartners, iRes0, iRes1)
      }
    }
  }

  isCONHBonded (iRes0, iRes1) {
    let nRes = this.getResidueCount()
    if ((iRes1 < 0) || (iRes1 >= nRes)) {
      return false
    }
    if ((iRes0 < 0) || (iRes0 >= nRes)) {
      return false
    }
    return _.includes(this.nhPartners[iRes1], iRes0)
  }

  vecBetweenResidues (i_res0, i_res1) {
    let atom0 = this.getResidue(i_res0).getCentralAtom()
    let atom1 = this.getResidue(i_res1).getCentralAtom()
    return v3.diff(atom0.pos, atom1.pos)
  }

  /**
   * Find Secondary Structure:
   * - H - alpha-helix/3-10-helix
   * - E - beta-sheet
   * - C - coil
   * - - - ligand
   * - W - water
   * - D - DNA or RNA
   * - R - non-standard nucleotide
   */
  findSecondaryStructure () {
    let nRes = this.getResidueCount()

    for (let iRes = 0; iRes < nRes; iRes += 1) {
      let residue = this.getResidue(iRes)

      // miscellaneous - hetero and ligands
      this.setResidueSs(iRes, '-')

      if (residue.resType === "HOH") {
        this.setResidueSs(iRes, 'W')
      }

      if (residue.resType === "XXX") {
        this.setResidueSs(iRes, 'G')
      }

      if (residue.isPolymer) {

        // nucleotide
        if (this.hasSugarBackbone(iRes)) {
          this.setResidueSs(iRes, 'D')
        }

        // all protein start as coil
        if (this.hasProteinBackbone(iRes)) {
          this.setResidueSs(iRes, 'C')
        }
      }
    }

    this.findBackboneHbonds()

    for (let iRes1 = 0; iRes1 < nRes; iRes1 += 1) {

      let residue = this.getResidue(iRes1)

      if (_.includes('DR', residue.ss)) {
        pushToListInDic(this.normals, iRes1, this.getNucleotideNormal(iRes1))
      }

      // alpha-helix
      if (this.isCONHBonded(iRes1, iRes1 + 4) &&
        this.isCONHBonded(iRes1 + 1, iRes1 + 5)) {
        let normal1 = this.vecBetweenResidues(iRes1, iRes1 + 4)
        let normal2 = this.vecBetweenResidues(iRes1 + 1, iRes1 + 5)
        for (let iRes2 = iRes1 + 1; iRes2 < iRes1 + 5; iRes2 += 1) {
          this.setResidueSs(iRes2, 'H')
          pushToListInDic(this.normals, iRes2, normal1)
          pushToListInDic(this.normals, iRes2, normal2)
        }
      }

      // 3-10 helix
      if (this.isCONHBonded(iRes1, iRes1 + 3) &&
        this.isCONHBonded(iRes1 + 1, iRes1 + 4)) {
        let normal1 = this.vecBetweenResidues(iRes1, iRes1 + 3)
        let normal2 = this.vecBetweenResidues(iRes1 + 1, iRes1 + 4)
        for (let iRes2 = iRes1 + 1; iRes2 < iRes1 + 4; iRes2 += 1) {
          this.setResidueSs(iRes2, 'H')
          pushToListInDic(this.normals, iRes2, normal1)
          pushToListInDic(this.normals, iRes2, normal2)
        }
      }

      for (let iRes2 = iRes1 + 1; iRes2 < nRes; iRes2 += 1) {

        if ((Math.abs(iRes1 - iRes2) <= 5)) {
          continue
        }

        let betaResidueIndices = []

        // parallel beta sheet pairs
        if (this.isCONHBonded(iRes1, iRes2 + 1) &&
            this.isCONHBonded(iRes2 - 1, iRes1)) {
          betaResidueIndices = betaResidueIndices.concat([iRes1, iRes2])
        }
        if (this.isCONHBonded(iRes1 - 1, iRes2) &&
            this.isCONHBonded(iRes2, iRes1 + 1)) {
          betaResidueIndices = betaResidueIndices.concat([iRes1, iRes2])
        }

        // anti-parallel hbonded beta sheet pairs
        if (this.isCONHBonded(iRes1, iRes2) &&
            this.isCONHBonded(iRes2, iRes1)) {
          betaResidueIndices = betaResidueIndices.concat([iRes1, iRes2])
          let normal = this.vecBetweenResidues(iRes1, iRes2)
          pushToListInDic(this.normals, iRes1, normal)
          pushToListInDic(this.normals, iRes2, v3.scaled(normal, -1))
        }

        // anti-parallel non-hbonded beta sheet pairs
        if (this.isCONHBonded(iRes1 - 1, iRes2 + 1) &&
            this.isCONHBonded(iRes2 - 1, iRes1 + 1)) {
          betaResidueIndices = betaResidueIndices.concat([iRes1, iRes2])
          let normal = this.vecBetweenResidues(iRes1, iRes2)
          pushToListInDic(this.normals, iRes1, v3.scaled(normal, -1))
          pushToListInDic(this.normals, iRes2, normal)
        }

        for (let iRes of betaResidueIndices) {
          this.setResidueSs(iRes, 'E')
        }
      }
    }

    // average normals to make a nice average
    for (let iRes = 0; iRes < nRes; iRes += 1) {
      if ((iRes in this.normals) && (this.normals[iRes].length > 0)) {
        let normalSum = v3.create(0, 0, 0)
        for (let normal of this.normals[iRes]) {
          normalSum = v3.sum(normalSum, normal)
        }
        this.residueNormal[iRes] = v3.normalized(normalSum)
      }
    }

    // flip every second beta-strand normal so they are
    // consistently pointing in the same direction
    for (let iRes = 1; iRes < nRes; iRes += 1) {
      let prevRes = this.getResidue(iRes - 1)
      let res = this.getResidue(iRes)
      if ((res.ss === prevRes.ss) && (res.ss === 'E')) {
        if (res.normal && prevRes.normal) {
          if (res.normal.dot(prevRes.normal) < 0) {
            this.residueNormal[iRes].normal.negate()
          }
        }
      }
    }

  }

  getAtom (iAtom) {
    return this.atoms[iAtom]
  }

  getAtomCount () {
    return this.atoms.length
  }

  getResidue (iRes) {
    return this.residueProxy.load(iRes)
  }

  getResidueCount () {
    return this.residueStore.count
  }

  center () {
    let x_center = 0
    let y_center = 0
    let z_center = 0
    let n = this.atoms.length
    for (let i = 0; i < n; i += 1) {
      x_center += this.atoms[i].pos.x
      y_center += this.atoms[i].pos.y
      z_center += this.atoms[i].pos.z
    }
    return v3.create(x_center / n, y_center / n, z_center / n)
  }

  clearSelectedResidues () {
    for (let i = 0; i < this.getResidueCount(); i += 1) {
      this.residueStore.selected[i] = 0
    }
  }

  areCloseResidues (iRes0, iRes1) {
    let res0 = this.getResidue(iRes0)
    let atom0 = this.getAtom(res0.iAtom)
    let atoms0 = res0.getAtoms()

    let res1 = this.getResidue(iRes1)
    let atom1 = this.getAtom(res1.iAtom)
    let atoms1 = res1.getAtoms()

    if (v3.distance(atom0.pos, atom1.pos) > 17) {
      return false
    }

    for (let atom0 of atoms0) {
      for (let atom1 of atoms1) {
        if (v3.distance(atom0.pos, atom1.pos) < 4) {
          return true
        }
      }
    }
    return false
  }

  selectNeighbourResidues (iRes, selected) {
    this.getResidue(iRes).selected = selected
    for (let jRes = 0; jRes < this.getResidueCount(); jRes += 1) {
      if (this.areCloseResidues(jRes, iRes)) {
        let val = selected ? 1 : 0
        this.residueStore.selected[jRes] = val
      }
    }
  }

  /**
   * Searches autodock grid atoms for B-factor limits
   */
  findGridLimits () {
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      let residue = this.getResidue(iRes)
      if (residue.ss === "G") {
        let atom = residue.getCentralAtom()
        if (!(atom.elem in this.grid.isElem)) {
          this.grid.isElem[atom.elem] = true
        }
        if (this.grid.bMin === null) {
          this.grid.bMin = atom.bfactor
          this.grid.bMax = atom.bfactor
        } else {
          if (atom.bfactor > this.grid.bMax) {
            this.grid.bMax = atom.bfactor
          }
          if (atom.bfactor < this.grid.bMin) {
            this.grid.bMin = atom.bfactor
          }
        }
      }
    }

    if (this.grid.bMin === null) {
      this.grid.bMin = 0
    }
    if (this.grid.bMax === null) {
      this.grid.bMin = 0
    }
    this.grid.bCutoff = this.grid.bMin
  }

}

/**
 *
 * View
 * ----
 * A view includes all pertinent viewing options
 * needed to render the soup in the way
 * for the user.
 *
 * JolyCamera stores information about
 * the direction and zoom that a soup
 * should be viewed
 *
 * Inside a view are two cameras as a camera is
 * defined in terms of an existing frame of
 * reference. The first camera refers to the
 * current_view camera.
 *
 * The absolute camera is expressed with respect
 * to the original frame of coordinate of the PDB.
 *
 * Converts JolyCamera to Target, the view structure for
 * Display
 *
 * JolyCamera {
 *    pos: scene center, camera focus
 *    up: gives the direction of the y vector from pos
 *    in: gives the positive z-axis direction
 *    zFront: clipping plane in front of the camera focus
 *    zBack: clipping plane behind the camera focus
 * }
 *
 * camera {
 *    focus: position that camera is looking at
 *    position: position of camera - distance away gives zoom
 *    up: vector direction denoting the up direction of camera
 *    zFront: clipping plane in front of the camera focus
 *    zBack: clipping plane behind the camera focus
 * }
 *
 * Coordinates
 * - JolyCamera
 *     - scene is from 0 to positive z; since canvasjolecule draws +z into screen
 *     - as opengl +z is out of screen, need to flip z direction
 *     - in opengl, the box is -1 to 1 that gets projected on screen + perspective
 *     - by adding a i distance to move the camera further into -z
 *     - z_front and z_back define cutoffs
 * - opengl:
 *     - x right -> left
 *     - y bottom -> top (inverse of classic 2D coordinate)
 *     - z far -> near
 *     - that is positive Z direction is out of the screen
 *     - box -1to +1
 */
class View {

  constructor () {
    this.id = 'view:000000'
    this.res_id = ''
    this.i_atom = -1
    this.order = 1
    this.camera = {
      focus: v3.create(0, 0, 0),
      position: v3.create(0, 0, -1),
      up: v3.create(0, 1, 0),
      zFront: 0,
      zBack: 0,
      zoom: 1
    }
    this.selected = []
    this.labels = []
    this.distances = []
    this.text = 'Default view of PDB file'
    this.creator = ''
    this.url = getWindowUrl()
    this.show = {
      sidechain: true,
      peptide: true,
      hydrogen: false,
      water: false,
      ligands: true,
      trace: false,
      all_atom: false,
      ribbon: true
    }
  }

  setCamera (camera) {
    this.camera = camera
  }

  makeDefaultOfSoup (soup) {
    let atom = soup.getCentralAtom()
    this.i_atom = atom.i
    this.res_id = getResIdFromAtom(atom)

    this.show.sidechain = false

    this.camera.zFront = -soup.maxLength / 2
    this.camera.zBack = soup.maxLength / 2
    this.camera.zoom = Math.abs(soup.maxLength)
    this.camera.up = v3.create(0, 1, 0)
    this.camera.focus.copy(atom.pos)
    this.camera.position = v3
      .create(0, 0, -this.camera.zoom).add(atom.pos)

    this.order = 0
    this.text = soup.default_html
    this.pdb_id = soup.pdb_id
  }

  getViewTranslatedTo (pos) {
    let view = this.clone()
    let disp = pos.clone().sub(view.camera.focus)
    view.camera.focus.copy(pos)
    view.camera.position.add(disp)
    return view
  }

  clone () {
    let v = new View()
    v.id = this.id
    v.res_id = this.res_id
    v.i_atom = this.i_atom
    v.selected = this.selected
    v.labels = _.cloneDeep(this.labels)
    v.distances = _.cloneDeep(this.distances)
    v.order = this.order
    v.text = this.text
    v.time = this.time
    v.url = this.url
    v.camera = _.cloneDeep(this.camera)
    v.show = _.cloneDeep(this.show)
    return v
  }

  getDict () {
    let cameraDir = this.camera.focus.clone()
      .sub(this.camera.position)
    let zoom = cameraDir.length()
    cameraDir.normalize()
    let pos = this.camera.focus
    let in_v = pos.clone().add(cameraDir)
    let up_v = pos.clone().sub(this.camera.up)
    return {
      version: 2,
      view_id: this.id,
      creator: this.creator,
      pdb_id: this.pdb_id,
      order: this.order,
      show: this.show,
      text: this.text,
      res_id: this.res_id,
      i_atom: this.i_atom,
      labels: this.labels,
      selected: this.selected,
      distances: this.distances,
      camera: {
        slab: {
          z_front: this.camera.zFront,
          z_back: this.camera.zBack,
          zoom: zoom
        },
        pos: [pos.x, pos.y, pos.z],
        up: [up_v.x, up_v.y, up_v.z],
        in: [in_v.x, in_v.y, in_v.z]
      }
    }
  }

  setCameraFromJolyCamera (jolyCamera) {
    let focus = v3.clone(jolyCamera.pos)

    let cameraDirection = v3
      .clone(jolyCamera.in_v)
      .sub(focus)
      .multiplyScalar(jolyCamera.zoom)
      .negate()

    let position = v3
      .clone(focus).add(cameraDirection)

    let up = v3
      .clone(jolyCamera.up_v)
      .sub(focus)
      .negate()

    this.camera = {
      focus: focus,
      position: position,
      up: up,
      zFront: jolyCamera.z_front,
      zBack: jolyCamera.z_back,
      zoom: jolyCamera.zoom
    }
  }

  setFromDict (flat_dict) {
    this.id = flat_dict.view_id
    this.view_id = flat_dict.view_id
    this.pdb_id = flat_dict.pdb_id
    this.lock = flat_dict.lock
    this.text = flat_dict.text
    this.creator = flat_dict.creator
    this.order = flat_dict.order
    this.res_id = flat_dict.res_id
    this.i_atom = flat_dict.i_atom

    this.labels = flat_dict.labels
    this.selected = flat_dict.selected
    this.distances = flat_dict.distances

    this.show = flat_dict.show
    if (!(this.show.all_atom || this.show.trace || this.show.ribbon)) {
      this.show.ribbon = true
    }

    let jolyCamera = {
      pos: v3.create(0, 0, 0),
      up_v: v3.create(0, 1, 0),
      in_v: v3.create(0, 0, 1),
      zoom: 1.0,
      z_front: 0.0,
      z_back: 0.0
    }
    jolyCamera.pos.x = flat_dict.camera.pos[0]
    jolyCamera.pos.y = flat_dict.camera.pos[1]
    jolyCamera.pos.z = flat_dict.camera.pos[2]
    jolyCamera.up_v.x = flat_dict.camera.up[0]
    jolyCamera.up_v.y = flat_dict.camera.up[1]
    jolyCamera.up_v.z = flat_dict.camera.up[2]
    jolyCamera.in_v.x = flat_dict.camera.in[0]
    jolyCamera.in_v.y = flat_dict.camera.in[1]
    jolyCamera.in_v.z = flat_dict.camera.in[2]
    jolyCamera.z_front = flat_dict.camera.slab.z_front
    jolyCamera.z_back = flat_dict.camera.slab.z_back
    jolyCamera.zoom = flat_dict.camera.slab.zoom

    this.setCameraFromJolyCamera(jolyCamera)
  }

}

function interpolateCameras (oldCamera, futureCamera, t) {

  let oldCameraDirection = oldCamera.position.clone()
    .sub(oldCamera.focus)
  let oldZoom = oldCameraDirection.length()
  oldCameraDirection.normalize()

  let futureCameraDirection =
    futureCamera.position.clone().sub(futureCamera.focus)

  let futureZoom = futureCameraDirection.length()
  futureCameraDirection.normalize()

  let cameraDirRotation = glgeom.getUnitVectorRotation(
    oldCameraDirection, futureCameraDirection)

  let partialRotatedCameraUp = oldCamera.up.clone()
    .applyQuaternion(cameraDirRotation)

  let fullCameraUpRotation = glgeom
    .getUnitVectorRotation(partialRotatedCameraUp, futureCamera.up)
    .multiply(cameraDirRotation)
  let cameraUpRotation = glgeom.getFractionRotation(
    fullCameraUpRotation, t)

  let focusDisp = futureCamera.focus.clone()
    .sub(oldCamera.focus)
    .multiplyScalar(t)

  let focus = oldCamera.focus.clone().add(focusDisp)

  let zoom = glgeom.fraction(oldZoom, futureZoom, t)

  let focusToPosition = oldCameraDirection.clone()
    .applyQuaternion(cameraUpRotation)
    .multiplyScalar(zoom)

  return {
    focus: focus,
    position: focus.clone().add(focusToPosition),
    up: oldCamera.up.clone().applyQuaternion(cameraUpRotation),
    zFront: glgeom.fraction(oldCamera.zFront, futureCamera.zFront, t),
    zBack: glgeom.fraction(oldCamera.zBack, futureCamera.zBack, t),
    zoom: zoom
  }
}

/**
 * The Scene contains a soup and a list of
 * views of the soup, including the current
 * view, and a target view for animation
 */
class Scene {

  constructor (soup) {

    // the soup data for the scene
    this.soup = soup

    // stores the current camera, display
    // options, distances, labels, selected
    // residues
    this.current_view = new View()

    // stores other views that can be reloaded
    this.saved_views_by_id = {}
    this.saved_views = []
    this.i_last_view = 0

    // stores a target view for animation
    this.target_view = null
    // timing counter that is continually decremented
    // until it becomes negative
    this.n_update_step = -1
    // this is to set the time between transitions of views
    this.max_update_step = 20
  }

  set_target_view (view) {
    this.n_update_step = this.max_update_step
    this.target_view = view.clone()
  }

  centered_atom () {
    let i = this.current_view.i_atom
    return this.soup.getAtom(i)
  }

  get_i_saved_view_from_id (id) {
    for (let j = 0; j < this.saved_views.length; j += 1) {
      if (this.saved_views[j].id === id) {
        return j
      }
    }
    return -1
  }

  insert_view (j, new_id, new_view) {
    this.saved_views_by_id[new_id] = new_view
    if (j >= this.saved_views.length) {
      this.saved_views.push(new_view)
    } else {
      this.saved_views.splice(j, 0, new_view)
    }
    this.i_last_view = j
    for (let i = 0; i < this.saved_views.length; i++) {
      this.saved_views[i].order = i
    }
  }

  remove_saved_view (id) {
    let i = this.get_i_saved_view_from_id(id)
    if (i < 0) {
      return
    }
    this.saved_views.splice(i, 1)
    delete this.saved_views_by_id[id]
    for (let j = 0; j < this.saved_views.length; j++) {
      this.saved_views[j].order = j
    }
    if (this.i_last_view >= this.saved_views.length) {
      this.i_last_view = this.saved_views.length - 1
    }
    this.changed = true
  }

  save_view (view) {
    this.saved_views_by_id[view.id] = view
    this.saved_views.push(view)
  }

}

/**
 * The Controller for Scene and Soup.
 *
 * All mutations to Scene and Soup must go through here.
 */
class Controller {

  constructor (scene) {
    this.soup = scene.soup
    this.scene = scene
  }

  delete_dist (i) {
    this.scene.current_view.distances.splice(i, 1)
    this.scene.changed = true
  }

  make_dist (iAtom1, iAtom2) {
    this.scene.current_view.distances.push(
      {'i_atom1': iAtom1, 'i_atom2': iAtom2})
    this.scene.changed = true
  }

  make_label (iAtom, text) {
    this.scene.current_view.labels.push({
      'i_atom': iAtom, 'text': text,
    })
    this.scene.changed = true
  }

  delete_label (iLabel) {
    this.scene.current_view.labels.splice(iLabel, 1)
    this.scene.changed = true
  }

  set_target_view (view) {
    this.scene.set_target_view(view)
  }

  set_target_view_by_id (viewId) {
    let view = this.scene.saved_views_by_id[viewId]
    this.scene.i_last_view = this.scene.saved_views_by_id[viewId].order
    this.set_target_view(view)
  }

  set_target_view_by_atom (iAtom) {
    let atom = this.soup.getAtom(iAtom)
    let view = this.scene.current_view.getViewTranslatedTo(atom.pos)
    view.res_id = this.soup.getResidue(atom.iRes).id
    view.i_atom = iAtom
    this.set_target_view(view)
  }

  set_target_prev_residue () {
    let curr_res_id
    if (this.scene.n_update_step >= 0) {
      curr_res_id = this.scene.target_view.res_id
    } else {
      curr_res_id = this.scene.current_view.res_id
    }
    let i = this.soup.iResByResId[curr_res_id]
    if (i <= 0) {
      i = this.soup.getResidueCount() - 1
    } else {
      i -= 1
    }
    let iAtom = this.soup.getResidue(i).iAtom
    this.set_target_view_by_atom(iAtom)
  }

  set_target_next_residue () {
    let curr_res_id
    if (this.scene.n_update_step >= 0) {
      curr_res_id = this.scene.target_view.res_id
    } else {
      curr_res_id = this.scene.current_view.res_id
    }
    let i = this.soup.iResByResId[curr_res_id]
    if (i >= this.soup.getResidueCount() - 1) {
      i = 0
    } else {
      i += 1
    }
    let iAtom = this.soup.getResidue(i).iAtom
    this.set_target_view_by_atom(iAtom)
  }

  set_target_prev_view () {
    let scene = this.scene
    scene.i_last_view -= 1
    if (scene.i_last_view < 0) {
      scene.i_last_view = scene.saved_views.length - 1
    }
    let id = scene.saved_views[scene.i_last_view].id
    this.set_target_view_by_id(id)
    return id
  }

  set_target_next_view () {
    let scene = this.scene
    scene.i_last_view += 1
    if (scene.i_last_view >= scene.saved_views.length) {
      scene.i_last_view = 0
    }
    let id = scene.saved_views[scene.i_last_view].id
    this.set_target_view_by_id(id)
    return id
  }

  swapViews (i, j) {
    this.scene.saved_views[j].order = i
    this.scene.saved_views[i].order = j
    let dummy = this.scene.saved_views[j]
    this.scene.saved_views[j] = this.scene.saved_views[i]
    this.scene.saved_views[i] = dummy
  }

  get_view_dicts () {
    let view_dicts = []
    for (let i = 1; i < this.scene.saved_views.length; i += 1) {
      view_dicts.push(this.scene.saved_views[i].getDict())
    }
    return view_dicts
  }

  make_selected () {
    let result = []
    for (let i = 0; i < this.soup.getResidueCount(); i += 1) {
      if (this.soup.getResidue(i).selected) {
        result.push(i)
      }
    }
    return result
  }

  clear_selected () {
    this.soup.clearSelectedResidues()
    this.scene.current_view.selected = this.make_selected()
    this.scene.changed = true
  }

  select_residue (i, v) {
    this.soup.getResidue(i).selected = v
    this.scene.current_view.selected = this.make_selected()
    this.scene.changed = true
  }

  toggle_neighbors () {
    let res_id = this.scene.current_view.res_id
    let i_res = this.soup.iResByResId[res_id]
    let b
    if (this.last_neighbour_res_id === res_id) {
      b = false
      this.last_neighbour_res_id = null
    } else {
      b = true
      this.last_neighbour_res_id = res_id
    }
    this.soup.selectNeighbourResidues(i_res, b)
    this.scene.current_view.selected = this.make_selected()
    this.scene.changed = true
  }

  save_current_view (new_id) {
    let j = this.scene.i_last_view + 1
    let new_view = this.scene.current_view.clone()
    new_view.text = 'Click edit to change this text.'
    new_view.pdb_id = this.soup.pdb_id
    let time = getCurrentDateStr()
    if (user === '' || typeof user === 'undefined') {
      new_view.creator = '~ [public] @' + time
    } else {
      new_view.creator = '~ ' + user + ' @' + time
    }
    new_view.id = new_id
    new_view.selected = this.make_selected()
    this.scene.insert_view(j, new_id, new_view)
    return j
  }

  delete_view (id) {
    this.scene.remove_saved_view(id)
  }

  sort_views_by_order () {
    function order_sort (a, b) {
      return a.order - b.order
    }

    this.scene.saved_views.sort(order_sort)
    for (let i = 0; i < this.scene.saved_views.length; i += 1) {
      this.scene.saved_views[i].order = i
    }
  }

  load_views_from_flat_views (view_dicts) {
    for (let i = 0; i < view_dicts.length; i += 1) {
      let view = new View()
      view.setFromDict(view_dicts[i])
      if (view.id === 'view:000000') {
        continue
      }
      this.scene.save_view(view)
    }
    this.sort_views_by_order()
  }

  set_backbone_option (option) {
    this.scene.current_view.show.all_atom = false
    this.scene.current_view.show.trace = false
    this.scene.current_view.show.ribbon = false
    this.scene.current_view.show[option] = true
    this.scene.changed = true
  }

  set_show_option (option, bool) {
    console.log('Controller.set_show_option', option, bool)
    this.scene.current_view.show[option] = bool
    this.scene.changed = true
  }

  get_show_option (option) {
    return this.scene.current_view.show[option]
  }

  toggle_show_option (option) {
    let val = this.get_show_option(option)
    this.set_show_option(option, !val)
  }

  flag_changed () {
    this.scene.changed = true
  }

  set_current_view (view) {
    for (let i = 0; i < this.soup.getResidueCount(); i += 1) {
      this.soup.getResidue(i).selected = false
    }
    this.scene.current_view = view.clone()
    let atom = this.soup.getAtom(view.i_atom)
    this.scene.current_view.res_id = getResIdFromAtom(atom)
    for (let i = 0; i < view.selected.length; i += 1) {
      let i_res = view.selected[i]
      this.soup.getResidue(i_res).selected = true
    }
    this.scene.changed = true
  }
}

export {
  Soup,
  Controller,
  interpolateCameras,
  Scene
}