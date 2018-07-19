import _ from 'lodash'
import v3 from './v3'
import { randomId, getWindowUrl, inArray, getCurrentDateStr } from './util.js'
import * as glgeom from './glgeom'
import { SpaceHash } from './pairs.js'
import Store from './store.js'
import BitArray from './bitarray.js'
import * as data from './data'
import * as THREE from 'three'

let user = 'public' // will be overriden by server

function deleteNumbers (text) {
  return text.replace(/\d+/, '')
}

function pushToListInDict (dict, key, value) {
  if (!(key in dict)) {
    dict[key] = []
  }
  dict[key].push(value)
}

function getValueTableIndex (valueList, value) {
  if (!_.includes(valueList, value)) {
    valueList.push(value)
  }
  return valueList.indexOf(value)
}

function intToBool (i) {
  return i === 1
}

function boolToInt (b) {
  return b ? 1 : 0
}

function intToChar (i) {
  return i ? String.fromCharCode(i) : ''
}

function charToInt (c) {
  return c.charCodeAt(0)
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

function getIndexColor (i) {
  return new THREE.Color().setHex(i + 1)
}

const atomStoreFields = [
  ['x', 1, 'float32'],
  ['y', 1, 'float32'],
  ['z', 1, 'float32'],
  ['bfactor', 1, 'float32'],
  ['alt', 1, 'uint8'],
  ['iAtomType', 1, 'uint16'],
  ['iElem', 1, 'uint16'],
  ['iRes', 1, 'uint32'],
  ['iChain', 1, 'int32'],
  ['bondOffset', 1, 'uint32'],
  ['bondCount', 1, 'uint16']
]

class AtomProxy {
  constructor (soup, iAtom) {
    this.soup = soup
    if (Number.isInteger(iAtom)) {
      this.load(iAtom)
    }
    this._pos = v3.create()
  }

  load (iAtom) {
    this.iAtom = iAtom
    return this
  }

  get pos () {
    this._pos.x = this.soup.atomStore.x[this.iAtom]
    this._pos.y = this.soup.atomStore.y[this.iAtom]
    this._pos.z = this.soup.atomStore.z[this.iAtom]
    return this._pos
  }

  get resId () {
    return this.soup.resIds[this.iRes]
  }

  get elem () {
    let iElem = this.soup.atomStore.iElem[this.iAtom]
    return this.soup.elemTable[iElem]
  }

  get bfactor () {
    return this.soup.atomStore.bfactor[this.iAtom]
  }

  get atomType () {
    let iAtomType = this.soup.atomStore.iAtomType[this.iAtom]
    return this.soup.atomTypeTable[iAtomType]
  }

  get alt () {
    return intToChar(this.soup.atomStore.alt[this.iAtom])
  }

  set alt (c) {
    this.soup.atomStore.alt[this.iAtom] = charToInt(c)
  }

  get iRes () {
    return this.soup.atomStore.iRes[this.iAtom]
  }

  set iRes (iRes) {
    this.soup.atomStore.iRes[this.iAtom] = iRes
  }

  get resType () {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    return this.soup.resTypeTable[iResType]
  }

  get label () {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    let resType = this.soup.resTypeTable[iResType]
    let label = this.soup.resIds[this.iRes] +
      ':' + resType +
      ':' + this.atomType
    if (this.alt) {
      label += ':' + this.alt
    }
    return label
  }

  getBondIndices () {
    let iStart = this.soup.atomStore.bondOffset[this.iAtom]
    let n = this.soup.atomStore.bondCount[this.iAtom]
    let iEnd = iStart + n
    return _.range(iStart, iEnd)
  }

  get color () {
    if (this.elem === 'C' || this.elem === 'H') {
      let residue = this.soup.getResidueProxy(this.iRes)
      return residue.activeColor
    } else if (this.elem in data.ElementColors) {
      return data.ElementColors[this.elem]
    }
    return data.darkGrey
  }
}

const residueStoreFields = [
  ['atomOffset', 1, 'uint32'],
  ['atomCount', 1, 'uint16'],
  ['iCentralAtom', 1, 'uint32'],
  ['iResType', 1, 'uint16'],
  ['iChain', 1, 'uint8'],
  ['iStructure', 1, 'uint8'],
  ['resNum', 1, 'int32'],
  ['insCode', 1, 'uint8'],
  ['sstruc', 1, 'uint8'],
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
    this.iRes = iRes
    return this
  }

  get iAtom () {
    return this.soup.residueStore.iCentralAtom[this.iRes]
  }

  set iAtom (iAtom) {
    this.soup.residueStore.iCentralAtom[this.iRes] = iAtom
  }

  get iChain () {
    return this.soup.residueStore.iChain[this.iRes]
  }

  get iStructure () {
    return this.soup.residueStore.iStructure[this.iRes]
  }

  set iStructure (iStructure) {
    this.soup.residueStore.iStructure[this.iRes] = iStructure
  }

  get resId () {
    return this.soup.resIds[this.iRes]
  }

  get resNum () {
    return this.soup.residueStore.resNum[this.iRes]
  }

  get insCode () {
    return intToChar(this.soup.residueStore.insCode[this.iRes])
  }

  set insCode (c) {
    this.soup.residueStore.insCode[this.iRes] = charToInt(c)
  }

  get isPolymer () {
    return intToBool(this.soup.residueStore.isPolymer[this.iRes])
  }

  set isPolymer (v) {
    this.soup.residueStore.isPolymer[this.iRes] = boolToInt(v)
  }

  get color () {
    let iColor = this.soup.residueStore.iColor[this.iRes]
    return this.soup.colorTable[iColor]
  }

  set color (color) {
    let iColor = getValueTableIndex(this.soup.colorTable, color)
    this.soup.residueStore.iColor[this.iRes] = iColor
  }

  get activeColor () {
    let iColor = this.soup.residueStore.iColor[this.iRes]
    let color = this.soup.colorTable[iColor]
    if (this.soup.residueSelect.get(this.iRes)) {
      color = color.clone().offsetHSL(0, 0, +0.3)
    }
    return color
  }

  get selected () {
    return this.soup.residueSelect.get(this.iRes)
  }

  set selected (v) {
    if (v) {
      this.soup.residueSelect.set(this.iRes)
    } else {
      this.soup.residueSelect.clear(this.iRes)
    }
  }

  get sidechain () {
    return this.soup.residueSidechain.get(this.iRes)
  }

  set sidechain (v) {
    if (v) {
      this.soup.residueSidechain.set(this.iRes)
    } else {
      this.soup.residueSidechain.clear(this.iRes)
    }
  }

  get resType () {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    return this.soup.resTypeTable[iResType]
  }

  get normal () {
    let hasNormal = this.iRes in this.soup.residueNormal
    return hasNormal ? this.soup.residueNormal[this.iRes].clone() : null
  }

  get ss () {
    return intToChar(this.soup.residueStore.sstruc[this.iRes])
  }

  set ss (c) {
    this.soup.residueStore.sstruc[this.iRes] = charToInt(c)
  }

  get label () {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    let resType = this.soup.resTypeTable[iResType]
    let label = this.soup.resIds[this.iRes] +
      ':' + resType
    return label
  }

  getAtomIndices () {
    let iStart = this.soup.residueStore.atomOffset[this.iRes]
    let n = this.soup.residueStore.atomCount[this.iRes]
    let iEnd = iStart + n
    return _.range(iStart, iEnd)
  }

  getAtomProxy (atomType) {
    let atom = this.soup.getAtomProxy()
    for (let iAtom of this.getAtomIndices()) {
      atom.iAtom = iAtom
      if (atom.atomType === atomType) {
        return atom
      }
    }
    return null
  }

  getIAtom (atomType) {
    for (let iAtom of this.getAtomIndices()) {
      let iAtomType = this.soup.atomStore.iAtomType[iAtom]
      let testAatomType = this.soup.atomTypeTable[iAtomType]
      if (testAatomType === atomType) {
        return iAtom
      }
    }
    return null
  }

  checkAtomTypes (atomTypes) {
    for (let atomType of atomTypes) {
      if (this.getIAtom(atomType) === null) {
        return false
      }
    }
    return true
  }

  isProteinConnectedToPrev () {
    if (this.iRes === 0) {
      return false
    }

    let thisRes = this
    let prevRes = new ResidueProxy(this.soup, this.iRes - 1)

    const proteinAtomTypes = ['CA']
    if (prevRes.checkAtomTypes(proteinAtomTypes) &&
      thisRes.checkAtomTypes(proteinAtomTypes)) {
      let ca0 = prevRes.getAtomProxy('CA').pos
      let ca1 = thisRes.getAtomProxy('CA').pos
      if (v3.distance(ca0, ca1) < 5) {
        return true
      }
    }

    return false
  }

  isNucleotideConnectedToPrev () {
    if (this.iRes === 0) {
      return false
    }

    let thisRes = this
    let prevRes = new ResidueProxy(this.soup, this.iRes - 1)

    const nucleicAtomTypes = ['C3\'', 'O3\'']

    if (prevRes.checkAtomTypes(nucleicAtomTypes) &&
        thisRes.checkAtomTypes(nucleicAtomTypes) &&
        thisRes.checkAtomTypes(['P'])) {
      let o3 = prevRes.getAtomProxy('O3\'').pos
      let p = thisRes.getAtomProxy('P').pos
      if (v3.distance(o3, p) < 2.5) {
        return true
      }
    }
    return false
  }

  isConnectedToPrev () {
    return this.isProteinConnectedToPrev() || this.isNucleotideConnectedToPrev()
  }

  getNucleotideNormal () {
    let c3 = this.getAtomProxy('C3\'').pos
    let c5 = this.getAtomProxy('C5\'').pos
    let c1 = this.getAtomProxy('C1\'').pos
    let forward = v3.diff(c3, c5)
    let up = v3.diff(c1, c3)
    return v3.crossProduct(forward, up)
  }
}

