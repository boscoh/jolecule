const fs = require('fs')
const R = require('ramda')

function wrapJson (wrapJsFname, jsonText) {
  let wrappedText = `define(function() {
    
return ${jsonText}

});`
  fs.writeFileSync(wrapJsFname, wrappedText)
}

function wrapJsonFname (jsonFname) {
  wrapJson(
    jsonFname.replace('.json', '.json.js'),
    fs.readFileSync(jsonFname).toString()
  )
}

function isNumeric (str) {
  return /^\d+$/.test(str)
}

function makeRgbStringFromHexString (hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  var r = parseInt(result[1], 16)
  var g = parseInt(result[2], 16)
  var b = parseInt(result[3], 16)
  return `rgb(${r}, ${g}, ${b})`
}

class AquariaAlignment {

  constructor (aquariaAlignData) {
    this.data = aquariaAlignData
    this.alignEntries = []
    for (let alignStr of R.split(';', this.data.alignment)) {
      let pieces = R.split(',', alignStr)
      let tokens = R.head(pieces).split(':')
      let [pdbId, pdbChain, resNumPdbStart] = R.take(3, tokens)
      let resNumPdbEnd = R.last(tokens)
      if (R.isNil(resNumPdbStart)) {
        continue
      }
      let [seqId, resNumSeqStart, resNumSeqEnd] = R.last(pieces).split(':')
      if (seqId !== 'P04637') {
        continue
      }
      let entry = {
        pdbId,
        pdbChain,
        resNumPdbStart,
        resNumPdbEnd,
        seqId,
        resNumSeqStart,
        resNumSeqEnd
      }
      for (let key of R.keys(entry)) {
        if (isNumeric(entry[key])) {
          entry[key] = parseInt(entry[key])
        }
      }
      this.alignEntries.push(entry)
    }
  }

  getMapResNums (resNumSeq) {
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

  getPdbResColors (resNumSeq, color) {
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

  getSeqToPdbMapping(seqId, chain) {

  }

  getPdbToSeqMapping(chain, seqId) {

  }

  recolorPdb(chain, seqId) {

  }

  rebuildWithNewAlignment(seqId, chain) {

  }

}

let aquariaAlignData = require('./P04637.3q05.A.json')
let alignment = new AquariaAlignment(aquariaAlignData)

let result = []
for (let chain of R.keys(alignment.data.conservations)) {
  for (let resNum of alignment.data.conservations[chain].conserved) {
    result = R.concat(result, alignment.getPdbResColors(resNum, '#666666'))
  }
  for (let resNum of alignment.data.conservations[chain].nonconserved) {
    result = R.concat(result, alignment.getPdbResColors(resNum, '#000000'))
  }
}
wrapJson('P04637.conserve.color.json.js', JSON.stringify(result, null, 2))

const dsmpData = require('./P04637.dsmp.json')
wrapJson('P04637.dsmp.json.js', JSON.stringify(dsmpData, null, 2))


result = []
for (let feature of R.head(R.values(dsmpData)).Features) {
  let resNum = parseInt(feature.Residue)
  let color = feature.Color
  result = R.concat(result, alignment.getPdbResColors(resNum, color))
}
wrapJson('P04637.dsmp.color.json.js', JSON.stringify(result, null, 2))

