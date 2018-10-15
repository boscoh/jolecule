import { EmbedJolecule, defaultArgs } from './embed-widget.js'
import { FullPageWidget } from './full-page-widget.js'
import _ from 'lodash'
import $ from 'jquery'
import * as THREE from 'three'

/**
 *
 * @param args = {
 *   divTag: '',
 *   viewId: '',
 *   viewHeight: 170,
 *   isViewTextShown: false,
 *   isEditable: true,
 *   animateState: 'none',
 *   onload: onload,
 *   isGrid: false
 * }
 * @returns {EmbedJolecule}
 */
function initEmbedJolecule(args) {
  return new EmbedJolecule(_.merge(defaultArgs, args))
}

/**
 * @param proteinDisplayTag
 * @param viewsDisplayTag
 * @param params
 */
function initFullPageJolecule(...args) {
  return new FullPageWidget(...args)
}

/**
 * @param pdbId: Str - id of RCSB protein structure
 * @param userId: Str - optional id of user on http://jolecule.com;
 *                      default: ''
 * @param isReadOnly: Bool - prevents save/delete to server
 * @param saveUrl: Str - base URL of views server (e.g. "http://jolecule.com")
 * @param isLoadViews: bool - if false: creates dummy view get methods
 * @returns DataServer object
 */
function makeDataServer(
  pdbId,
  userId = null,
  isReadOnly = false,
  saveUrl = '',
  isLoadViews = true
) {
  return {
    // Id of structure accessed by this DataServer
    pdbId: pdbId,

    /**
     * @param callback - function that takes a dictionary {
     *   pdbId: Str - id/name of protein structure
     *   pdbText: Str - text in PDB format of a protein structure
     * }
     */
    getProteinData: function(callback) {
      let url
      if (pdbId.length === 4) {
        url = `https://files.rcsb.org/download/${pdbId}.pdb`
      } else {
        url = `${saveUrl}/pdb/${pdbId}.txt`
      }
      $.get(url)
        .done(pdbText => {
          let result = { pdbId: pdbId, pdbText: pdbText }
          console.log('makeDataServer.getProteinData', url, result)
          callback(result)
        })
        .fail(() => {
          callback({ pdbId: pdbId, pdbText: '' })
        })
    },

    /**
     * @param callback - function that takes a list [
     *   View dictionary as defined by View.getDict()
     * ]
     */
    getViews: function(callback) {
      if (!isLoadViews) {
        callback([])
        return
      }
      let url = `${saveUrl}/pdb/${pdbId}.views.json`
      if (userId) {
        url += `?user_id=${userId}`
      }
      $.getJSON(url)
        .done(views => {
          console.log('makeDataServer.getViews', url, views)
          callback(views)
        })
        .fail(() => {
          console.log('makeDataServer.getViews fail', url)
          callback([])
        })
    },

    /**
     * @param views - list of View.dicts to be saved
     * @param callback(Boolean) - that is triggered on successful save
     */
    saveViews: function(views, callback) {
      if (isReadOnly) {
        callback()
        return
      }
      $.post(`${saveUrl}/save/views`, JSON.stringify(views))
        .done(() => {
          console.log('makeDataServer.saveViews success', '/save/views', views)
          callback(true)
        })
        .fail(() => {
          console.log('makeDataServer.saveViews fail', '/save/views', views)
          callback(false)
        })
    },

    /**
     * @param viewId - Str: id of view to be deleted
     * @param callback(Boolean) - that is triggered on successful delete with
     */
    deleteView: function(viewId, callback) {
      if (isReadOnly) {
        callback()
        return
      }
      $.post(`${saveUrl}/delete/view`, JSON.stringify({ pdbId, viewId }))
        .done(() => {
          console.log('makeDataServer.deleteView success', viewId)
          callback(true)
        })
        .fail(() => {
          console.log('makeDataServer.deleteView fail', viewId)
          callback(false)
        })
    }
  }
}

function getHexColor(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  var r = parseInt(result[1], 16) / 255
  var g = parseInt(result[2], 16) / 255
  var b = parseInt(result[3], 16) / 255
  return new THREE.Color(r, g, b)
}