const bondStoreFields = [
  ['iAtom1', 1, 'int32'],
  ['iAtom2', 1, 'int32']
]

class BondProxy {
  constructor (soup, iBond) {
    this.soup = soup
    if (Number.isInteger(iBond)) {
      this.load(iBond)
    }
  }

  load (iBond) {
    this.iBond = iBond
    return this
  }

  get iAtom1 () {
    return this.soup.bondStore.iAtom1[this.iBond]
  }

  get iAtom2 () {
    return this.soup.bondStore.iAtom2[this.iBond]
  }
}

/**
 * Soup: main data object that holds information
 * about protein structure. The soup will be
 * embedded in a SoupView that will handle
 * all the different viewing options.
 * Allowable mutations on the Soup
 * will be made via the Controller.
 */
class Soup {
  constructor () {
    this.parsingError = ''
    this.title = ''

    this.structureIds = []
    this.structureId = null
    this.iStructure = -1

    this.chains = []

    // stores trace of protein/nucleotide backbones for ribbons
    this.traces = []

    this.atomStore = new Store(atomStoreFields)
    this.residueStore = new Store(residueStoreFields)
    this.bondStore = new Store(bondStoreFields)

    this.resIds = []
    this.residueNormal = {}

    this.residueProxy = new ResidueProxy(this)
    this.atomProxy = new AtomProxy(this)

    this.atomSelect = new BitArray(0)
    this.residueSelect = new BitArray(0)
    this.residueSidechain = new BitArray(0)
    this.bondSelect = new BitArray(0)

    this.elemTable = []
    this.atomTypeTable = []
    this.resTypeTable = []
    this.colorTable = []

    this.grid = {
      bCutoff: 0.8,
      bMax: 2,
      bMin: 0.4,
      changed: true,
      isElem: {},
      convertB: b => -b.toFixed(2)
    }
  }

  isEmpty () {
    return this.getAtomCount() == 0
  }

  load (pdbData) {
    console.log(`Soup.load parse ${this.structureId}...`)

    this.parsePdbData(pdbData.pdb_text, this.structureId)

    this.assignResidueProperties()

    console.log(
      `Soup.load processed ${this.getAtomCount()} atoms, ` +
      `${this.getResidueCount()} residues`)

    console.log('Soup.load finding bonds...')
    this.calcBondsStrategic()

    console.log(`Soup.load calculated ${this.getBondCount()} bonds`)

    this.calcMaxLength()

    this.findSecondaryStructure()
    console.log(`Soup.load calculated secondary-structure`)
  }

  parsePdbData (pdbText, pdbId) {
    this.structureId = pdbId
    this.structureIds.push(pdbId)
    this.iStructure = this.structureIds.length - 1

    let title = parsetTitleFromPdbText(pdbText)
    this.title = `[${this.structureId.toUpperCase()}] ` + title
    console.log('Soup.parsePdbData', this.title)

    const pdbLines = pdbText.split(/\r?\n/)

    let lines = []
    for (let line of pdbLines) {
      if ((line.slice(0, 4) === 'ATOM') ||
        (line.slice(0, 6) === 'HETATM')) {
        lines.push(line)
      }
      if (line.slice(0, 3) === 'END') {
        break
      }
    }

    if (lines.length === 0) {
      this.parsingError = 'No atom lines'
      return
    }

    let x, y, z, chain, resType
    let atomType, bfactor, elem, alt, resNum, insCode

    for (let iLine = 0; iLine < lines.length; iLine += 1) {
      let line = lines[iLine]
      if (line.substr(0, 4) === 'ATOM' || line.substr(0, 6) === 'HETATM') {
        try {
          atomType = _.trim(line.substr(12, 4))
          alt = _.trim(line.substr(16, 1))
          resType = _.trim(line.substr(17, 3))
          chain = _.trim(line[21])
          resNum = parseInt(line.substr(22, 4))
          insCode = line.substr(26, 1)
          x = parseFloat(line.substr(30, 7))
          y = parseFloat(line.substr(38, 7))
          z = parseFloat(line.substr(46, 7))
          bfactor = parseFloat(line.substr(60, 6))
          elem = deleteNumbers(_.trim(line.substr(76, 2)))
        } catch (e) {
          this.parsingError = 'line ' + iLine
          console.log(`Error: "${line}"`)
          continue
        }

        if (elem === '') {
          elem = deleteNumbers(_.trim(atomType)).substr(0, 1)
        }

        this.addAtom(
          x, y, z, bfactor, alt, atomType, elem,
          resType, resNum, insCode, chain)
      }
    }
  }

  async asyncLoadProteinData (proteinData, asyncSetMessageFn) {
    let pdbText = proteinData.pdb_text
    let pdbId = proteinData.pdb_id

    if (proteinData.pdb_text.length === 0) {
      await asyncSetMessageFn('Error: no soup data')
      return
    }

    await asyncSetMessageFn(`Parsing '${pdbId}'`)
    this.parsePdbData(pdbText, pdbId)

    if (this.parsingError) {
      let err = this.soup.parsingError
      await asyncSetMessageFn(`Error parsing soup: ${err}`)
      return
    }

    this.assignResidueProperties()
    this.calcMaxLength()

    let nAtom = this.getAtomCount()
    let nRes = this.getResidueCount()
    await asyncSetMessageFn(
      `Calculating bonds for ${nAtom} atoms, ${nRes} residues...`)

    this.calcBondsStrategic()

    let nBond = this.getBondCount()
    await asyncSetMessageFn(`Calculated ${nBond} bonds. Assigning secondary structure...`)

    this.findSecondaryStructure()
  }

