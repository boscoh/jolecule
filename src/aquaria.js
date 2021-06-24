import _ from 'lodash'
import * as THREE from 'three'
import * as data from './data'
import * as util from './util'
import $ from 'jquery'

function getHexColor (hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  let r = parseInt(result[1], 16) / 255
  let g = parseInt(result[2], 16) / 255
  let b = parseInt(result[3], 16) / 255
  return new THREE.Color(r, g, b)
}

function isNumeric (str) {
  return /^\d+$/.test(str)
}

function makeRgbStringFromHexString (hex) {
  let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  let r = parseInt(result[1], 16)
  let g = parseInt(result[2], 16)
  let b = parseInt(result[3], 16)
  return `rgb(${r}, ${g}, ${b})`
}

function getIndexes (sourceText, findText) {
  if (!sourceText) {
    return []
  }
  // if find is empty string return all indexes.
  if (!findText) {
    // or shorter arrow function:
    // return source.split('').map((_,i) => i);
    return sourceText.split('').map(function (_, i) {
      return i
    })
  }
  let result = []
  for (let i = 0; i < sourceText.length; i += 1) {
    // If you want to search case insensitive use
    // if (source.substring(i, i + find.length).toLowerCase() == find) {
    if (sourceText.substring(i, i + findText.length) === findText) {
      result.push(i)
    }
  }
  return result
}

/*
 * A. D. MCLACHLAN 1972
 * TABLE 1
 * Chemical similarity scores for the amino acids
 * score
 * 6 - FF MM YY HH CC WW RR GG
 * 5 - LL II VV SS PP TT AA QQ NN KK DD EE
 * 3 - FY FW LI LM IM ST AG QE ND KR
 * 2 - FL FM FH IV YH YW SC HQ QN DE
 * 1 - FI FV LV LP LY LW IT IY IW MV MY MW VP SA SN SQ PT PA TA TN HN HW QK QD NE
 * 0 - All others, including unknowns and deletions
 **/

// one letter code: FLIMVSPTAYHQNKDECWRGBZ

const conservedPairs = `
  FY FW LI LM IM ST AG QE ND KR
  FL FM FH IV YH YW SC HQ QN DE
  FI FV LV LP LY LW IT IY IW MV 
  MY MW VP SA SN SQ PT PA TA TN 
  HN HW QK QD NE`

const conservationSet = {}
for (let code of conservedPairs.split(/\s+/)) {
  conservationSet[code] = 1
  let reverseCode = code.charAt(1) + code.charAt(0)
  conservationSet[reverseCode] = 1
}

function getConservation (a, b) {
  if (a === b) {
    return 'identical'
  } else {
    if (_.has(conservationSet, a + b)) {
      return 'conserved'
    }
  }
  return 'nonconserved'
}

class AquariaAlignment {
  reload (aquariaAlignData, embedJolecule) {
    this.data = aquariaAlignData
    this.selectSeqId = this.data.sequences[0].primary_accession
    this.pdbId = this.data.pdb_id
    this.selectSeq = ''
    console.log(
      'AquariaAlignment.reload',
      this.data,
      this.pdbId,
      this.selectSeqId
    )
    this.alignEntries = []
    for (let alignStr of this.data.alignment.split(';')) {
      let pieces = alignStr.split(',')
      let tokens = _.head(pieces).split(':')
      let [pdbId, pdbChain, resNumPdbStart, , resNumPdbEnd] = _.take(tokens, 5)
      if (_.isNil(resNumPdbStart)) {
        continue
      }
      let [seqId, resNumSeqStart, resNumSeqEnd] = _.last(pieces).split(':')
      let entry = {
        pdbId,
        pdbChain,
        resNumPdbStart,
        resNumPdbEnd,
        seqId,
        resNumSeqStart,
        resNumSeqEnd
      }
      for (let key of _.keys(entry)) {
        if (isNumeric(entry[key])) {
          entry[key] = parseInt(entry[key])
        }
      }
      this.alignEntries.push(entry)
    }

    this.setEmbedJolecule(embedJolecule)
  }

