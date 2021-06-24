import _ from 'lodash'

function deleteNumbers (text) {
  return text.replace(/\d+/, '')
}

class PdbParser {
  constructor (soup) {
    this.soup = soup
    this.hasSecondaryStructure = false
    this.error = ''
  }

  parseAtomLines (pdbLines) {
    let x, y, z, chain, resType
    let atomType, bfactor, elem, alt, resNum, insCode

    for (let iLine = 0; iLine < pdbLines.length; iLine += 1) {
      let line = pdbLines[iLine]

      if (line.substr(0, 4) === 'ATOM' || line.substr(0, 6) === 'HETATM') {
        try {
          atomType = _.trim(line.substr(12, 4))
          alt = _.trim(line.substr(16, 1))
          resType = _.trim(line.substr(17, 3))
          chain = line[21]
          resNum = parseInt(line.substr(22, 4))
          insCode = line.substr(26, 1)
          x = parseFloat(line.substr(30, 7))
          y = parseFloat(line.substr(38, 7))
          z = parseFloat(line.substr(46, 7))
          bfactor = parseFloat(line.substr(60, 6))
          elem = deleteNumbers(_.trim(line.substr(76, 2)))
        } catch (e) {
          this.error = 'line ' + iLine
          console.log(`parseAtomLines: "${line}"`)
          continue
        }

        if (elem === '') {
          elem = deleteNumbers(_.trim(atomType)).substr(0, 1)
        }

        this.soup.addAtom(
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

  parseSecondaryStructureLines (pdbLines) {
    this.soup.assignResidueProperties(this.soup.iStructure)

    let residue = this.soup.getResidueProxy()

    for (let iLine = 0; iLine < pdbLines.length; iLine += 1) {
      let line = pdbLines[iLine]

      if (line.substr(0, 5) === 'HELIX') {
        this.hasSecondaryStructure = true
        let chain = line.substr(19, 1)
        let resNumStart = parseInt(line.substr(21, 4))
        let resNumEnd = parseInt(line.substr(33, 4))
        for (let iRes of this.soup.findResidueIndices(
          this.soup.iStructure,
          chain,
          resNumStart
        )) {
          residue.iRes = iRes
          while (residue.resNum <= resNumEnd && chain === residue.chain) {
            residue.ss = 'H'
            residue.iRes = residue.iRes + 1
          }
        }
      }

      if (line.substr(0, 5) === 'SHEET') {
        this.hasSecondaryStructure = true
        let chain = line.substr(21, 1)
        let resNumStart = parseInt(line.substr(22, 4))
        let resNumEnd = parseInt(line.substr(33, 4))
        for (let iRes of this.soup.findResidueIndices(
          this.soup.iStructure,
          chain,
          resNumStart
        )) {
          residue.iRes = iRes
          while (residue.resNum <= resNumEnd && chain === residue.chain) {
            residue.ss = 'E'
            residue.iRes = residue.iRes + 1
          }
        }
      }
    }
  }

  parseTitle (lines) {
    let result = ''
    for (let line of lines) {
      if (line.substring(0, 5) === 'TITLE') {
        result += line.substring(10)
      }
    }
    return result
  }

  parsePdbData (pdbText, pdbId) {
    let lines = pdbText.split(/\r?\n/)
    if (lines.length === 0) {
      this.parsingError = 'No atom lines'
      return
    }
    let title = this.parseTitle(lines)
    for (let i of _.range(lines.length)) {
      if (_.includes(['END'], lines[i].slice(0, 3))) {
        lines = lines.slice(0, i)
        break
      }
    }
    this.soup.pushStructureId(pdbId, title)
    this.parseAtomLines(lines)
    this.parseSecondaryStructureLines(lines)
  }
}

export { PdbParser }