  addAtom (x, y, z, bfactor, alt, atomType, elem, resType, resNum, insCode, chain) {
    let iAtom = this.atomStore.count

    this.atomStore.increment()

    this.atomStore.x[iAtom] = x
    this.atomStore.y[iAtom] = y
    this.atomStore.z[iAtom] = z

    this.atomStore.bfactor[iAtom] = bfactor
    this.atomStore.alt[iAtom] = charToInt(alt)

    this.atomStore.bondCount[iAtom] = 0

    this.atomStore.iAtomType[iAtom] = getValueTableIndex(
      this.atomTypeTable, atomType)

    this.atomStore.iElem[iAtom] = getValueTableIndex(
      this.elemTable, elem)

    let nRes = this.getResidueCount()

    let isNewRes = false
    if (nRes === 0) {
      isNewRes = true
    } else {
      this.residueProxy.iRes = nRes - 1
      if (this.residueProxy.resNum !== resNum) {
        isNewRes = true
      } else if (this.residueProxy.insCode !== insCode) {
        isNewRes = true
      }
    }

    if (isNewRes) {
      this.addResidue(iAtom, resNum, insCode, chain, resType)
    }

    let iRes = this.getResidueCount() - 1
    this.residueStore.atomCount[iRes] += 1
    this.atomStore.iRes[iAtom] = iRes
  }

  addResidue (iFirstAtomInRes, resNum, insCode, chain, resType) {
    let iRes = this.getResidueCount()
    this.residueStore.increment()

    let resId = this.structureId + ':'
    if (chain) {
      resId += chain + ':'
    }
    resId += resNum + _.trim(insCode)

    this.resIds.push(resId)

    let iChain = getValueTableIndex(this.chains, chain)
    this.residueStore.iChain[iRes] = iChain

    this.residueStore.resNum[iRes] = resNum
    this.residueStore.insCode[iRes] = charToInt(insCode)

    this.residueStore.iResType[iRes] = getValueTableIndex(
      this.resTypeTable, resType)

    this.residueStore.atomOffset[iRes] = iFirstAtomInRes
    this.residueStore.atomCount[iRes] = 0

    this.residueStore.iStructure[iRes] = this.iStructure
  }

  getAtomProxyOfCenter () {
    let atomIndices = _.range(this.getAtomCount())
    let center = this.getCenter(atomIndices)
    let iAtom = this.getIAtomClosest(center, atomIndices)
    return this.getAtomProxy(iAtom)
  }

