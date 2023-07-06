/**
 * Central place to store constants and color
 * accesors
 */

import _ from 'lodash'
import * as THREE from 'three'

const proteinResTypes = [
    'ACE',
    'NME',
    'ALA',
    'CYS',
    'CYM',
    'CYX',
    'ASP',
    'GLU',
    'PHE',
    'GLY',
    'HIS',
    'HID',
    'HIE',
    'HIP',
    'HIN',
    'ILE',
    'LYS',
    'LEU',
    'MET',
    'ASN',
    'PRO',
    'GLN',
    'ARG',
    'SER',
    'THR',
    'TRP',
    'VAL',
    'TYR',
]
const dnaResTypes = ['DA', 'DT', 'DG', 'DC', 'A', 'T', 'G', 'C']
const rnaResTypes = ['RA', 'RU', 'RC', 'RG', 'A', 'G', 'C', 'U']

// Color constants

const green = new THREE.Color(0x6f9e52)
const blue = new THREE.Color(0x6491b6)
const yellow = new THREE.Color(0xf6c619)
const purple = new THREE.Color(0x9578aa)
const grey = new THREE.Color(0xbbbbbb)
const red = new THREE.Color(0x993333)
const darkGrey = new THREE.Color(0x999999)
const white = new THREE.Color(0xFFFFFF)

const solventResTypes = [
    'HOH',
    'NA',
    'CL',
    "TIP3",
    "TIP3P",
    "SPCE",
    "SPC",
    "TIP4PEW",
    "WAT",
    "OH2",
    "TIP",
    "Na+",
    "Cl-",
]

let ElementColors = {
    H: 0xcccccc,
    C: 0xaaaaaa,
    O: 0xcc0000,
    N: 0x0000cc,
    S: 0xaaaa00,
    P: 0x6622cc,
    F: 0x00cc00,
    CL: 0x00cc00,
    BR: 0x882200,
    I: 0x6600aa,
    FE: 0xcc6600,
    CA: 0x8888aa,
    He: 0x7b86c2,
    Ne: 0x9ed2e4,
    Ar: 0x5dc4be,
    Kr: 0xacd376,
    Xe: 0xf79f7c,
    Rn: 0xe29ec5,
}

let paletteColors = [
    0x023fa5,
    0x7d87b9,
    0xbec1d4,
    0xd6bcc0,
    0xbb7784,
    0x8e063b,
    0x4a6fe3,
    0x8595e1,
    0xb5bbe3,
    0xe6afb9,
    0xe07b91,
    0xd33f6a,
    0x11c638,
    0x8dd593,
    0xc6dec7,
    0xead3c6,
    0xf0b98d,
    0xef9708,
    0x0fcfc0,
    0x9cded6,
    0xd5eae7,
    0xf3e1eb,
    0xf6c4e1,
    0xf79cd4
]

for (let i of _.range(paletteColors.length)) {
    ElementColors[`${i+1}`] = paletteColors[i]
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
    ALA: 'A',
    CYS: 'C',
    CYX: 'C',
    CYM: 'C',
    ASP: 'D',
    GLU: 'E',
    PHE: 'F',
    GLY: 'G',
    HIE: 'H',
    HID: 'H',
    HIP: 'H',
    HIS: 'H',
    ILE: 'I',
    LYS: 'K',
    LEU: 'L',
    MET: 'M',
    ASN: 'N',
    PRO: 'P',
    GLN: 'Q',
    ARG: 'R',
    SER: 'S',
    THR: 'T',
    VAL: 'V',
    TRP: 'W',
    TYR: 'Y',
    ACE: '<',
    NME: '>',
    DA: 'A',
    DT: 'T',
    DG: 'G',
    DC: 'C',
    A: 'A',
    T: 'T',
    G: 'G',
    C: 'C',
    RA: 'A',
    RU: 'U',
    RC: 'C',
    RG: 'G',
    U: 'U',
}

// Backbone atom names

const backboneAtomTypes = [
    'N',
    'C',
    'O',
    'H',
    'HA',
    'CA',
    'OXT',
    "C3'",
    'P',
    'OP1',
    "O5'",
    'OP2',
    "C5'",
    "O5'",
    "O3'",
    "C4'",
    "O4'",
    "C1'",
    "C2'",
    "O2'",
    "H2'",
    "H2''",
    "H3'",
    "H4'",
    "H5'",
    "H5''",
    "HO3'",
    'HN',
    'HT1',
    'HT2',
    'HT3',
    'H2',
    'H3',
    'OT1',
    'OT2',
]

// Cartoon cross-sections
const coilFace = new THREE.Shape([
    new THREE.Vector2(-0.2, -0.2),
    new THREE.Vector2(-0.2, +0.2),
    new THREE.Vector2(+0.2, +0.2),
    new THREE.Vector2(+0.2, -0.2),
])

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
        bondTypes = [["C3'", "C2'"], ["C2'", "C1'"], ["C1'", 'N9']]
    } else if (resType === 'DG' || resType === 'G') {
        bondTypes = [["C3'", "C2'"], ["C2'", "C1'"], ["C1'", 'N9']]
    } else if (resType === 'DT' || resType === 'U') {
        bondTypes = [["C3'", "C2'"], ["C2'", "C1'"], ["C1'", 'N1']]
    } else if (resType === 'DC' || resType === 'C') {
        bondTypes = [["C3'", "C2'"], ["C2'", "C1'"], ["C1'", 'N1']]
    }
    return bondTypes
}

export {
    getSsColor,
    resToAa,
    backboneAtomTypes,
    coilFace,
    green,
    blue,
    yellow,
    purple,
    grey,
    red,
    darkGrey,
    white,
    solventResTypes,
    ElementColors,
    proteinResTypes,
    dnaResTypes,
    rnaResTypes,
    getNucleotideBaseAtomTypes,
    getNucleotideConnectorBondAtomTypes,
}
