import _ from 'lodash'
import v3 from './v3'
import { inArray } from './util.js'
import * as glgeom from './glgeom'
import { SpaceHash } from './pairs.js'
import Store from './store.js'
import * as data from './data'
import * as THREE from 'three'

function deleteNumbers(text) {
  return text.replace(/\d+/, '')
}

function pushToListInDict(dict, key, value) {
  if (!(key in dict)) {
    dict[key] = []
  }
  dict[key].push(value)
}

function getValueTableIndex(valueList, value, isEqualFn = null) {
  if (_.isNil(isEqualFn)) {
    if (!_.includes(valueList, value)) {
      valueList.push(value)
    }
    return valueList.indexOf(value)
  } else {
    let i = _.findIndex(valueList, thisVal => isEqualFn(value, thisVal))
    if (i >= 0) {
      return i
    } else {
      valueList.push(value)
      return valueList.length - 1
    }
  }
}

function intToBool(i) {
  return i === 1
}

function boolToInt(b) {
  return b ? 1 : 0
}

function intToChar(i) {
  return i ? String.fromCharCode(i) : ''
}

function charToInt(c) {
  return c.charCodeAt(0)
}

function parsetTitleFromPdbText(text) {
  let result = ''
  let lines = text.split(/\r?\n/)
  for (let line of lines) {
    if (line.substring(0, 5) === 'TITLE') {
      result += line.substring(10)
    }
  }
  return result
}