  assignResidueProperties () {
    let res = this.getResidueProxy()
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      res.iRes = iRes

      if (_.includes(data.proteinResTypes, res.resType)) {
        res.iAtom = res.getIAtom('CA')
        res.ss = 'C'
        res.isPolymer = true
      } else if (_.includes(data.dnaResTypes, res.resType) ||
        _.includes(data.rnaResTypes, res.resType)) {
        res.iAtom = res.getIAtom('C3\'')
        res.ss = 'D'
        res.isPolymer = true
      } else {
        res.isPolymer = false
        if (res.resType === 'HOH') {
          // water
          res.ss = 'W'
        } else if (res.resType === 'XXX') {
          // grid atom
          res.ss = 'G'
        } else {
          res.ss = '-'
        }
        let center = this.getCenter(res.getAtomIndices())
        res.iAtom = this.getIAtomClosest(center, res.getAtomIndices())
      }
    }
    this.atomSelect = new BitArray(this.getAtomCount())
    this.residueSelect = new BitArray(this.getResidueCount())
    this.residueSidechain = new BitArray(this.getResidueCount())
  }

  getIAtomClosest (pos, atomIndices) {
    let iAtomClosest = null
    let minD = 1E6
    let atom = this.getAtomProxy()
    for (let iAtom of atomIndices) {
      if (iAtomClosest === null) {
        iAtomClosest = iAtom
      } else {
        atom.iAtom = iAtom
        let d = v3.distance(pos, atom.pos)
        if (d < minD) {
          iAtomClosest = iAtom
          minD = d
        }
      }
    }
    return iAtomClosest
  }

  getIAtomAtPosition (pos) {
    let atomIndices = _.range(this.getAtomCount())
    let iAtomClosest = null
    let minD = 1E6
    let atom = this.getAtomProxy()
    for (let iAtom of atomIndices) {
      if (iAtomClosest === null) {
        iAtomClosest = iAtom
      } else {
        atom.iAtom = iAtom
        let d = v3.distance(pos, atom.pos)
        if (d < minD) {
          iAtomClosest = iAtom
          minD = d
        }
      }
    }
    if (minD < 0.1) {
      return iAtomClosest
    } else {
      return -1
    }
  }

  getCenter (atomIndices) {
    let result = v3.create(0, 0, 0)
    let atom = this.getAtomProxy()
    for (let iAtom of atomIndices) {
      result = v3.sum(result, atom.load(iAtom).pos)
    }
    result.divideScalar(atomIndices.length)
    return result
  }

  /**
   * TODO: replace with bounding box?
   */
  calcMaxLength () {
    let maxima = [0.0, 0.0, 0.0]
    let minima = [0.0, 0.0, 0.0]
    let spans = [0.0, 0.0, 0.0]

    function comp (v, i) {
      if (i === 0) return v.x
      if (i === 1) return v.y
      if (i === 2) return v.z
    }

    let atom = this.getAtomProxy()
    for (let iDim = 0; iDim < 3; iDim++) {
      for (let iAtom = 0; iAtom < this.getAtomCount(); iAtom += 1) {
        let pos = atom.load(iAtom).pos
        if (minima[iDim] > comp(pos, iDim)) {
          minima[iDim] = comp(pos, iDim)
        }
        if (maxima[iDim] < comp(pos, iDim)) {
          maxima[iDim] = comp(pos, iDim)
        }
      }
      spans[iDim] = maxima[iDim] - minima[iDim]
    }
    this.maxLength = Math.max(spans[0], spans[1], spans[2])
  }

  calcBondsStrategic () {
    this.bondStore.count = 0

    const smallCutoffSq = 1.2 * 1.2
    const mediumCutoffSq = 1.9 * 1.9
    const largeCutoffSq = 2.4 * 2.4
    const CHONPS = ['C', 'H', 'O', 'N', 'P', 'S']

    function isBonded (atom1, atom2) {
      if ((atom1 === null) || (atom2 === null)) {
        return false
      }
      // don't include bonds between different alt positions
      if ((atom1.alt !== '') && (atom2.alt !== '')) {
        if (atom1.alt !== atom2.alt) {
          return false
        }
      }

      let cutoffSq
      if ((atom1.elem === 'H') || (atom2.elem === 'H')) {
        cutoffSq = smallCutoffSq
      } else if (
        inArray(atom1.elem, CHONPS) &&
        inArray(atom2.elem, CHONPS)) {
        cutoffSq = mediumCutoffSq
      } else {
        cutoffSq = largeCutoffSq
      }

      let diffX = atom1.pos.x - atom2.pos.x
      let diffY = atom1.pos.y - atom2.pos.y
      let diffZ = atom1.pos.z - atom2.pos.z
      let distSq = diffX * diffX + diffY * diffY + diffZ * diffZ
      return distSq <= cutoffSq
    }

    let makeBond = (atom1, atom2) => {
      let iBond = this.getBondCount()
      this.bondStore.increment()
      this.bondStore.iAtom1[iBond] = atom1.iAtom
      this.bondStore.iAtom2[iBond] = atom2.iAtom

      iBond = this.getBondCount()
      this.bondStore.increment()
      this.bondStore.iAtom1[iBond] = atom2.iAtom
      this.bondStore.iAtom2[iBond] = atom1.iAtom
    }

    let residue1 = this.getResidueProxy()
    let residue2 = this.getResidueProxy()
    let nRes = this.getResidueCount()
    let atom1 = this.getAtomProxy()
    let atom2 = this.getAtomProxy()

    for (let iRes1 = 0; iRes1 < nRes; iRes1++) {
      residue2.iRes = iRes1

      // cycle through all atoms within a residue
      for (let iAtom1 of residue2.getAtomIndices()) {
        for (let iAtom2 of residue2.getAtomIndices()) {
          atom1.iAtom = iAtom1
          atom2.iAtom = iAtom2
          if (isBonded(atom1, atom2)) {
            makeBond(atom1, atom2)
          }
        }
      }
    }

    for (let iRes2 = 1; iRes2 < nRes; iRes2++) {
      residue1.iRes = iRes2 - 1
      residue2.iRes = iRes2
      if (residue2.isProteinConnectedToPrev()) {
        atom1.iAtom = residue1.getIAtom('C')
        atom2.iAtom = residue2.getIAtom('N')
      } else if (residue2.isNucleotideConnectedToPrev()) {
        atom1.iAtom = residue1.getIAtom(`O3'`)
        atom2.iAtom = residue2.getIAtom('P')
      } else {
        continue
      }
      makeBond(atom1, atom2)
    }

    // sort bonds by iAtom1
    let iAtom1Array = this.bondStore.iAtom1
    this.bondStore.sort((i, j) => iAtom1Array[i] - iAtom1Array[j])

    // asign bonds to atoms
    for (let iAtom = 0; iAtom < this.getAtomCount(); iAtom += 1) {
      this.atomStore.bondCount[iAtom] = 0
    }
    let bond = this.getBondProxy()
    let iAtom1 = null
    for (let iBond = 0; iBond < this.getBondCount(); iBond += 1) {
      bond.iBond = iBond
      if (iAtom1 !== bond.iAtom1) {
        iAtom1 = bond.iAtom1
        this.atomStore.bondOffset[iAtom1] = iBond
      }
      this.atomStore.bondCount[iAtom1] += 1
    }

    this.bondSelect = new BitArray(this.getBondCount())
  }

  /**
   * Identify backbone hydrogen bonds using a distance
   * criteria between O and N atoms.
   */
  findBackboneHbonds () {
    let residue = this.getResidueProxy()
    let atom0 = this.getAtomProxy()
    let atom1 = this.getAtomProxy()

    let result = []
    let cutoff = 3.5

    for (let iStructure = 0; iStructure < this.structureIds.length; iStructure += 1) {
      // Collect backbone O and N atoms
      let vertices = []
      let atomIndices = []
      for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
        residue.iRes = iRes
        if (residue.iStructure !== iStructure) {
          // ensure only backbone H-bonds of a single structure are calculated
          continue
        }
        if (residue.isPolymer) {
          for (let aTypeName of ['O', 'N']) {
            let iAtom = residue.getIAtom(aTypeName)
            if (iAtom !== null) {
              atom0.iAtom = iAtom
              vertices.push([atom0.pos.x, atom0.pos.y, atom0.pos.z])
              atomIndices.push(iAtom)
            }
          }
        }
      }

      let spaceHash = new SpaceHash(vertices)
      for (let pair of spaceHash.getClosePairs()) {
        atom0.iAtom = atomIndices[pair[0]]
        atom1.iAtom = atomIndices[pair[1]]
        if ((atom0.elem === 'O') && (atom1.elem === 'N')) {
          [atom0, atom1] = [atom1, atom0]
        }
        if (!((atom0.elem === 'N') && (atom1.elem === 'O'))) {
          continue
        }
        let iRes0 = atom0.iRes
        let iRes1 = atom1.iRes
        if (iRes0 === iRes1) {
          continue
        }
        if (v3.distance(atom0.pos, atom1.pos) <= cutoff) {
          pushToListInDict(result, iRes0, iRes1)
        }
      }
    }

    this.conhPartners = result
  }

  /**
   * Methods to calculate secondary-structure using Kabsch-Sanders
   *
   * Secondary Structure:
   * - H - alpha-helix/3-10-helix
   * - E - beta-sheet
   * - C - coil
   * - - - ligand
   * - W - water
   * - D - DNA or RNA
   * - R - non-standard nucleotide
   */
  findSecondaryStructure () {
    this.findBackboneHbonds()
    let conhPartners = this.conhPartners
    let residueNormals = {}

    let nRes = this.getResidueCount()
    let residue0 = this.getResidueProxy()
    let residue1 = this.getResidueProxy()

    let atom0 = this.getAtomProxy()
    let atom1 = this.getAtomProxy()

    function isCONH (iRes0, iRes1) {
      if ((iRes1 < 0) || (iRes1 >= nRes) || (iRes0 < 0) || (iRes0 >= nRes)) {
        return false
      }
      return _.includes(conhPartners[iRes1], iRes0)
    }

    function vecBetweenResidues (iRes0, iRes1) {
      atom0.iAtom = residue0.load(iRes0).iAtom
      atom1.iAtom = residue1.load(iRes1).iAtom
      return v3.diff(atom0.pos, atom1.pos)
    }

    // Collect ca atoms
    let vertices = []
    let atomIndices = []
    let resIndices = []
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      residue0.iRes = iRes
      if (residue0.isPolymer && !(residue0.ss === 'D')) {
        let iAtom = residue0.getIAtom('CA')
        if (iAtom !== null) {
          atom0.iAtom = iAtom
          vertices.push([atom0.pos.x, atom0.pos.y, atom0.pos.z])
          atomIndices.push(iAtom)
          resIndices.push(iRes)
        }
      }
    }

    for (let iRes0 = 0; iRes0 < nRes; iRes0 += 1) {
      residue0.iRes = iRes0

      if (!residue0.isPolymer) {
        continue
      }

      if (residue0.ss === 'D') {
        pushToListInDict(
          residueNormals, iRes0, residue0.getNucleotideNormal())
        continue
      }

      // alpha-helix
      if (isCONH(iRes0, iRes0 + 4) && isCONH(iRes0 + 1, iRes0 + 5)) {
        let normal0 = vecBetweenResidues(iRes0, iRes0 + 4)
        let normal1 = vecBetweenResidues(iRes0 + 1, iRes0 + 5)
        for (let iRes1 = iRes0 + 1; iRes1 < iRes0 + 5; iRes1 += 1) {
          residue0.load(iRes1).ss = 'H'
          pushToListInDict(residueNormals, iRes1, normal0)
          pushToListInDict(residueNormals, iRes1, normal1)
        }
      }

      // 3-10 helix
      if (isCONH(iRes0, iRes0 + 3) && isCONH(iRes0 + 1, iRes0 + 4)) {
        let normal1 = vecBetweenResidues(iRes0, iRes0 + 3)
        let normal2 = vecBetweenResidues(iRes0 + 1, iRes0 + 4)
        for (let iRes1 = iRes0 + 1; iRes1 < iRes0 + 4; iRes1 += 1) {
          residue0.load(iRes1).ss = 'H'
          pushToListInDict(residueNormals, iRes1, normal1)
          pushToListInDict(residueNormals, iRes1, normal2)
        }
      }
    }

    let betaResidues = []
    let spaceHash = new SpaceHash(vertices)
    for (let pair of spaceHash.getClosePairs()) {
      let [iVertex0, iVertex1] = pair
      let iRes0 = resIndices[iVertex0]
      let iRes1 = resIndices[iVertex1]
      if ((Math.abs(iRes0 - iRes1) <= 5)) {
        continue
      }
      // parallel beta sheet pairs
      if (isCONH(iRes0, iRes1 + 1) && isCONH(iRes1 - 1, iRes0)) {
        betaResidues = betaResidues.concat([iRes0, iRes1])
      }
      if (isCONH(iRes0 - 1, iRes1) && isCONH(iRes1, iRes0 + 1)) {
        betaResidues = betaResidues.concat([iRes0, iRes1])
      }

      // anti-parallel hbonded beta sheet pairs
      if (isCONH(iRes0, iRes1) && isCONH(iRes1, iRes0)) {
        betaResidues = betaResidues.concat([iRes0, iRes1])
        let normal = vecBetweenResidues(iRes0, iRes1)
        pushToListInDict(residueNormals, iRes0, normal)
        pushToListInDict(residueNormals, iRes1, v3.scaled(normal, -1))
      }

      // anti-parallel non-hbonded beta sheet pairs
      if (isCONH(iRes0 - 1, iRes1 + 1) && isCONH(iRes1 - 1, iRes0 + 1)) {
        betaResidues = betaResidues.concat([iRes0, iRes1])
        let normal = vecBetweenResidues(iRes0, iRes1)
        pushToListInDict(residueNormals, iRes0, v3.scaled(normal, -1))
        pushToListInDict(residueNormals, iRes1, normal)
      }
    }

    for (let iRes of betaResidues) {
      residue0.load(iRes).ss = 'E'
    }

    // average residueNormals to make a nice average
    for (let iRes = 0; iRes < nRes; iRes += 1) {
      if ((iRes in residueNormals) && (residueNormals[iRes].length > 0)) {
        let normalSum = v3.create(0, 0, 0)
        for (let normal of residueNormals[iRes]) {
          normalSum = v3.sum(normalSum, normal)
        }
        this.residueNormal[iRes] = v3.normalized(normalSum)
      }
    }

    // flip every second beta-strand normal so they are
    // consistently pointing in the same direction
    for (let iRes = 1; iRes < nRes; iRes += 1) {
      residue0.iRes = iRes - 1
      residue1.iRes = iRes
      if ((residue0.ss === 'E') && residue0.normal) {
        if ((residue1.ss === 'E') && residue1.normal) {
          if (residue1.normal.dot(residue0.normal) < 0) {
            this.residueNormal[iRes].negate()
          }
        }
      }
    }
  }

  calculateTracesForRibbons () {
    this.traces.length = 0

    let lastTrace
    let residue = this.getResidueProxy()
    let atom = this.getAtomProxy()
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      residue.iRes = iRes
      if (residue.isPolymer) {
        if ((iRes === 0) || !residue.isConnectedToPrev()) {
          let newTrace = new glgeom.Trace()
          newTrace.getReference = i => {
            residue.iRes = newTrace.indices[i]
            return residue
          }
          this.traces.push(newTrace)
          lastTrace = newTrace
        }
        lastTrace.indices.push(iRes)

        atom.iAtom = residue.iAtom
        lastTrace.refIndices.push(residue.iRes)
        lastTrace.points.push(atom.pos.clone())
        lastTrace.colors.push(residue.activeColor)
        lastTrace.indexColors.push(getIndexColor(residue.iAtom))
        lastTrace.segmentTypes.push(residue.ss)
        lastTrace.normals.push(residue.normal)
      }
    }

    for (let trace of this.traces) {
      trace.calcTangents()
      trace.calcNormals()
      trace.calcBinormals()
      trace.expand()
    }
  }

  getAtomProxy (iAtom) {
    return new AtomProxy(this, iAtom)
  }

  getAtomCount () {
    return this.atomStore.count
  }

  getResidueProxy (iRes) {
    return new ResidueProxy(this, iRes)
  }

  getCurrentResidueProxy (iRes) {
    return this.residueProxy.load(iRes)
  }

  getBondProxy (iBond) {
    return new BondProxy(this, iBond)
  }

  getBondCount () {
    return this.bondStore.count
  }

  getResidueCount () {
    return this.residueStore.count
  }

  areCloseResidues (iRes0, iRes1) {
    let atom0 = this.getAtomProxy()
    let atom1 = this.getAtomProxy()

    let res0 = this.getResidueProxy(iRes0)
    let pos0 = atom0.load(res0.iAtom).pos.clone()
    let atomIndices0 = res0.getAtomIndices()

    let res1 = this.getResidueProxy(iRes1)
    let pos1 = atom1.load(res1.iAtom).pos.clone()
    let atomIndices1 = res1.getAtomIndices()

    if (v3.distance(pos0, pos1) > 17) {
      return false
    }

    for (let iAtom0 of atomIndices0) {
      for (let iAtom1 of atomIndices1) {
        if (v3.distance(atom0.load(iAtom0).pos, atom1.load(iAtom1).pos) < 4) {
          return true
        }
      }
    }
    return false
  }

  clearSelectedResidues () {
    this.residueSelect.clearAll()
  }

  clearSidechainResidues () {
    this.residueSidechain.clearAll()
  }

  setSidechainOfResidues (residueIndices, isSidechain) {
    let residue = this.getResidueProxy()
    for (let iRes of residueIndices) {
      residue.load(iRes).sidechain = isSidechain
    }
  }

  getNeighbours (iRes) {
    let indices = [iRes]
    for (let jRes = 0; jRes < this.getResidueCount(); jRes += 1) {
      if (this.areCloseResidues(jRes, iRes)) {
        indices.push(jRes)
      }
    }
    return indices
  }

  setSidechainOfNeighborResidues (iRes, isSidechain) {
    this.setSidechainOfResidues(
      this.getNeighbours(iRes), isSidechain)
  }

  colorResidues () {
    let vals = _.values(this.grid.isElem)
    let showSecondary = _.every(vals, v => !v)
    // pre-calculations needed before building meshes
    let residue = this.getResidueProxy()
    for (let iRes of _.range(this.getResidueCount())) {
      residue.iRes = iRes
      residue.color = showSecondary ? data.getSsColor(residue.ss) : residue.color = data.darkGrey
    }
  }

  /**
   * Searches autodock grid atoms for B-factor limits
   */
  findGridLimits () {
    let residue = this.getResidueProxy()
    let atom = this.getAtomProxy()
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      residue.iRes = iRes
      if (residue.ss === 'G') {
        atom.iAtom = residue.iAtom
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
    if (!('bCutoff' in this.grid)) {
      this.grid.bCutoff = this.grid.bMin
    }
  }

  deleteStructure (iStructure) {
    let atom = this.getAtomProxy()
    let res = this.getResidueProxy()

    let iAtomStart = null
    let iAtomEnd = null
    let iResStart = null
    let iResEnd = null

    for (let iAtom = 0; iAtom < this.getAtomCount(); iAtom += 1) {
      atom.iAtom = iAtom
      res.iRes = atom.iRes
      if (res.iStructure === iStructure) {
        if (iAtomStart === null) {
          iAtomStart = iAtom
        }
        iAtomEnd = iAtom + 1
        if (iResStart === null) {
          iResStart = atom.iRes
        }
        iResEnd = atom.iRes + 1
      } else if (res.iStructure > iStructure) {
        res.iStructure -= 1
      }
    }

    let nAtomOffset = iAtomEnd - iAtomStart
    let nAtom = this.getAtomCount()
    let nAtomNew = nAtom - nAtomOffset
    let nAtomCopy = nAtom - iAtomEnd

    let nResOffset = iResEnd - iResStart
    let nRes = this.getResidueCount()
    let nResNew = nRes - nResOffset
    let nResCopy = nRes - iResEnd

    this.atomStore.copyWithin(iAtomStart, iAtomEnd, nAtomCopy)
    this.atomStore.count -= nAtomOffset

    for (let iAtom = 0; iAtom < nAtomNew; iAtom += 1) {
      atom.iAtom = iAtom
      if (atom.iRes >= iResStart) {
        atom.iRes -= nResOffset
      }
    }

    let newResidueSelect = new BitArray(nResNew)
    let newResidueSidechain = new BitArray(nResNew)

    for (let iRes = 0; iRes < nResNew; iRes += 1) {
      if (iRes >= iResStart) {
        let iResOld = iRes + nResOffset
        if (iResOld in this.residueNormal) {
          this.residueNormal[iRes] = this.residueNormal[iResOld].clone()
        }
        if (this.residueSelect.get(iResOld)) {
          newResidueSelect.set(iRes)
        }
        if (this.residueSidechain.get(iResOld)) {
          newResidueSidechain.set(iRes)
        }
      } else {
        if (this.residueSelect.get(iRes)) {
          newResidueSelect.set(iRes)
        }
        if (this.residueSidechain.get(iRes)) {
          newResidueSidechain.set(iRes)
        }
      }
    }

    for (let iRes = nResNew; iRes < nRes; iRes += 1) {
      delete this.residueNormal[iRes]
    }

    this.residueSelect = newResidueSelect
    this.residueSidechain = newResidueSidechain

    this.residueStore.copyWithin(iResStart, iResEnd, nResCopy)
    this.residueStore.count -= nResOffset
    this.resIds.splice(iResStart, nResOffset)

    for (let iRes = 0; iRes < nResNew; iRes += 1) {
      res.iRes = iRes
      if (res.iAtom >= iAtomStart) {
        res.iAtom -= nAtomOffset
        atom.iAtom = res.iAtom
      }
      if (this.residueStore.atomOffset[iRes] >= iAtomStart) {
        this.residueStore.atomOffset[iRes] -= nAtomOffset
      }
      if (res.iStructure >= iStructure) {
        res.iStructure -= 1
      }
    }

    this.structureIds.splice(iStructure, 1)
    this.iStructure -= 1

    this.calcBondsStrategic()
    this.calcMaxLength()
  }
}