  mapSeqResToPdbResOfChain (seqId, resNumSeq, chain) {
    for (let entry of this.alignEntries) {
      if (
        resNumSeq >= entry.resNumSeqStart &&
        resNumSeq <= entry.resNumSeqEnd &&
        chain === entry.pdbChain
      ) {
        let diff = resNumSeq - entry.resNumSeqStart
        let resNumPdb = entry.resNumPdbStart + diff
        return [entry.pdbId, entry.pdbChain, resNumPdb]
      }
    }
    return null
  }

  mapSeqResToPdbResList (resNumSeq) {
    let result = []
    for (let entry of this.alignEntries) {
      if (
        resNumSeq >= entry.resNumSeqStart &&
        resNumSeq <= entry.resNumSeqEnd
      ) {
        let diff = resNumSeq - entry.resNumSeqStart
        let resNumPdb = entry.resNumPdbStart + diff
        result.push([entry.pdbId, entry.pdbChain, resNumPdb])
      }
    }
    return result
  }

  mapPdbResOfChainToSeqRes (chain, resNum) {
    for (let entry of this.alignEntries) {
      if (chain !== entry.pdbChain) {
        continue
      }
      if (resNum >= entry.resNumPdbStart && resNum <= entry.resNumPdbEnd) {
        let iSeq = this.getISeqFromSeqId(entry.seqId)
        let seqName = this.data.common_names[iSeq]
        if (!seqName) {
          seqName = null
        }
        let diff = resNum - entry.resNumPdbStart
        let resNumSeq = entry.resNumSeqStart + diff
        let c = this.data.sequences[iSeq].sequence[resNumSeq - 1]
        return [seqName, resNumSeq, c]
      }
    }
    return [null, null, null]
  }

  getChainsThatMapToSeqId (seqId) {
    let allowedChains = []
    for (let iChain of _.range(this.data.pdb_chain.length)) {
      if (this.data.sequences[iChain].primary_accession === seqId) {
        allowedChains.push(this.data.pdb_chain[iChain])
      }
    }
    return allowedChains
  }

  getISeqFromSeqId (seqId) {
    let sequences = this.data.sequences
    for (let iSeq of _.range(sequences.length)) {
      if (sequences[iSeq].primary_accession === seqId) {
        return iSeq
      }
      let testSeqId = this.data.pdb_id + '-' + this.data.pdb_chain[iSeq]
      if (testSeqId === seqId) {
        return iSeq
      }
    }
    return null
  }

  mapSeqResToPdbResColorEntry (seqId, resNumSeq, color) {
    let allowedChains = this.getChainsThatMapToSeqId(seqId)
    let result = []
    for (let entry of this.mapSeqResToPdbResList(resNumSeq)) {
      let [pdbId, chain, resNumPdb] = entry
      if (_.includes(allowedChains, chain)) {
        result.push({
          pdbId,
          chain,
          resNum: resNumPdb,
          color: makeRgbStringFromHexString(color)
        })
      }
    }
    return result
  }

  colorSoup (soup) {
    soup.setSecondaryStructureColorResidues()

    let allowedChains = []
    for (let iChain of _.range(this.data.sequences.length)) {
      if (!_.isNil(this.data.sequences[iChain].primary_accession)) {
        allowedChains.push(this.data.pdb_chain[iChain])
      }
    }

    let residue = soup.getResidueProxy()
    for (let iRes = 0; iRes < soup.getResidueCount(); iRes += 1) {
      residue.iRes = iRes
      let chain = residue.chain
      let resNum = residue.resNum
      let pdbC = _.get(data.resToAa, residue.resType, '.')
      let [, seqResNum, c] = this.mapPdbResOfChainToSeqRes(chain, resNum)
      if (_.isNil(seqResNum)) {
        // probably insertion, and non-alignments
        residue.customColor = '#999999'
      } else {
        if (!_.includes(allowedChains, residue.chain)) {
          residue.customColor = '#999999'
        } else if (getConservation(c, pdbC) === 'conserved') {
          residue.customColor = '#586C7C'
        } else if (getConservation(c, pdbC) === 'nonconserved') {
          residue.customColor = '#4D4D4D'
        }
      }
    }
    soup.colorResidues()
  }