function getIndexColor(i) {
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
  constructor(soup, iAtom) {
    this.soup = soup
    if (Number.isInteger(iAtom)) {
      this.load(iAtom)
    }
    this._pos = v3.create()
  }

  load(iAtom) {
    this.iAtom = iAtom
    return this
  }

  get pos() {
    this._pos.x = this.soup.atomStore.x[this.iAtom]
    this._pos.y = this.soup.atomStore.y[this.iAtom]
    this._pos.z = this.soup.atomStore.z[this.iAtom]
    return this._pos
  }

  get resId() {
    return this.soup.resIds[this.iRes]
  }

  get elem() {
    let iElem = this.soup.atomStore.iElem[this.iAtom]
    return this.soup.elemTable[iElem]
  }

  get bfactor() {
    return this.soup.atomStore.bfactor[this.iAtom]
  }

  get atomType() {
    let iAtomType = this.soup.atomStore.iAtomType[this.iAtom]
    return this.soup.atomTypeTable[iAtomType]
  }

  get alt() {
    return intToChar(this.soup.atomStore.alt[this.iAtom])
  }

  set alt(c) {
    this.soup.atomStore.alt[this.iAtom] = charToInt(c)
  }

  get iRes() {
    return this.soup.atomStore.iRes[this.iAtom]
  }

  set iRes(iRes) {
    this.soup.atomStore.iRes[this.iAtom] = iRes
  }

  get resType() {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    return this.soup.resTypeTable[iResType]
  }

  get label() {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    let resType = this.soup.resTypeTable[iResType]
    let label =
      this.soup.resIds[this.iRes] + ':' + resType + ':' + this.atomType
    if (this.alt) {
      label += ':' + this.alt
    }
    return label
  }

  getBondIndices() {
    let iStart = this.soup.atomStore.bondOffset[this.iAtom]
    let n = this.soup.atomStore.bondCount[this.iAtom]
    let iEnd = iStart + n
    return _.range(iStart, iEnd)
  }

  get color() {
    let residue = this.soup.getResidueProxy(this.iRes)
    if (residue.isPolymer) {
      let resColor = residue.activeColor
      if (this.elem === 'C' || this.elem === 'H') {
        return resColor
      } else if (this.elem in data.ElementColors) {
        let elemColor = data.ElementColors[this.elem]
          .clone()
          .offsetHSL(0, -0.3, -0.3)
        return new THREE.Color().addColors(resColor, elemColor)
      }
    }
    if (this.elem in data.ElementColors) {
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
  ['iColor', 1, 'uint16'],
  ['iCustomColor', 1, 'uint16'],
  ['isPolymer', 1, 'uint8'],
  ['selected', 1, 'uint8'],
  ['sidechain', 1, 'uint8'],
  ['iChain', 1, 'uint8']
]

function cmpColors(c1, c2) {
  return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b
}

class ResidueProxy {
  constructor(soup, iRes) {
    this.soup = soup
    if (Number.isInteger(iRes)) {
      this.load(iRes)
    }
  }

  load(iRes) {
    this.iRes = iRes
    return this
  }

  get iAtom() {
    return this.soup.residueStore.iCentralAtom[this.iRes]
  }

  set iAtom(iAtom) {
    this.soup.residueStore.iCentralAtom[this.iRes] = iAtom
  }

  get iChain() {
    return this.soup.residueStore.iChain[this.iRes]
  }

  get chain() {
    return this.soup.chains[this.iChain]
  }

  get iStructure() {
    return this.soup.residueStore.iStructure[this.iRes]
  }

  set iStructure(iStructure) {
    this.soup.residueStore.iStructure[this.iRes] = iStructure
  }

  get resId() {
    return this.soup.resIds[this.iRes]
  }

  get resNum() {
    return this.soup.residueStore.resNum[this.iRes]
  }

  get insCode() {
    return intToChar(this.soup.residueStore.insCode[this.iRes])
  }

  set insCode(c) {
    this.soup.residueStore.insCode[this.iRes] = charToInt(c)
  }

  get isPolymer() {
    return intToBool(this.soup.residueStore.isPolymer[this.iRes])
  }

  set isPolymer(v) {
    this.soup.residueStore.isPolymer[this.iRes] = boolToInt(v)
  }

  get sidechain() {
    return intToBool(this.soup.residueStore.sidechain[this.iRes])
  }

  set sidechain(v) {
    this.soup.residueStore.sidechain[this.iRes] = boolToInt(v)
  }

  get selected() {
    return intToBool(this.soup.residueStore.selected[this.iRes])
  }

  set selected(v) {
    this.soup.residueStore.selected[this.iRes] = boolToInt(v)
  }

  get color() {
    let iColor = this.soup.residueStore.iColor[this.iRes]
    return this.soup.colorTable[iColor]
  }

  set color(color) {
    let iColor = getValueTableIndex(
      this.soup.colorTable,
      new THREE.Color(color),
      cmpColors
    )
    this.soup.residueStore.iColor[this.iRes] = iColor
  }

  get customColor() {
    let iColor = this.soup.residueStore.iCustomColor[this.iRes]
    return this.soup.colorTable[iColor]
  }

  set customColor(color) {
    let iColor = getValueTableIndex(
      this.soup.colorTable,
      new THREE.Color(color),
      cmpColors
    )
    this.soup.residueStore.iCustomColor[this.iRes] = iColor
  }

  get activeColor() {
    let iColor = this.soup.residueStore.iColor[this.iRes]
    let color = this.soup.colorTable[iColor]
    if (this.selected) {
      color = color.clone().offsetHSL(0, 0, +0.3)
    }
    return color
  }

  get resType() {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    return this.soup.resTypeTable[iResType]
  }

  get normal() {
    let hasNormal = this.iRes in this.soup.residueNormal
    return hasNormal ? this.soup.residueNormal[this.iRes].clone() : null
  }

  get ss() {
    return intToChar(this.soup.residueStore.sstruc[this.iRes])
  }

  set ss(c) {
    this.soup.residueStore.sstruc[this.iRes] = charToInt(c)
  }

  get label() {
    let iResType = this.soup.residueStore.iResType[this.iRes]
    let resType = this.soup.resTypeTable[iResType]
    let label = this.soup.resIds[this.iRes] + ':' + resType
    return label
  }

  getAtomIndices() {
    let iStart = this.soup.residueStore.atomOffset[this.iRes]
    let n = this.soup.residueStore.atomCount[this.iRes]
    let iEnd = iStart + n
    return _.range(iStart, iEnd)
  }

  getAtomProxy(atomType) {
    let atom = this.soup.getAtomProxy()
    for (let iAtom of this.getAtomIndices()) {
      atom.iAtom = iAtom
      if (atom.atomType === atomType) {
        return atom
      }
    }
    return null
  }

  getIAtom(atomType) {
    for (let iAtom of this.getAtomIndices()) {
      let iAtomType = this.soup.atomStore.iAtomType[iAtom]
      let testAatomType = this.soup.atomTypeTable[iAtomType]
      if (testAatomType === atomType) {
        return iAtom
      }
    }
    return null
  }

  checkAtomTypes(atomTypes) {
    for (let atomType of atomTypes) {
      if (this.getIAtom(atomType) === null) {
        return false
      }
    }
    return true
  }

  isProteinConnectedToPrev() {
    if (this.iRes === 0) {
      return false
    }

    let thisRes = this
    let prevRes = new ResidueProxy(this.soup, this.iRes - 1)

    const proteinAtomTypes = ['CA']
    if (
      prevRes.checkAtomTypes(proteinAtomTypes) &&
      thisRes.checkAtomTypes(proteinAtomTypes)
    ) {
      let ca0 = prevRes.getAtomProxy('CA').pos
      let ca1 = thisRes.getAtomProxy('CA').pos
      if (v3.distance(ca0, ca1) < 5) {
        return true
      }
    }

    return false
  }

  isNucleotideConnectedToPrev() {
    if (this.iRes === 0) {
      return false
    }

    let thisRes = this
    let prevRes = new ResidueProxy(this.soup, this.iRes - 1)

    const nucleicAtomTypes = ["C3'", "O3'"]

    if (
      prevRes.checkAtomTypes(nucleicAtomTypes) &&
      thisRes.checkAtomTypes(nucleicAtomTypes) &&
      thisRes.checkAtomTypes(['P'])
    ) {
      let o3 = prevRes.getAtomProxy("O3'").pos
      let p = thisRes.getAtomProxy('P').pos
      if (v3.distance(o3, p) < 2.5) {
        return true
      }
    }
    return false
  }

  isConnectedToPrev() {
    return this.isProteinConnectedToPrev() || this.isNucleotideConnectedToPrev()
  }

  getNucleotideNormal() {
    let c3 = this.getAtomProxy("C3'").pos
    let c5 = this.getAtomProxy("C5'").pos
    let c1 = this.getAtomProxy("C1'").pos
    let forward = v3.diff(c3, c5)
    let up = v3.diff(c1, c3)
    return v3.crossProduct(forward, up)
  }
}

const bondStoreFields = [['iAtom1', 1, 'int32'], ['iAtom2', 1, 'int32']]

class BondProxy {
  constructor(soup, iBond) {
    this.soup = soup
    if (Number.isInteger(iBond)) {
      this.load(iBond)
    }
  }

  load(iBond) {
    this.iBond = iBond
    return this
  }

  get iAtom1() {
    return this.soup.bondStore.iAtom1[this.iBond]
  }

  get iAtom2() {
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
  constructor() {
    this.parsingError = ''
    this.title = ''

    this.structureIds = []
    this.structureId = null
    this.iStructure = -1

    this.chains = []

    this.maxLength = null

    // stores trace of protein/nucleotide backbones for ribbons
    this.traces = []
    // stores selected chain
    this.selectedTraces = []

    this.colorMode = 'secondary' // or 'grid'

    this.atomStore = new Store(atomStoreFields)
    this.residueStore = new Store(residueStoreFields)
    this.bondStore = new Store(bondStoreFields)

    this.resIds = []
    this.residueNormal = {}

    this.residueProxy = new ResidueProxy(this)
    this.atomProxy = new AtomProxy(this)

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

  isEmpty() {
    return this.getAtomCount() == 0
  }

  parsePdbData(pdbText, pdbId) {
    this.structureId = pdbId
    this.structureIds.push(pdbId)
    this.iStructure = this.structureIds.length - 1

    let title = parsetTitleFromPdbText(pdbText)
    let id = this.structureId.toUpperCase()
    this.title =
      `[<a href="http://www.rcsb.org/structure/${id}">${id}</a>] ` + title
    console.log('Soup.parsePdbData', pdbId)

    const pdbLines = pdbText.split(/\r?\n/)

    let lines = []
    for (let line of pdbLines) {
      if (line.slice(0, 4) === 'ATOM' || line.slice(0, 6) === 'HETATM') {
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
          x,
          y,
          z,
          bfactor,
          alt,
          atomType,
          elem,
          resType,
          resNum,
          insCode,
          chain
        )
      }
    }
  }

  load(pdbData) {
    console.log(`Soup.load parse ${this.structureId}...`)

    this.parsePdbData(pdbData.pdbText, this.structureId)

    this.assignResidueProperties()

    console.log(
      `Soup.load processed ${this.getAtomCount()} atoms, ` +
        `${this.getResidueCount()} residues`
    )

    console.log('Soup.load finding bonds...')
    this.calcBondsStrategic()

    console.log(`Soup.load calculated ${this.getBondCount()} bonds`)

    this.findSecondaryStructure()
    console.log(`Soup.load calculated secondary-structure`)
  }

  async asyncLoadProteinData(proteinData, asyncSetMessageFn) {
    let pdbText = proteinData.pdbText
    let pdbId = proteinData.pdbId

    if (proteinData.pdbText.length === 0) {
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

    let nAtom = this.getAtomCount()
    let nRes = this.getResidueCount()
    await asyncSetMessageFn(
      `Calculating bonds for ${nAtom} atoms, ${nRes} residues...`
    )

    this.calcBondsStrategic()

    let nBond = this.getBondCount()
    await asyncSetMessageFn(
      `Calculated ${nBond} bonds. Assigning secondary structure...`
    )

    this.findSecondaryStructure()

    this.maxLength = this.calcMaxLength()

    this.findGridLimits()

    this.setSecondaryStructureColorResidues()

    this.colorResidues()

    this.calculateTracesForRibbons()
  }

  addAtom(
    x,
    y,
    z,
    bfactor,
    alt,
    atomType,
    elem,
    resType,
    resNum,
    insCode,
    chain
  ) {
    let iAtom = this.atomStore.count

    this.atomStore.increment()

    this.atomStore.x[iAtom] = x
    this.atomStore.y[iAtom] = y
    this.atomStore.z[iAtom] = z

    this.atomStore.bfactor[iAtom] = bfactor
    this.atomStore.alt[iAtom] = charToInt(alt)

    this.atomStore.bondCount[iAtom] = 0

    this.atomStore.iAtomType[iAtom] = getValueTableIndex(
      this.atomTypeTable,
      atomType
    )

    this.atomStore.iElem[iAtom] = getValueTableIndex(this.elemTable, elem)

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
      } else if (this.chains[this.residueProxy.iChain] !== chain) {
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

  addResidue(iFirstAtomInRes, resNum, insCode, chain, resType) {
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
      this.resTypeTable,
      resType
    )

    this.residueStore.atomOffset[iRes] = iFirstAtomInRes
    this.residueStore.atomCount[iRes] = 0

    this.residueStore.iStructure[iRes] = this.iStructure
  }

  assignResidueProperties() {
    let res = this.getResidueProxy()
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      res.iRes = iRes

      if (_.includes(data.proteinResTypes, res.resType)) {
        res.iAtom = res.getIAtom('CA')
        res.ss = 'C'
        res.isPolymer = true
      } else if (
        _.includes(data.dnaResTypes, res.resType) ||
        _.includes(data.rnaResTypes, res.resType)
      ) {
        res.iAtom = res.getIAtom("C3'")
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
  }

  getIAtomClosest(pos, atomIndices) {
    let iAtomClosest = null
    let minD = 1e6
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

  getIAtomAtPosition(pos) {
    let atomIndices = _.range(this.getAtomCount())
    let iAtomClosest = null
    let minD = 1e6
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

  getCenter(atomIndices) {
    let result = v3.create(0, 0, 0)
    let atom = this.getAtomProxy()
    for (let iAtom of atomIndices) {
      result = v3.sum(result, atom.load(iAtom).pos)
    }
    result.divideScalar(atomIndices.length)
    return result
  }

  calcMaxLength(atomIndices = null) {
    let maxima = [0.0, 0.0, 0.0]
    let minima = [0.0, 0.0, 0.0]
    let spans = [0.0, 0.0, 0.0]

    function comp(v, i) {
      if (i === 0) return v.x
      if (i === 1) return v.y
      if (i === 2) return v.z
    }

    if (_.isNull(atomIndices)) {
      atomIndices = _.range(this.getAtomCount())
    }
    let atom = this.getAtomProxy()
    for (let iDim = 0; iDim < 3; iDim++) {
      for (let iAtom of atomIndices) {
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
    return Math.max(spans[0], spans[1], spans[2])
  }

  calcBondsStrategic() {
    this.bondStore.count = 0

    const smallCutoffSq = 1.2 * 1.2
    const mediumCutoffSq = 1.9 * 1.9
    const largeCutoffSq = 2.4 * 2.4
    const CHONPS = ['C', 'H', 'O', 'N', 'P', 'S']

    function isBonded(atom1, atom2) {
      if (atom1 === null || atom2 === null) {
        return false
      }
      // don't include bonds between different alt positions
      if (atom1.alt !== '' && atom2.alt !== '') {
        if (atom1.alt !== atom2.alt) {
          return false
        }
      }

      let cutoffSq
      if (atom1.elem === 'H' || atom2.elem === 'H') {
        cutoffSq = smallCutoffSq
      } else if (inArray(atom1.elem, CHONPS) && inArray(atom2.elem, CHONPS)) {
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

    // this.bondSelect = new BitArray(this.getBondCount())
  }

  /**
   * Identify backbone hydrogen bonds using a distance
   * criteria between O and N atoms.
   */
  findBackboneHbonds() {
    let residue = this.getResidueProxy()
    let atom0 = this.getAtomProxy()
    let atom1 = this.getAtomProxy()

    let result = []
    let cutoff = 3.5

    for (
      let iStructure = 0;
      iStructure < this.structureIds.length;
      iStructure += 1
    ) {
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
        if (atom0.elem === 'O' && atom1.elem === 'N') {
          ;[atom0, atom1] = [atom1, atom0]
        }
        if (!(atom0.elem === 'N' && atom1.elem === 'O')) {
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
  findSecondaryStructure() {
    this.findBackboneHbonds()
    let conhPartners = this.conhPartners
    let residueNormals = {}

    let nRes = this.getResidueCount()
    let residue0 = this.getResidueProxy()
    let residue1 = this.getResidueProxy()

    let atom0 = this.getAtomProxy()
    let atom1 = this.getAtomProxy()

    function isCONH(iRes0, iRes1) {
      if (iRes1 < 0 || iRes1 >= nRes || iRes0 < 0 || iRes0 >= nRes) {
        return false
      }
      return _.includes(conhPartners[iRes1], iRes0)
    }

    function vecBetweenResidues(iRes0, iRes1) {
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
        pushToListInDict(residueNormals, iRes0, residue0.getNucleotideNormal())
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
      if (Math.abs(iRes0 - iRes1) <= 5) {
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
      if (iRes in residueNormals && residueNormals[iRes].length > 0) {
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
      if (residue0.ss === 'E' && residue0.normal) {
        if (residue1.ss === 'E' && residue1.normal) {
          if (residue1.normal.dot(residue0.normal) < 0) {
            this.residueNormal[iRes].negate()
          }
        }
      }
    }
  }

  calculateTracesForRibbons() {
    this.traces.length = 0

    let lastTrace
    let residue = this.getResidueProxy()
    let nextResidue = this.getResidueProxy()
    let atom = this.getAtomProxy()
    let nRes = this.getResidueCount()
    for (let iRes = 0; iRes < nRes; iRes += 1) {
      residue.iRes = iRes
      if (iRes < nRes - 1) {
        nextResidue.iRes = iRes + 1
        if (nextResidue.isConnectedToPrev()) {
          // set for non-standard DNA or protein residues
          residue.isPolymer = true
          nextResidue.isPolymer = true
        }
      }
      if (residue.isPolymer) {
        if (
          _.isUndefined(lastTrace) ||
          iRes === 0 ||
          !residue.isConnectedToPrev()
        ) {
          let newTrace = new glgeom.Trace()
          newTrace.getReference = i => {
            residue.iRes = newTrace.indices[i]
            return residue
          }
          this.traces.push(newTrace)
          lastTrace = newTrace
        }
        lastTrace.indices.push(iRes)

        if (residue.getIAtom('CA')) {
          atom.iAtom = residue.getIAtom('CA')
        } else if (residue.getIAtom("C3'")) {
          atom.iAtom = residue.getIAtom("C3'")
        } else {
          atom.iAtom = residue.iAtom
        }

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

  getAtomProxy(iAtom) {
    return new AtomProxy(this, iAtom)
  }

  getAtomCount() {
    return this.atomStore.count
  }

  getResidueProxy(iRes) {
    return new ResidueProxy(this, iRes)
  }

  getBondProxy(iBond) {
    return new BondProxy(this, iBond)
  }

  getBondCount() {
    return this.bondStore.count
  }

  getResidueCount() {
    return this.residueStore.count
  }

  areCloseResidues(iRes0, iRes1) {
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

  clearSelectedResidues() {
    let residue = this.getResidueProxy()
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      residue.load(iRes).selected = false
    }
  }

  clearSidechainResidues() {
    let residue = this.getResidueProxy()
    for (let iRes = 0; iRes < this.getResidueCount(); iRes += 1) {
      residue.load(iRes).sidechain = false
    }
  }

  setSidechainOfResidues(residueIndices, isSidechain) {
    let residue = this.getResidueProxy()
    for (let iRes of residueIndices) {
      residue.load(iRes).sidechain = isSidechain
    }
  }

  getNeighbours(iRes) {
    let indices = [iRes]
    for (let jRes = 0; jRes < this.getResidueCount(); jRes += 1) {
      if (this.areCloseResidues(jRes, iRes)) {
        indices.push(jRes)
      }
    }
    return indices
  }

  isResCloseToPoint(iRes0, pos1) {
    let atom0 = this.getAtomProxy()

    let res0 = this.getResidueProxy(iRes0)
    let pos0 = atom0.load(res0.iAtom).pos.clone()
    if (v3.distance(pos0, pos1) > 17) {
      return false
    }

    let atomIndices0 = res0.getAtomIndices()
    for (let iAtom0 of atomIndices0) {
      if (v3.distance(atom0.load(iAtom0).pos, pos1) < 5) {
        return true
      }
    }
    return false
  }

  getNeighboursOfPoint(pos) {
    let indices = []
    for (let jRes = 0; jRes < this.getResidueCount(); jRes += 1) {
      if (this.isResCloseToPoint(jRes, pos)) {
        indices.push(jRes)
      }
    }
    return indices
  }

  findResidue(chain, resNum) {
    let residue = this.getResidueProxy()
    for (let iRes of _.range(this.getResidueCount())) {
      residue.iRes = iRes
      if (residue.chain === chain && residue.resNum === resNum) {
        return residue
      }
    }
    return null
  }

  setSecondaryStructureColorResidues() {
    let residue = this.getResidueProxy()
    for (let iRes of _.range(this.getResidueCount())) {
      residue.iRes = iRes
      residue.customColor = data.getSsColor(residue.ss)
    }
  }

  colorResidues() {
    let residue = this.getResidueProxy()
    let isGridActive = _.some(_.values(this.grid.isElem))
    if (isGridActive) {
      for (let iRes of _.range(this.getResidueCount())) {
        residue.iRes = iRes
        residue.color = data.darkGrey
      }
    }

    for (let iRes of _.range(this.getResidueCount())) {
      residue.iRes = iRes
      residue.color = isGridActive ? data.darkGrey : residue.customColor
    }
  }

  /**
   * Searches autodock grid atoms for B-factor limits
   */
  findGridLimits() {
    let residue = this.getResidueProxy()
    let atom = this.getAtomProxy()
    this.grid.isElem = {}
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
    if (_.isNil(this.grid)) {
      this.grid.bCutoff = this.grid.bMin
    }
  }

  deleteStructure(iStructure) {
    console.log('Soup.deleteStructure', iStructure)
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

    for (let iRes = 0; iRes < nResNew; iRes += 1) {
      if (iRes >= iResStart) {
        let iResOld = iRes + nResOffset
        if (iResOld in this.residueNormal) {
          this.residueNormal[iRes] = this.residueNormal[iResOld].clone()
        }
      }
    }

    for (let iRes = nResNew; iRes < nRes; iRes += 1) {
      delete this.residueNormal[iRes]
    }

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
  }

  makeSelectedResidueList() {
    let result = []
    let residue = this.getResidueProxy()
    for (let i = 0; i < this.getResidueCount(); i += 1) {
      if (residue.load(i).sidechain) {
        result.push(i)
      }
    }
    return result
  }
}

export { Soup }