/**
 * View
 * ----
 * A view includes all pertinent viewing options
 * needed to render the soup in the way
 * for the user.
 *
 * cameraParams stores the direction and zoom that a soup
 * should be viewed:
 * cameraParams {
 *   focus: position that cameraParams is looking at
 *   position: position of cameraParams - distance away gives zoom
 *   up: vector direction denoting the up direction of cameraParams
 *   zFront: clipping plane in front of the cameraParams focus
 *   zBack: clipping plane behind the cameraParams focus
 * }
 *
 * OpenGL notes:
 *   - box is -1 to 1 that gets projected on screen + perspective
 *   - x right -> left
 *   - y bottom -> top (inverse of classic 2D coordinate)
 *   - z far -> near
 *   - that is positive Z direction is out of the screen
 *   - box -1 to +1
 */
class View {
  constructor () {
    this.id = 'view:000000'
    this.iAtom = -1
    this.order = 1
    this.cameraParams = {
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
      trace: true,
      backboneAtom: false,
      ribbon: true
    }
  }

  setCamera (cameraParams) {
    this.cameraParams = cameraParams
  }

  getViewTranslatedTo (pos) {
    let view = this.clone()
    let disp = pos.clone().sub(view.cameraParams.focus)
    view.cameraParams.focus.copy(pos)
    view.cameraParams.position.add(disp)
    return view
  }