function isNumeric(str) {
  return /^\d+$/.test(str)
}

function makeRgbStringFromHexString(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  var r = parseInt(result[1], 16)
  var g = parseInt(result[2], 16)
  var b = parseInt(result[3], 16)
  return `rgb(${r}, ${g}, ${b})`
}

class AquariaAlignment {
  constructor(aquariaAlignData) {
    this.data = aquariaAlignData

    this.alignEntries = []
    for (let alignStr of this.data.alignment.split(';')) {
      let pieces = alignStr.split(',')
      let tokens = _.head(pieces).split(':')
      let [pdbId, pdbChain, resNumPdbStart, dummy, resNumPdbEnd] = _.take(
        tokens,
        5
      )
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
  }

  mapPdbFromSeqResNum(resNumSeq) {
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

  mapPdb(chain, resNum) {
    for (let entry of this.alignEntries) {
      if (chain !== entry.pdbChain) {
        continue
      }
      if (resNum >= entry.resNumPdbStart && resNum <= entry.resNumPdbEnd) {
        let diff = resNum - entry.resNumPdbStart
        let resNumSeq = entry.resNumSeqStart + diff
        return resNumSeq
      }
    }
    return null
  }

  mapSeqRes(seqId, resNumSeq, chain) {
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

  getPdbColorEntry(resNumSeq, color) {
    let result = []
    for (let entry of this.mapPdbFromSeqResNum(resNumSeq)) {
      let [pdb, chain, resNumPdb] = entry
      result.push({
        pdb,
        chain,
        resNum: resNumPdb,
        color: makeRgbStringFromHexString(color)
      })
    }
    return result
  }

  getMapResNums(resNumSeq) {
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

  getPdbResColors(resNumSeq, color) {
    let result = []
    for (let entry of this.getMapResNums(resNumSeq)) {
      let [pdb, chain, resNumPdb] = entry
      result.push({
        pdb,
        chain,
        resNum: resNumPdb,
        color: makeRgbStringFromHexString(color)
      })
    }
    return result
  }

  recolorPdb(chain, seqId) {
    let colors = []
    for (let chain of _.keys(this.data.conservations)) {
      for (let resNum of this.data.conservations[chain].conserved) {
        colors = _.concat(colors, this.getPdbColorEntry(resNum, '#666666'))
      }
      for (let resNum of this.data.conservations[chain].nonconserved) {
        colors = _.concat(colors, this.getPdbColorEntry(resNum, '#000000'))
      }
    }
    return colors
  }

  colorSoup(soup) {
    let residue = soup.getResidueProxy()
    for (let iRes = 0; iRes < soup.getResidueCount(); iRes += 1) {
      residue.iRes = iRes
      let chain = residue.chain
      let seqResNum = null
      let resNum = residue.resNum
      seqResNum = this.mapPdb(chain, resNum)
      if (_.isNil(seqResNum)) {
        residue.customColor = '#999999'
      } else {
        if (chain in this.data.conservations) {
          let conservations = this.data.conservations[chain]
          if (_.includes(conservations.conserved, seqResNum)) {
            residue.customColor = '#666666'
          } else if (_.includes(conservations.nonconserved, seqResNum)) {
            residue.customColor = '#000000'
          }
        } else {
          residue.customColor = '#999999'
        }
      }
    }
    soup.colorResidues()
  }

  setColorLegend(colorLegendWidget) {
    if (colorLegendWidget.colorEntries.length === 4) {
      colorLegendWidget.colorEntries.push({
        color: '#666666',
        label: 'conserved'
      })
      colorLegendWidget.colorEntries.push({
        color: '#000000',
        label: 'nonconserved'
      })
      colorLegendWidget.rebuild()
    }
  }

  setFullSequence(sequenceWidget) {
    let soup = sequenceWidget.soup

    sequenceWidget.charEntries.length = 0
    sequenceWidget.nChar = 0

    let pdbId = this.data.pdb_id

    let chains = this.data.pdb_chain
    for (let iChain = 0; iChain < chains.length; iChain += 1) {
      let chain = chains[iChain]
      let sequenceOfChain = this.data.sequences[iChain].sequence
      sequenceWidget.nChar += sequenceOfChain.length + sequenceWidget.nPadChar
      let seqId = this.data.sequences[iChain].primary_accession
      if (_.isNil(seqId)) {
        seqId = ''
      }

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
              startLabel = seqId + ':' + pdbId + ':' + chain
            }
            sequenceWidget.charEntries.push({
              iStructure: 0,
              chain,
              c: '',
              startLabel: startLabel,
              ss: ''
            })
          }
        }

        let c = sequenceOfChain[iResOfSeq]
        let pdbRes = this.mapSeqRes(seqId, iResOfSeq + 1, chain)
        if (_.isNil(pdbRes)) {
          // Entries of residues without PDB matches
          sequenceWidget.charEntries.push({
            iStructure: 0,
            chain,
            c: c,
            startLabel: null,
            ss: '.',
            label: seqId + ':' + (iResOfSeq + 1),
            resNum: iResOfSeq + 1
          })
        } else {
          // Entries of residues that match PDB residues
          let [pdbId, chain, pdbResNum] = pdbRes
          let residue = soup.findResidue(chain, pdbResNum)
          sequenceWidget.charEntries.push({
            chain,
            iStructure: residue.iStructure,
            c: c,
            startLabel: null,
            iRes: residue.iRes,
            ss: residue.ss,
            label: seqId + ':' + residue.resId + ':' + residue.resType,
            resNum: iResOfSeq + 1
          })
        }
      }
    }
    sequenceWidget.nChar = sequenceWidget.charEntries.length
  }