  setColorLegend (colorLegendWidget) {
    colorLegendWidget.default()
    colorLegendWidget.colorEntries.push({
      color: '#586C7C',
      label: 'Conserved'
    })
    colorLegendWidget.colorEntries.push({
      color: '#4D4D4D',
      label: 'Nonconserved'
    })
    colorLegendWidget.rebuild()
  }

  setFullSequence (sequenceWidget) {
    let soup = sequenceWidget.soup

    sequenceWidget.charEntries.length = 0
    sequenceWidget.nChar = 0

    let pdbId = this.data.pdb_id

    let chains = this.data.pdb_chain

    for (let iChain = 0; iChain < chains.length; iChain += 1) {
      let chain = chains[iChain]
      let sequenceOfChain = this.data.sequences[iChain].sequence
      let seqId = this.data.sequences[iChain].primary_accession
      let seqName = this.data.common_names[iChain]
      if (_.isNil(seqId)) {
        seqId = ''
      }
      console.log('AquariaAlignment.setFullSequence', iChain, seqId, seqName)
      // Fill the empty padding before every chain
      for (
        let iResOfSeq = 0;
        iResOfSeq < sequenceOfChain.length;
        iResOfSeq += 1
      ) {
        if (iResOfSeq === 0) {
          for (let iResOfPadding of _.range(sequenceWidget.nPadChar)) {
            let startLabel = null
            if (iResOfPadding === 0) {
              startLabel = ''
              if (seqName) {
                startLabel += seqName + ', '
              }
              startLabel += pdbId + '-' + chain
            }
            let entry = {
              iStructure: 0,
              chain,
              c: '',
              startLabel: startLabel,
              ss: ''
            }
            sequenceWidget.charEntries.push(entry)
          }
        }

        let c = sequenceOfChain[iResOfSeq]
        let seqResNum = iResOfSeq + 1
        let pdbRes = this.mapSeqResToPdbResOfChain(seqId, seqResNum, chain)
        let seqLabel = ''
        if (seqName) {
          seqLabel = `Sequence: ${seqName} ${c}${seqResNum}<br>`
        }
        if (_.isNil(pdbRes)) {
          // Entries of residues without PDB matches
          let entry = {
            iStructure: 0,
            chain,
            c: c,
            startLabel: null,
            ss: '.',
            label: `${seqLabel}Structure: [No match]`,
            resNum: iResOfSeq + 1
          }
          sequenceWidget.charEntries.push(entry)
        } else {
          // Entries of residues that match PDB residues
          let [pdbId, chain, pdbResNum] = pdbRes
          let residue = soup.findFirstResidue(chain, pdbResNum)
          if (_.isNil(residue)) {
            let entry = {
              chain,
              iStructure: 0,
              c: c,
              startLabel: null,
              ss: '.',
              label: `${seqLabel}Structure: [No match]`,
              resNum: iResOfSeq + 1
            }
            sequenceWidget.charEntries.push(entry)
          } else {
            let pdbC = _.get(data.resToAa, residue.resType, '.')
            let entry = {
              chain,
              iStructure: residue.iStructure,
              c: c,
              startLabel: null,
              iRes: residue.iRes,
              ss: residue.ss,
              label: `${seqLabel}Structure: ${pdbId}-${chain} ${pdbC}${pdbResNum}`,
              resNum: iResOfSeq + 1
            }
            sequenceWidget.charEntries.push(entry)
          }
        }
      }
    }
    sequenceWidget.nChar = sequenceWidget.charEntries.length
  }

  colorFromFeatures (embededJolecule, features, seqId, name) {
    let soup = embededJolecule.soupView.soup
    let residue = soup.getResidueProxy()
    for (let i = 0; i < soup.getResidueCount(); i += 1) {
      residue.iRes = i
      residue.customColor = getHexColor('#999999')
    }
    for (let feature of features) {
      let resNum = parseInt(feature.Residue)
      for (let entry of this.mapSeqResToPdbResColorEntry(
        seqId,
        resNum,
        feature.Color
      )) {
        let residue = soup.findFirstResidue(entry.chain, entry.resNum)
        if (!_.isNil(residue)) {
          residue.customColor = entry.color
        }
      }
    }
    soup.colorResidues()
    embededJolecule.soupView.isUpdateColors = true
    embededJolecule.soupView.isChanged = true
    this.setFeatureColorLegend(
      embededJolecule.widget.colorLegend,
      features,
      name
    )
  }