  clone () {
    let v = new View()
    v.id = this.id
    v.iAtom = this.iAtom
    v.selected = this.selected
    v.labels = _.cloneDeep(this.labels)
    v.distances = _.cloneDeep(this.distances)
    v.order = this.order
    v.text = this.text
    v.time = this.time
    v.url = this.url
    v.cameraParams = _.cloneDeep(this.cameraParams)
    v.show = _.cloneDeep(this.show)
    return v
  }

  getDict () {
    // version 2.0 camera dict structure {
    //    pos: soupView center, cameraParams focus
    //    up: gives the direction of the y vector from pos
    //    in: gives the positive z-axis direction
    //    zFront: clipping plane in front of the cameraParams focus
    //    zBack: clipping plane behind the cameraParams focus
    // }
    let cameraDir = this.cameraParams.focus.clone()
      .sub(this.cameraParams.position)
    let zoom = cameraDir.length()
    cameraDir.normalize()
    let pos = this.cameraParams.focus
    let inV = pos.clone().add(cameraDir)
    let upV = pos.clone().sub(this.cameraParams.up)

    let show = _.clone(this.show)
    show.all_atom = show.backboneAtom
    delete show.backboneAtom

    return {
      version: 2,
      view_id: this.id,
      creator: this.creator,
      pdb_id: this.pdb_id,
      order: this.order,
      show: show,
      text: this.text,
      i_atom: this.iAtom,
      labels: this.labels,
      selected: this.selected,
      distances: this.distances,
      camera: {
        slab: {
          z_front: this.cameraParams.zFront,
          z_back: this.cameraParams.zBack,
          zoom: zoom
        },
        pos: [pos.x, pos.y, pos.z],
        up: [upV.x, upV.y, upV.z],
        in: [inV.x, inV.y, inV.z]
      }
    }
  }