  colorFromFeatures(soup, features) {
    let residue = soup.getResidueProxy()
    for (let i = 0; i < soup.getResidueCount(); i += 1) {
      residue.iRes = i
      residue.customColor = getHexColor('#999999')
    }
    for (let feature of features) {
      let resNum = parseInt(feature.Residue)
      for (let entry of this.getPdbResColors(resNum, feature.Color)) {
        let residue = soup.findResidue(entry.chain, entry.resNum)
        if (residue.chain === entry.chain && residue.resNum === resNum) {
          residue.customColor = entry.color
        }
      }
    }
    soup.colorResidues()
  }

  setFeatureColorLegend(colorLegendWidget, features) {
    let entries = []
    for (let feature of features) {
      if (!_.find(entries, e => e.color === feature.Color)) {
        entries.push({ color: feature.Color, label: feature.Name })
      }
    }
    colorLegendWidget.colorEntries.length = 0
    for (let entry of entries) {
      colorLegendWidget.colorEntries.push(entry)
    }
    colorLegendWidget.rebuild()
  }

  setEmbedJolecule(embedJolecule) {
    embedJolecule.soupView.isUpdateObservers = true
    embedJolecule.soupView.isChanged = true
    embedJolecule.soupView.setMode('chain')
    this.colorSoup(embedJolecule.soup)
    this.setColorLegend(embedJolecule.widget.colorLegend)
    this.setFullSequence(embedJolecule.sequenceWidget)
    for (let [iChain, sequence] of this.data.sequences.entries()) {
      if (!_.isNil(sequence.primary_accession)) {
        let chain = this.data.pdb_chain[iChain]
        console.log('AlignAquara.setEmbedJolecule', chain)
        embedJolecule.controller.selectChain(0, chain)
        break
      }
    }
    if (_.isNil(embedJolecule.soupWidget.isAquariaTracking)) {
      embedJolecule.soupWidget.addObserver(this)
      embedJolecule.soupWidget.isAquariaTracking = true
      this.embedJolecule = embedJolecule
    }
  }

  update() {
    console.log(
      'AquariaAlignment.update',
      this.embedJolecule.soup.getIStructureAndChain())
  }
}

export {
  initEmbedJolecule,
  initFullPageJolecule,
  makeDataServer,
  AquariaAlignment
}