  setFeatureColorLegend (colorLegendWidget, features, name) {
    this.features = features
    // console.log('AquariaAlignment.setFeatureColorLegend', features)
    let entries = []
    for (let feature of features) {
      let entry = _.find(entries, e => e.color === feature.Color)
      if (!entry) {
        entries.push({ color: feature.Color, label: [feature.Name] })
      } else {
        entry.label.push(feature.Name)
      }
    }
    for (let entry of entries) {
      entry.label = _.uniq(entry.label)
      entry.label = _.join(entry.label, ', ')
      let n = 50
      if (entry.label.length > n) {
        entry.label = entry.label.substring(0, n - 3) + '...'
      }
    }
    colorLegendWidget.colorEntries.length = 0
    for (let entry of entries) {
      colorLegendWidget.colorEntries.push(entry)
    }
    colorLegendWidget.title = name
    colorLegendWidget.rebuild()
  }

  colorFromConservation (embedJolecule) {
    embedJolecule.soupView.isUpdateObservers = true
    embedJolecule.soupView.isUpdateColors = true
    embedJolecule.soupView.isChanged = true
    this.colorSoup(embedJolecule.soup)
    this.setColorLegend(embedJolecule.widget.colorLegend)
  }

  selectNewChain (seqId, seqName, pdbId, chain) {
    console.log(
      'AquariaAlignment.selectNewChain [overriddeable]',
      seqId,
      seqName,
      pdbId,
      chain
    )
  }

  setPopup (embedJolecule) {
    let soup = embedJolecule.soup
    embedJolecule.soupWidget.popupText = iAtom => {
      let pdbId = this.data.pdb_id
      let atom = soup.getAtomProxy(iAtom)
      let iRes = atom.iRes
      let residue = soup.getResidueProxy(iRes)
      let [seqName, seqResNum, c] = this.mapPdbResOfChainToSeqRes(
        residue.chain,
        residue.resNum
      )
      let pdbC = _.get(data.resToAa, residue.resType, '.')
      let label = `Structure: ${pdbId}-${residue.chain} ${pdbC}${residue.resNum} <br>Atom: ${atom.atomType}`
      if (!_.isNil(seqResNum)) {
        if (seqName) {
          label = `Sequence: ${seqName} ${c}${seqResNum} <br>` + label
        } else {
          label = `Sequence: [No match]<br>` + label
        }
        if (this.features) {
          for (let feature of this.features) {
            if (feature.Residue === seqResNum) {
              label += `<br>Feature: ${feature.Name}`
              if (feature.Description) {
                if (feature.Name) {
                  label += ' - '
                }
                label += `${feature.Description}`
              }
            }
          }
        }
      } else {
        label = `Sequence: [No match]<br>` + label
      }
      return label
    }
  }