  setFromDict (flatDict) {
    this.id = flatDict.view_id
    this.view_id = flatDict.view_id
    this.pdb_id = flatDict.pdb_id
    this.lock = flatDict.lock
    this.text = flatDict.text
    this.creator = flatDict.creator
    this.order = flatDict.order
    this.res_id = flatDict.res_id
    this.iAtom = flatDict.i_atom

    this.labels = flatDict.labels
    this.selected = flatDict.selected
    this.distances = flatDict.distances

    this.show = flatDict.show
    this.show.backboneAtom = !!flatDict.show.all_atom
    delete this.show.all_atom

    if (!(this.show.backboneAtom || this.show.trace || this.show.ribbon)) {
      this.show.ribbon = true
    }

    if (!(this.show.all_atom || this.show.trace || this.show.ribbon)) {
      this.show.backbone = true
    }

    let pos = v3.create(
      flatDict.camera.pos[0],
      flatDict.camera.pos[1],
      flatDict.camera.pos[2])

    let upV = v3.create(
      flatDict.camera.up[0],
      flatDict.camera.up[1],
      flatDict.camera.up[2])

    let inV = v3.create(
      flatDict.camera.in[0],
      flatDict.camera.in[1],
      flatDict.camera.in[2])

    let zoom = flatDict.camera.slab.zoom

    let focus = v3.clone(pos)

    let cameraDirection = v3
      .clone(inV)
      .sub(focus)
      .multiplyScalar(zoom)
      .negate()

    let position = v3
      .clone(focus).add(cameraDirection)

    let up = v3
      .clone(upV)
      .sub(focus)
      .negate()

    this.cameraParams = {
      focus: focus,
      position: position,
      up: up,
      zFront: flatDict.camera.slab.z_front,
      zBack: flatDict.camera.slab.z_back,
      zoom: zoom
    }
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
 * The SoupView contains a soup and a list of
 * views of the soup, including the current
 * view, and a target view for animation
 */
class SoupView {
  constructor (soup) {
    // the soup data for the soupView
    this.soup = soup

    this.changed = true
    this.updateSidechain = false
    this.updateSelection = false
    this.startTargetAfterRender = false
    this.updateObservers = true

    this.nDataServer = 0

    this.isLoop = false

    // stores the current cameraParams, display
    // options, distances, labels, selected
    // residues
    this.currentView = new View()

    // stores other views that can be reloaded
    this.savedViewsByViewId = {}
    this.savedViews = []
    this.iLastViewSelected = 0

    // stores a target view for animation
    this.targetView = null

    // timing counter that is continually decremented
    // until it becomes negative
    this.nUpdateStep = -1

    // this is to set the time between transitions of views
    this.maxUpdateStep = 70
    this.msPerStep = 17
  }

  build () {
    if ((this.savedViews.length === 0) && (!this.soup.isEmpty())) {
      this.setCurrentViewToDefaultAndSave()
    }
    this.soup.colorResidues()
    this.soup.findGridLimits()
    this.soup.calculateTracesForRibbons()
  }

  setCurrentViewToDefaultAndSave () {
    this.currentView.show.sidechain = false
    this.currentView.order = 0
    this.currentView.text = this.soup.title
    this.currentView.pdb_id = this.soup.structureId
    this.currentView = this.getZoomedOutViewOfCurrentView()
    this.saveView(this.currentView)
    this.changed = true
  }

  setTargetView (view) {
    this.startTargetAfterRender = true
    this.saveTargetView = view.clone()
    this.saveTargetView.iAtom = this.soup.getIAtomAtPosition(view.cameraParams.focus)
  }

  startTargetView () {
    this.targetView = this.saveTargetView
    this.updateObservers = true
    this.startTargetAfterRender = false
    this.changed = true
  }

  getICenteredAtom () {
    return this.currentView.iAtom
  }

  getIViewFromViewId (viewId) {
    for (let iView = 0; iView < this.savedViews.length; iView += 1) {
      if (this.savedViews[iView].id === viewId) {
        return iView
      }
    }
    return -1
  }

  insertView (iView, newViewId, newView) {
    this.savedViewsByViewId[newViewId] = newView
    if (iView >= this.savedViews.length) {
      this.savedViews.push(newView)
    } else {
      this.savedViews.splice(iView, 0, newView)
    }
    this.iLastViewSelected = iView
    for (let i = 0; i < this.savedViews.length; i++) {
      this.savedViews[i].order = i
    }
  }

  removeView (viewId) {
    let iView = this.getIViewFromViewId(viewId)
    if (iView < 0) {
      return
    }
    this.savedViews.splice(iView, 1)
    delete this.savedViewsByViewId[viewId]
    for (let j = 0; j < this.savedViews.length; j++) {
      this.savedViews[j].order = j
    }
    if (this.iLastViewSelected >= this.savedViews.length) {
      this.iLastViewSelected = this.savedViews.length - 1
    }
    this.changed = true
  }

  saveView (view) {
    this.savedViewsByViewId[view.id] = view
    this.savedViews.push(view)
  }

  getZoomedOutViewOfCurrentView () {
    this.soup.calcMaxLength()

    let newView = this.currentView.clone()

    if (this.soup.maxLength === 0) {
      return newView
    }

    let cameraParams = newView.cameraParams

    cameraParams.zFront = -this.soup.maxLength / 2
    cameraParams.zBack = this.soup.maxLength / 2
    cameraParams.zoom = Math.abs(this.soup.maxLength) * 1.75

    let atomIndices = _.range(this.soup.getAtomCount())
    let center = this.soup.getCenter(atomIndices)

    let look = cameraParams.position.clone()
      .sub(cameraParams.focus)
      .normalize()
    cameraParams.focus.copy(center)
    cameraParams.position = cameraParams.focus.clone()
      .add(look.multiplyScalar(cameraParams.zoom))

    newView.iAtom = this.soup.getIAtomAtPosition(center)
    return newView
  }
}

/**
 * The Controller for SoupView. All mutations
 * to a Soup and its Views go through here.
 */
class Controller {
  constructor (scene) {
    this.soup = scene.soup
    this.soupView = scene
    this.iResLastSelected = null
  }

  deleteDistance (iDistance) {
    this.soupView.currentView.distances.splice(iDistance, 1)
    this.soupView.changed = true
  }

  makeDistance (iAtom1, iAtom2) {
    this.soupView.currentView.distances.push({i_atom1: iAtom1, i_atom2: iAtom2})
    this.soupView.changed = true
  }

  makeAtomLabel (iAtom, text) {
    this.soupView.currentView.labels.push({i_atom: iAtom, text})
    this.soupView.changed = true
  }

  deleteAtomLabel (iLabel) {
    this.soupView.currentView.labels.splice(iLabel, 1)
    this.soupView.changed = true
  }

  setTargetView (view) {
    this.soupView.setTargetView(view)
  }

  setTargetViewByViewId (viewId) {
    let view = this.soupView.savedViewsByViewId[viewId]
    this.soupView.iLastViewSelected = this.soupView.savedViewsByViewId[viewId].order
    this.setTargetView(view)
  }

  setTargetViewByIAtom (iAtom) {
    let atom = this.soup.getAtomProxy(iAtom)
    let view = this.soupView.currentView.getViewTranslatedTo(atom.pos)
    view.iAtom = iAtom
    this.setTargetView(view)
  }

  setTargetToPrevResidue () {
    let iAtom = this.soupView.currentView.iAtom
    let iRes = this.soup.getAtomProxy(iAtom).iRes
    if (iRes <= 0) {
      iRes = this.soup.getResidueCount() - 1
    } else {
      iRes -= 1
    }
    iAtom = this.soup.getResidueProxy(iRes).iAtom
    this.setTargetViewByIAtom(iAtom)
  }

  setTargetToNextResidue () {
    let iAtom = this.soupView.currentView.iAtom
    let iRes = this.soup.getAtomProxy(iAtom).iRes
    if (iRes >= this.soup.getResidueCount() - 1) {
      iRes = 0
    } else {
      iRes += 1
    }
    iAtom = this.soup.getResidueProxy(iRes).iAtom
    this.setTargetViewByIAtom(iAtom)
  }

  setTargetToPrevView () {
    let soupView = this.soupView
    if (soupView.savedViews.length == 0) {
      return ''
    }
    soupView.iLastViewSelected -= 1
    if (soupView.iLastViewSelected < 0) {
      soupView.iLastViewSelected = soupView.savedViews.length - 1
    }
    let id = soupView.savedViews[soupView.iLastViewSelected].id
    this.setTargetViewByViewId(id)
    return id
  }

  setTargetToNextView () {
    let soupView = this.soupView
    if (soupView.savedViews.length == 0) {
      return ''
    }
    soupView.iLastViewSelected += 1
    if (soupView.iLastViewSelected >= soupView.savedViews.length) {
      soupView.iLastViewSelected = 0
    }
    let id = soupView.savedViews[soupView.iLastViewSelected].id
    this.setTargetViewByViewId(id)
    return id
  }

  swapViews (i, j) {
    this.soupView.savedViews[j].order = i
    this.soupView.savedViews[i].order = j
    let dummy = this.soupView.savedViews[j]
    this.soupView.savedViews[j] = this.soupView.savedViews[i]
    this.soupView.savedViews[i] = dummy
  }

  getViewDicts () {
    let viewDicts = []
    for (let i = 1; i < this.soupView.savedViews.length; i += 1) {
      viewDicts.push(this.soupView.savedViews[i].getDict())
    }
    return viewDicts
  }

  makeSelectedResidueList () {
    let result = []
    let residue = this.soup.getResidueProxy()
    for (let i = 0; i < this.soup.getResidueCount(); i += 1) {
      if (residue.load(i).sidechain) {
        result.push(i)
      }
    }
    return result
  }

  clearSidechainResidues () {
    this.soup.clearSidechainResidues()
    this.soupView.currentView.selected = this.makeSelectedResidueList()
    this.soupView.updateSidechain = true
    this.soupView.changed = true
  }

  clearSelectedResidues () {
    this.soup.clearSelectedResidues()
    this.soupView.currentView.selected = this.makeSelectedResidueList()
    this.soupView.updateSelection = true
    this.soupView.changed = true
  }

  setResidueSelect (iRes, val) {
    let res = this.soup.getResidueProxy(iRes)
    res.selected = val
    this.soupView.updateSelection = true
    this.soupView.changed = true
  }

  selectResidue (iRes) {
    let res = this.soup.getResidueProxy(iRes)
    let val = !res.selected
    this.clearSelectedResidues()
    this.setResidueSelect(iRes, val)
    this.iResLastSelected = val ? iRes : null
    this.soupView.updateSelection = true
    this.soupView.changed = true
  }

  selectAdditionalResidue (iRes) {
    let res = this.soup.getResidueProxy(iRes)
    let val = !res.selected
    this.setResidueSelect(iRes, val)
    this.iResLastSelected = val ? iRes : null
    this.soupView.updateSelection = true
    this.soupView.changed = true
  }

  selectAdditionalRangeToResidue (iRes) {
    let res = this.soup.getResidueProxy(iRes)
    let val = !res.selected
    if (this.iResLastSelected !== null) {
      let lastRes = this.soup.getResidueProxy(this.iResLastSelected)
      if (res.iStructure === lastRes.iStructure) {
        let iFirstRes = Math.min(this.iResLastSelected, iRes)
        let iLastRes = Math.max(this.iResLastSelected, iRes)
        for (let i = iFirstRes; i < iLastRes + 1; i += 1) {
          this.setResidueSelect(i, true)
        }
      }
    }
    this.iResLastSelected = val ? iRes : null
    this.soupView.updateSelection = true
    this.soupView.changed = true
  }

  toggleSelectedSidechains () {
    let residue = this.soup.getResidueProxy()
    let indices = []
    let nSidechain = 0
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      residue.load(iRes)
      if (residue.selected) {
        indices.push(iRes)
        if (residue.sidechain) {
          nSidechain += 1
        }
      }
    }
    let isSidechain = true
    if (nSidechain === indices.length) {
      isSidechain = false
    }
    for (let iRes of indices) {
      residue.load(iRes)
      residue.sidechain = isSidechain
    }

    this.soupView.updateSidechain = true
    this.soupView.changed = true
  }

  toggleResidueNeighbors () {
    let indices = []
    let residue = this.soup.getResidueProxy()
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      residue.load(iRes)
      if (residue.selected) {
        indices = _.concat(indices, this.soup.getNeighbours(iRes))
      }
    }
    if (indices.length === 0) {
      let iAtom = this.soupView.currentView.iAtom
      let iRes = this.soup.getAtomProxy(iAtom).iRes
      indices = _.concat(indices, this.soup.getNeighbours(iRes))
    }
    let nSidechain = 0
    for (let iRes of indices) {
      if (residue.load(iRes).sidechain) {
        nSidechain += 1
      }
    }
    let isSidechain = nSidechain < indices.length

    this.soup.setSidechainOfResidues(indices, isSidechain)
    this.soupView.currentView.selected = this.makeSelectedResidueList()
    this.soupView.changed = true
    this.soupView.updateSidechain = true
  }

