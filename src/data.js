/**
 * Central place to store constants and color
 * accesors
 */

import _ from 'lodash'
import * as THREE from 'three'

const proteinResTypes = [
  'ALA', 'CYS', 'ASP', 'GLU', 'PHE', 'GLY', 'HIS',
  'ILE', 'LYS', 'LEU', 'MET', 'ASN', 'PRO', 'GLN',
  'ARG', 'SER', 'THR', 'TRP', 'VAL', 'TYR']
const dnaResTypes = ['DA', 'DT', 'DG', 'DC', 'A', 'T', 'G', 'C']
const rnaResTypes = ['RA', 'RU', 'RC', 'RG', 'A', 'G', 'C', 'U']

// Color constants

const green = new THREE.Color(0x639941)
const blue = new THREE.Color(0x568AB5)
const yellow = new THREE.Color(0xFFC900)
const purple = new THREE.Color(0x9578AA)
const grey = new THREE.Color(0xBBBBBB)
const red = new THREE.Color(0x993333)
const darkGrey = new THREE.Color(0x999999)

let ElementColors = {
  'H': 0xCCCCCC,
  'C': 0xAAAAAA,
  'O': 0xCC0000,
  'N': 0x0000CC,
  'S': 0xAAAA00,
  'P': 0x6622CC,
  'F': 0x00CC00,
  'CL': 0x00CC00,
  'BR': 0x882200,
  'I': 0x6600AA,
  'FE': 0xCC6600,
  'CA': 0x8888AA,
  'He': 0x7B86C2,
  'Ne': 0x9ED2E4,
  'Ar': 0x5DC4BE,
  'Kr': 0xACD376,
  'Xe': 0xF79F7C,
  'Rn': 0xE29EC5
}

for (let [k, v] of _.toPairs(ElementColors)) {
  ElementColors[k] = new THREE.Color(v)
}

function getSsColor (ss) {
  if (ss === 'E') {
    return yellow
  } else if (ss === 'H') {
    return blue
  } else if (ss === 'D') {
    return purple
  } else if (ss === 'C') {
    return green
  } else if (ss === 'W') {
    return red
  }
  return grey
}

const resToAa = {
  'ALA': 'A',
  'CYS': 'C',
  'ASP': 'D',
  'GLU': 'E',
  'PHE': 'F',
  'GLY': 'G',
  'HIS': 'H',
  'ILE': 'I',
  'LYS': 'K',
  'LEU': 'L',
  'MET': 'M',
  'ASN': 'N',
  'PRO': 'P',
  'GLN': 'Q',
  'ARG': 'R',
  'SER': 'S',
  'THR': 'T',
  'VAL': 'V',
  'TRP': 'W',
  'TYR': 'Y',
  'DA': 'A',
  'DT': 'T',
  'DG': 'G',
  'DC': 'C',
  'A': 'A',
  'T': 'T',
  'G': 'G',
  'C': 'C',
  'RA': 'A',
  'RU': 'U',
  'RC': 'C',
  'RG': 'G',
  'U': 'U'

}

// Backbone atom names

const backboneAtomTypes = [
  'N', 'C', 'O', 'H', 'HA', 'CA', 'OXT',
  'C3\'', 'P', 'OP1', 'O5\'', 'OP2',
  'C5\'', 'O5\'', 'O3\'', 'C4\'', 'O4\'', 'C1\'', 'C2\'', 'O2\'',
  'H2\'', 'H2\'\'', 'H3\'', 'H4\'', 'H5\'', 'H5\'\'', 'HO3\''
]

// Cartoon cross-sections
const ribbonFace = new THREE.Shape([
  new THREE.Vector2(-1.5, -0.2),
  new THREE.Vector2(-1.5, +0.2),
  new THREE.Vector2(+1.5, +0.2),
  new THREE.Vector2(+1.5, -0.2)
])
const coilFace = new THREE.Shape([
  new THREE.Vector2(-0.2, -0.2),
  new THREE.Vector2(-0.2, +0.2),
  new THREE.Vector2(+0.2, +0.2),
  new THREE.Vector2(+0.2, -0.2)
])

// Tube cross-sections
const fatCoilFace = new THREE.Shape([
  new THREE.Vector2(-0.25, -0.25),
  new THREE.Vector2(-0.25, +0.25),
  new THREE.Vector2(+0.25, +0.25),
  new THREE.Vector2(+0.25, -0.25)
])

function getSsFace (ss) {
  if (ss === 'C' || ss === '-') {
    return coilFace
  }
  return ribbonFace
}

function getNucleotideBaseAtomTypes (resType) {
  let atomTypes = []
  if (resType === 'DA' || resType === 'A') {
    atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
  } else if (resType === 'DG' || resType === 'G') {
    atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
  } else if (resType === 'DT' || resType === 'U') {
    atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
  } else if (resType === 'DC' || resType === 'C') {
    atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
  }
  return atomTypes
}

function getNucleotideConnectorBondAtomTypes (resType) {
  let bondTypes = []
  if (resType === 'DA' || resType === 'A') {
    bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']]
  } else if (resType === 'DG' || resType === 'G') {
    bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']]
  } else if (resType === 'DT' || resType === 'U') {
    bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']]
  } else if (resType === 'DC' || resType === 'C') {
    bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']]
  }
  return bondTypes
}


export {
  getSsColor,
  resToAa,
  backboneAtomTypes,
  getSsFace,
  coilFace,
  fatCoilFace,
  green,
  blue,
  yellow,
  purple,
  grey,
  red,
  darkGrey,
  ElementColors,
  proteinResTypes,
  dnaResTypes,
  rnaResTypes,
  getNucleotideBaseAtomTypes,
  getNucleotideConnectorBondAtomTypes
}