  getSelectionText () {
    if (_.isNil(this.embedJolecule)) {
      return ''
    }
    let soup = this.embedJolecule.soup
    let residue = soup.getResidueProxy()

    let pieces = []
    let chain = null
    let piece = {}
    let firstPdbResNum = null
    let lastPdbResNum = null
    let firstSeqResNum = null
    let lastSeqResNum = null
    for (let i = 0; i < soup.getResidueCount(); i += 1) {
      residue.iRes = i
      if (residue.selected) {
        let [seqName, seqResNum, c] = this.mapPdbResOfChainToSeqRes(
          residue.chain,
          residue.resNum
        )
        if (chain === null || chain !== residue.chain) {
          piece = {
            pdbChain:
              soup.structureIds[residue.iStructure] + '-' + residue.chain,
            seqName: seqName,
            firstPdbRes: null,
            firstSeqRes: null,
            pdbResRanges: [],
            seqResRanges: []
          }
          pieces.push(piece)
          let pdbC = _.get(data.resToAa, residue.resType, '.')
          piece.firstPdbRes = pdbC + residue.resNum
          piece.firstSeqRes = c + seqResNum
          chain = residue.chain
        }
        if (firstPdbResNum === null) {
          firstPdbResNum = residue.resNum
          lastPdbResNum = firstPdbResNum
          firstSeqResNum = seqResNum
          lastSeqResNum = firstSeqResNum
        } else {
          lastPdbResNum = residue.resNum
          lastSeqResNum = seqResNum
        }
      } else {
        if (firstPdbResNum !== null) {
          piece.pdbResRanges.push([firstPdbResNum, lastPdbResNum])
          piece.seqResRanges.push([firstSeqResNum, lastSeqResNum])
        }
        firstPdbResNum = null
      }
    }

    let text = ''

    if (this.selectSeq) {
      text += `SEQUENCE: "${this.selectSeq}" <br>`
    }

    if (pieces.length > 0) {
      for (let [iPiece, piece] of pieces.entries()) {
        if (iPiece > 0) {
        }
        if (piece.pdbResRanges.length > 0) {
          text += piece.pdbChain + ': '

          let first = piece.pdbResRanges[0]
          let isFirstSolo = first[0] === first[1]

          if (piece.pdbResRanges.length === 1 && isFirstSolo) {
            text += piece.firstPdbRes
          } else {
            for (let [i, r] of _.toPairs(piece.pdbResRanges)) {
              if (i > 0) {
                text += ', '
              }
              if (r[0] === r[1]) {
                text += r[0]
              } else {
                text += ` ${r[0]}-${r[1]}`
              }
            }
          }
          text += '<br>'
        }
        if (piece.seqName && piece.seqResRanges.length > 0) {
          text += piece.seqName + ': '

          let first = piece.seqResRanges[0]
          let isFirstSolo = first[0] === first[1]

          if (piece.seqResRanges.length === 1 && isFirstSolo) {
            text += piece.firstSeqRes
          } else {
            for (let [i, r] of _.toPairs(piece.seqResRanges)) {
              if (i > 0) {
                text += ', '
              }
              if (r[0] === r[1]) {
                text += r[0]
              } else {
                text += ` ${r[0]}-${r[1]}`
              }
            }
          }
          text += '<br>'
        }
      }
    }

    return text
  }

  copyToClipboard () {
    let result = ''
    let soup = this.embedJolecule.soup
    let chains = this.data.pdb_chain
    let pdbId = this.data.pdb_id
    for (let iChain = 0; iChain < chains.length; iChain += 1) {
      let chain = chains[iChain]
      let masterSeq = this.data.sequences[iChain].sequence
      let seqId = this.data.sequences[iChain].primary_accession
      let masterSeqName = this.data.common_names[iChain]
      let pdbSeqName = `${pdbId}-${chain}`
      let copySeqName = pdbSeqName + '_SELECTED'
      if (_.isNil(seqId)) {
        seqId = ''
      }
      if (_.isNil(masterSeqName)) {
        masterSeqName = 'SEQUENCE'
      }
      let pdbSeq = ''
      let copySeq = ''
      for (let iResOfSeq = 0; iResOfSeq < masterSeq.length; iResOfSeq += 1) {
        let seqResNum = iResOfSeq + 1
        let pdbRes = this.mapSeqResToPdbResOfChain(seqId, seqResNum, chain)
        let pdbC = '-'
        let copyC = '-'
        if (!_.isNil(pdbRes)) {
          let [, chain, pdbResNum] = pdbRes
          let residue = soup.findFirstResidue(chain, pdbResNum)
          if (!_.isNil(residue)) {
            pdbC = _.get(data.resToAa, residue.resType, '-')
            if (residue.selected) {
              copyC = pdbC
            }
          }
        }
        pdbSeq += pdbC
        copySeq += copyC
      }
      let entries = [
        { name: masterSeqName, seq: masterSeq },
        { name: pdbSeqName, seq: pdbSeq },
        { name: copySeqName, seq: copySeq }
      ]
      let nameLen = _.max(_.map(entries, e => e.name.length))
      let seqLen = _.max(_.map(entries, e => e.seq.length))
      let width = 50
      let nSection = Math.ceil(seqLen / width)
      let s = ''
      for (let iSection = 0; iSection < nSection; iSection += 1) {
        for (let iEntry = 0; iEntry < entries.length; iEntry += 1) {
          let entry = entries[iEntry]
          s += _.padEnd(entry.name, nameLen) + ' '
          s += entry.seq.substring(iSection * width, (iSection + 1) * width)
          s += '\n'
        }
        s += '\n'
      }
      result += s
    }
    console.log('AquariaAlignment.copyToClipboard')
    console.log(result)
    util.copyTextToClipboard(result)
    return result
  }