  saveCurrentView () {
    let newViewId = randomId()
    let iNewView = this.soupView.iLastViewSelected + 1
    let newView = this.soupView.currentView.clone()
    newView.text = 'Click edit to change this text.'
    newView.pdb_id = this.soup.pdb_id
    let time = getCurrentDateStr()
    if (user === '' || typeof user === 'undefined') {
      newView.creator = '~ [public] @' + time
    } else {
      newView.creator = '~ ' + user + ' @' + time
    }
    newView.id = newViewId
    newView.selected = this.makeSelectedResidueList()
    this.soupView.insertView(iNewView, newViewId, newView)

    this.setTargetViewByViewId(newViewId)

    this.soupView.changed = true
    this.soupView.updateSelection = true

    return newViewId
  }

  deleteView (viewId) {
    this.soupView.removeView(viewId)
  }

  sortViewsByOrder () {
    function orderSort (a, b) {
      return a.order - b.order
    }

    this.soupView.savedViews.sort(orderSort)
    for (let i = 0; i < this.soupView.savedViews.length; i += 1) {
      this.soupView.savedViews[i].order = i
    }
  }

  loadViewsFromViewDicts (viewDicts) {
    if (this.nDataServer > 1) {
      return
    }
    for (let i = 0; i < viewDicts.length; i += 1) {
      let view = new View()
      view.setFromDict(viewDicts[i])
      if (view.id === 'view:000000') {
        continue
      }
      this.soupView.saveView(view)
    }
    this.sortViewsByOrder()
  }

  async asyncLoadProteinData (proteinData, asyncSetMessageFn) {
    this.nDataServer += 1
    await this.soup.asyncLoadProteinData(proteinData, asyncSetMessageFn)
    this.soupView.changed = true
  }

  setShowOption (option, bool) {
    console.log('Controller.setShowOption', option, bool)
    this.soupView.currentView.show[option] = bool
    this.soupView.changed = true
  }

  getShowOption (option) {
    return this.soupView.currentView.show[option]
  }

  toggleShowOption (option) {
    let val = this.getShowOption(option)
    this.setShowOption(option, !val)
  }

  setChangeFlag () {
    this.soupView.changed = true
  }

  setCurrentView (view) {
    let oldViewSelected = this.soupView.currentView.selected
    this.soupView.currentView = view.clone()
    if (!_.isEqual(oldViewSelected.sort(), view.selected.sort())) {
      this.soupView.soup.clearSidechainResidues()
      this.soupView.soup.setSidechainOfResidues(view.selected, true)
      this.soupView.updateSidechain = true
    }
    this.soupView.changed = true
  }

  setZoom (zBack, zFront) {
    let cameraParams = this.soupView.currentView.cameraParams
    cameraParams.zBack = zBack
    cameraParams.zFront = zFront
    this.soupView.changed = true
  }

  toggleGridElem (elem) {
    let b = this.soupView.soup.grid.isElem[elem]
    this.soupView.soup.grid.isElem[elem] = !b
    this.soupView.soup.grid.changed = true
    this.soupView.changed = true

    this.soupView.soup.colorResidues()

    this.soupView.updateSelection = true
  }

  setGridCutoff (cutoff) {
    this.soupView.soup.grid.bCutoff = cutoff
    this.soupView.soup.grid.changed = true
    this.soupView.changed = true
  }

  clear () {
    let distances = this.soupView.currentView.distances
    for (let i of _.reverse(_.range(distances.length))) {
      this.deleteDistance(i)
    }
    let labels = this.soupView.currentView.labels
    for (let i of _.reverse(_.range(labels.length))) {
      this.deleteAtomLabel(i)
    }
    this.clearSidechainResidues()
    this.clearSelectedResidues()
  }

  getLoop () {
    return this.soupView.isLoop
  }

  setLoop (v) {
    this.soupView.isLoop = v
    this.soupView.updateObservers = true
    this.soupView.changed = true
  }

  deleteStructure (iStructure) {
    this.soup.deleteStructure(iStructure)
    this.nDataServer -= 1
    if (this.soup.isEmpty()) {
      this.soupView.savedViews.length = 0
      for (let id of _.keys(this.soupView.savedViewsByViewId)) {
        delete this.soupView.savedViewsByViewId[id]
      }
      this.soupView.currentView = new View()
      this.soupView.targetView = null
      this.soupView.startTargetAfterRender = false
      this.soupView.nUpdateStep = -1
    } else {
      this.soupView.updateSidechain = true
      this.soupView.updateSelection = true
    }
    this.soupView.updateObservers = true
    this.soupView.changed = true
  }

  zoomOut () {
    if (!this.soup.isEmpty()) {
      this.setTargetView(this.soupView.getZoomedOutViewOfCurrentView())
      this.soupView.changed = true
    }
  }
}

export {
  Soup,
  Controller,
  interpolateCameras,
  SoupView,
  View
}
