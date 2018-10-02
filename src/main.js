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
 * @param isView: bool - if false: creates dummy view get methods
 * @returns DataServer object
 */
function makeDataServer(
  pdbId,
  userId = null,
  isReadOnly = false,
  saveUrl = '',
  isView = true
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
      $.get(url, pdbText => {
        let result = { pdbId: pdbId, pdbText: pdbText }
        console.log('makeDataServer.getProteinData', url, result)
        callback(result)
      })
    },

    /**
     * @param callback - function that takes a list [
     *   View dictionary as defined by View.getDict()
     * ]
     */
    getViews: function(callback) {
      if (!isView) {
        callback([])
        return
      }
      let url = `${saveUrl}/pdb/${pdbId}.views.json`
      if (userId) {
        url += `?user_id=${userId}`
      }
      $.getJSON(url, views => {
        console.log('makeDataServer.getViews', url, views)
        callback(views)
      })
    },

    /**
     * @param views - list of View.dicts to be saved
     * @param callback - that is triggered on successful save
     */
    saveViews: function(views, callback) {
      if (isReadOnly) {
        callback()
        return
      }
      $.post(`${saveUrl}/save/views`, JSON.stringify(views), () => {
        console.log('makeDataServer.saveViews', '/save/views', views)
        callback()
      })
    },

    /**
     * @param viewId - Str: id of view to be deleted
     * @param callback - that is triggered on successful delete
     */
    deleteView: function(viewId, callback) {
      if (isReadOnly) {
        callback()
        return
      }
      $.post(
        `${saveUrl}/delete/view`,
        JSON.stringify({ pdbId, viewId }),
        () => {
          console.log('makeDataServer.deleteView', viewId)
          callback()
        }
      )
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
      let [pdbId, pdbChain, resNumPdbStart, dummy, resNumPdbEnd] = _.take(tokens, 5)
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
      if (
        resNum >= entry.resNumPdbStart &&
        resNum <= entry.resNumPdbEnd
      ) {
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

  getSeqToPdbMapping(seqId, chain) {
  }

  getPdbToSeqMapping(chain, seqId) {

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

  rebuildWithNewAlignment(seqId, chain) {

  }
}

export {
  initEmbedJolecule,
  initFullPageJolecule,
  makeDataServer,
  getHexColor,
  AquariaAlignment
}