  selectNextChar (c) {
    this.selectSeq += c
    let soup = this.embedJolecule.soup
    this.embedJolecule.controller.clearSelectedResidues()
    let chains = this.data.pdb_chain
    let nSeq = this.selectSeq.length
    for (let iChain = 0; iChain < chains.length; iChain += 1) {
      let chain = chains[iChain]
      let masterSeq = this.data.sequences[iChain].sequence
      let seqId = this.data.sequences[iChain].primary_accession
      if (_.isNil(seqId)) {
        seqId = ''
      }
      for (let iResOfSeq of getIndexes(masterSeq, this.selectSeq)) {
        for (let iRes = iResOfSeq; iRes < iResOfSeq + nSeq; iRes += 1) {
          let pdbRes = this.mapSeqResToPdbResOfChain(seqId, iRes + 1, chain)
          if (!_.isNil(pdbRes)) {
            let [, chain, pdbResNum] = pdbRes
            let residue = soup.findFirstResidue(chain, pdbResNum)
            if (!_.isNil(residue)) {
              this.embedJolecule.controller.setResidueSelect(residue.iRes, true)
            }
          }
        }
      }
    }
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
    }
    this.timeoutId = setTimeout(() => {
      this.timeoutId = null
      this.selectSeq = ''
      this.embedJolecule.soupView.isUpdateObservers = true
      this.embedJolecule.soupView.isChanged = true
      console.log('AquariaAlignment.selectNextChar settimeout cancel')
    }, 4000)
  }

  setSelectionPanel (embedJolecule) {
    let widget = embedJolecule.widget.selection
    widget.getText = () => this.getSelectionText()
  }

  setEmbedJolecule (embedJolecule) {
    embedJolecule.soupView.setMode('chain')
    embedJolecule.soupWidget.isCrossHairs = false
    embedJolecule.soupWidget.crossHairs.visible = false
    embedJolecule.soupView.setMode('chain')
    this.setFullSequence(embedJolecule.widget.sequence)
    embedJolecule.widget.sequence.update()
    for (let [iChain, sequence] of this.data.sequences.entries()) {
      if (!_.isNil(sequence.primary_accession)) {
        let chain = this.data.pdb_chain[iChain]
        console.log('AquariaAlignment.setEmbedJolecule', chain)
        embedJolecule.controller.selectChain(0, chain)
        break
      }
    }
    if (_.isNil(embedJolecule.soupWidget.isAquariaTracking)) {
      // Makes this an observer where this.update will be called
      // whenever an event is triggered in the widget
      embedJolecule.soupWidget.addObserver(this)
      embedJolecule.soupWidget.isAquariaTracking = true
      this.embedJolecule = embedJolecule
    }
    this.colorFromConservation(embedJolecule)
    this.setPopup(embedJolecule)
    this.setSelectionPanel(embedJolecule)
  }

  update () {
    let result = this.embedJolecule.soup.getIStructureAndChain()
    if (_.isNil(result)) {
      this.selectNewChain(null, null, null, null)
    } else {
      let iChain = _.findIndex(this.data.pdb_chain, c => c === result.chain)
      if (iChain >= 0) {
        this.selectSeqId = this.data.sequences[iChain].primary_accession
        let seqName = this.data.common_names[iChain]
        let structureId = this.embedJolecule.soup.structureIds[
          result.iStructure
        ]
        this.selectNewChain(
          this.selectSeqId,
          seqName,
          structureId,
          result.chain
        )
      } else {
        console.log(
          'AquariaAlignment.update error, chain not found in alignment:',
          result.chain,
          this.data.pdb_chain,
          this.data
        )
      }
    }
  }
}

export { AquariaAlignment }
