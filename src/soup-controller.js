import _ from 'lodash'
import { PdbParser } from './parsers'
import { exists } from './util'
import { View } from './soup-view'

/**
 * The Controller for SoupView. All mutations
 * to a Soup and its Views go through here.
 */
class SoupController {
  constructor (soupView) {
    this.soup = soupView.soup
    this.soupView = soupView
    this.iResLastSelected = null
  }

  deleteDistance (iDistance) {
    this.soupView.currentView.distances.splice(iDistance, 1)
    this.soupView.isChanged = true
  }

  makeDistance (iAtom1, iAtom2) {
    this.soupView.currentView.distances.push({
      i_atom1: iAtom1,
      i_atom2: iAtom2
    })
    this.soupView.isChanged = true
  }

  makeAtomLabel (iAtom, text) {
    this.soupView.currentView.labels.push({ i_atom: iAtom, text })
    this.soupView.isChanged = true
  }

  deleteAtomLabel (iLabel) {
    this.soupView.currentView.labels.splice(iLabel, 1)
    this.soupView.isChanged = true
  }

  setTargetView (view) {
    this.soupView.setTargetView(view)
  }

  setTargetViewByViewId (viewId) {
    this.soupView.setTargetViewByViewId(viewId)
  }

  setTargetViewByIAtom (iAtom) {
    this.soupView.setTargetViewByIAtom(iAtom)
  }

  setTargetToPrevResidue () {
    let iResFirst = null
    let residue = this.soup.getResidueProxy()
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      if (residue.load(iRes).selected) {
        iResFirst = iRes
        break
      }
    }
    if (iResFirst !== null) {
      if (iResFirst > 0) {
        iResFirst -= 1
      } else {
        iResFirst = this.soup.getResidueCount - 1
      }
      residue.load(iResFirst)
      this.clearSelectedResidues()
      this.setTargetViewByIAtom(residue.iAtom)
    } else {
      this.soupView.setTargetToPrevResidue()
    }
  }

  setTargetToNextResidue () {
    let iResLast = null
    let residue = this.soup.getResidueProxy()
    let nRes = this.soup.getResidueCount()
    for (let iRes = nRes - 1; iRes > 0; iRes -= 1) {
      if (residue.load(iRes).selected) {
        iResLast = iRes
        break
      }
    }
    if (iResLast !== null) {
      if (iResLast < nRes - 1) {
        iResLast += 1
      } else {
        iResLast = 0
      }
      residue.load(iResLast)
      this.clearSelectedResidues()
      this.setTargetViewByIAtom(residue.iAtom)
    } else {
      this.soupView.setTargetToNextResidue()
    }
  }

  selectPrevResidue (isClear = true) {
    let iResFirst = null
    let residue = this.soup.getResidueProxy()
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      if (residue.load(iRes).selected) {
        iResFirst = iRes
        break
      }
    }
    if (iResFirst !== null) {
      if (iResFirst > 0) {
        iResFirst -= 1
      } else {
        iResFirst = this.soup.getResidueCount - 1
      }
      if (isClear) {
        this.clearSelectedResidues()
      }
      this.selectResidue(iResFirst, true)
    } else {
      if (isClear) {
        this.clearSelectedResidues()
      }
      let iResSelect = null
      for (let iRes = this.soup.getResidueCount() - 1; iRes >= 0; iRes -= 1) {
        if (residue.load(iRes).isPolymer) {
          iResSelect = iRes
          break
        }
      }
      this.selectResidue(iResSelect, true)
    }
    this.soupView.isUpdateSidechain = true
    this.soupView.isChanged = true
  }

  selectNextResidue (isClear = true) {
    let iResLast = null
    let residue = this.soup.getResidueProxy()
    let nRes = this.soup.getResidueCount()
    for (let iRes = nRes - 1; iRes >= 0; iRes -= 1) {
      if (residue.load(iRes).selected) {
        iResLast = iRes
        break
      }
    }
    console.log('Contreoller.selectNextResidue', iResLast, isClear)
    if (iResLast !== null) {
      if (iResLast < nRes - 1) {
        iResLast += 1
      } else {
        iResLast = 0
      }
      if (isClear) {
        this.clearSelectedResidues()
      }
      this.selectResidue(iResLast, true)
    } else {
      this.clearSelectedResidues()
      let iResSelect = null
      for (let iRes = 0; iRes < nRes - 1; iRes += 1) {
        if (residue.load(iRes).isPolymer) {
          iResSelect = iRes
          break
        }
      }
      this.selectResidue(iResSelect, true)
    }
    this.soupView.isUpdateSidechain = true
    this.soupView.isChanged = true
  }

  setTargetToPrevView () {
    return this.soupView.setTargetToPrevView()
  }

  setTargetToNextView () {
    return this.soupView.setTargetToNextView()
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

  clearSidechainResidues () {
    this.soup.clearSidechainResidues()
    this.soupView.currentView.selected = this.soup.makeSelectedResidueList()
    this.soupView.isUpdateSidechain = true
    this.soupView.isChanged = true
  }

  clearSelectedResidues () {
    this.soup.clearSelectedResidues()
    this.soupView.currentView.selected = this.soup.makeSelectedResidueList()
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
  }

  setResidueSelect (iRes, val) {
    let res = this.soup.getResidueProxy(iRes)
    res.selected = val
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
  }

  showAllSidechains () {
    let res = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      res.load(iRes).sidechain = true
    }
    this.soupView.isUpdateSidechain = true
    this.soupView.isChanged = true
  }

  selectResidue (iRes, val) {
    let res = this.soup.getResidueProxy(iRes)
    if (_.isUndefined(val)) {
      val = !res.selected
    }
    // this.clearSelectedResidues()
    this.setResidueSelect(iRes, val)
    this.iResLastSelected = val ? iRes : null
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
  }

  selectAllSidechains (val) {
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      this.setResidueSelect(iRes, val)
    }
    this.iResLastSelected = null
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
  }

  selectAdditionalResidue (iRes) {
    let res = this.soup.getResidueProxy(iRes)
    let val = !res.selected
    this.setResidueSelect(iRes, val)
    this.iResLastSelected = val ? iRes : null
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
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
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
  }

  getResListOfSs (iCenterRes) {
    let res = this.soup.getResidueProxy(iCenterRes)
    let ss = res.ss
    let nRes = this.soup.getResidueCount()
    let result = []
    for (let iRes = iCenterRes; iRes >= 0; iRes -= 1) {
      res.load(iRes)
      if (res.ss !== ss) {
        break
      }
      result.push(iRes)
    }
    for (let iRes = iCenterRes + 1; iRes < nRes; iRes += 1) {
      res.load(iRes)
      if (res.ss !== ss) {
        break
      }
      result.push(iRes)
    }
    return result
  }

  selectSecondaryStructure (iCenterRes, isSelect = true) {
    this.clearSelectedResidues()
    let resList = this.getResListOfSs(iCenterRes)
    let res = this.soup.getResidueProxy(iCenterRes)
    for (let iRes of resList) {
      res.load(iRes).selected = isSelect
    }
    this.soupView.isUpdateColors = true
    this.soupView.isChanged = true
  }

  toggleSecondaryStructure (iCenterRes) {
    let resList = this.getResListOfSs(iCenterRes)
    let res = this.soup.getResidueProxy(iCenterRes)
    let isNoneSelected = _.every(
      _.map(resList, iRes => !res.load(iRes).selected)
    )
    if (isNoneSelected) {
      this.selectSecondaryStructure(iCenterRes, true)
    } else {
      this.selectSecondaryStructure(iCenterRes, false)
    }
  }

  toggleSelectedSidechains () {
    let residue = this.soup.getResidueProxy()
    let indices = []
    let nSelectedSidechain = 0
    let nShowInSelectedSidechain = 0
    let nShowSidechain = 0
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      residue.load(iRes)
      if (residue.selected) {
        nSelectedSidechain += 1
        indices.push(iRes)
        if (residue.sidechain) {
          nShowInSelectedSidechain += 1
        }
      }
      if (residue.sidechain) {
        nShowSidechain += 1
      }
    }

    if (nSelectedSidechain === 0) {
      let sidechainState = true
      if (nShowSidechain > 0) {
        sidechainState = false
      }
      for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
        residue.load(iRes)
        residue.sidechain = sidechainState
      }
    } else {
      let sideChainState = true
      if (nShowInSelectedSidechain > 0) {
        sideChainState = false
      }
      for (let iRes of indices) {
        residue.load(iRes)
        residue.sidechain = sideChainState
      }
    }

    this.soupView.isUpdateSidechain = true
    this.soupView.isChanged = true
  }

  toggleResidueNeighbors () {
    let indices = []

    let nSelected = 0
    let residue = this.soup.getResidueProxy()
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      residue.load(iRes)
      if (residue.selected) {
        indices = _.concat(indices, this.soup.getNeighbours(iRes))
        nSelected += 1
      }
    }

    if (nSelected === 0) {
      console.log('Controller.toggleResidueNeighbors none selected')
      let pos = this.soupView.currentView.cameraParams.focus
      indices = this.soup.getNeighboursOfPoint(pos)
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
    this.soupView.currentView.selected = this.soup.makeSelectedResidueList()
    this.soupView.isChanged = true
    this.soupView.isUpdateSidechain = true
  }

  saveCurrentView () {
    return this.soupView.saveCurrentView()
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

  async asyncLoadProteinData (pdbId, pdbText, asyncSetMessageFn) {
    // Check text length
    if (pdbText.length === 0) {
      await asyncSetMessageFn('Error: no soup data')
      return
    }

    // Parse into atoms and secondary structure residues
    if (asyncSetMessageFn) {
      await asyncSetMessageFn(`Parsing '${pdbId}'`)
    }
    let parser = new PdbParser(this.soup)
    parser.parsePdbData(pdbText, pdbId)

    if (parser.error) {
      await asyncSetMessageFn(`Error parsing soup: ${parser.error}`)
      return
    }

    // If not, deteremine secondary structure heuristically
    if (!parser.hasSecondaryStructure) {
      if (asyncSetMessageFn) {
        await asyncSetMessageFn(`Calculating secondary structure...`)
      }
      this.soup.findSecondaryStructure()
    }

    // Calculate bonds, ribbons etc.
    if (asyncSetMessageFn) {
      let nAtom = this.soup.getAtomCount()
      let nRes = this.soup.getResidueCount()
      await asyncSetMessageFn(
        `Calculating bonds for ${nAtom} atoms, ${nRes} residues...`
      )
    }
    this.soup.calcAtomConfiguration()

    // Build meshes
    this.soupView.build()

    this.soupView.isChanged = true
    this.soupView.isUpdateObservers = true
  }

  selectChain (iStructure, chain) {
    this.soup.selectedTraces.length = 0
    this.clearSelectedResidues()
    let iAtom = null
    for (let [iTrace, trace] of this.soup.traces.entries()) {
      let iRes = trace.indices[0]
      let residue = this.soup.getResidueProxy(iRes)
      if (residue.iStructure === iStructure && residue.chain === chain) {
        this.soup.selectedTraces.push(iTrace)
        iAtom = residue.iAtom
      }
    }
    if (!_.isNil(iAtom)) {
      this.zoomToChainContainingAtom(iAtom)
    }
  }

  setShowOption (option, bool) {
    console.log('Controller.setShowOption', option, bool)
    this.soupView.currentView.show[option] = bool
    this.soupView.isUpdateObservers = true
    this.soupView.isChanged = true
  }

  getShowOption (option) {
    return this.soupView.currentView.show[option]
  }

  toggleShowOption (option) {
    let val = this.getShowOption(option)
    this.setShowOption(option, !val)
  }

  setChangeFlag () {
    this.soupView.isChanged = true
  }

  setZoom (zBack, zFront) {
    let cameraParams = this.soupView.currentView.cameraParams
    cameraParams.zBack = zBack
    cameraParams.zFront = zFront
    this.soupView.isUpdateObservers = true
    this.soupView.isChanged = true
  }

  toggleGridElem (elem) {
    let b = this.soup.grid.isElem[elem]
    this.soup.grid.isElem[elem] = !b
    this.soup.grid.isChanged = true

    this.soupView.currentView.grid.isElem = _.cloneDeep(this.soup.grid.isElem)
    this.soupView.isChanged = true

    this.soupView.isUpdateObservers = true
    this.soupView.isUpdateColors = true
  }

  setGridCutoff (bCutoff) {
    this.soup.grid.bCutoff = bCutoff
    this.soup.grid.isChanged = true
    this.soupView.currentView.grid.bCutoff = bCutoff
    if (exists(this.soupView.targetView)) {
      this.soupView.targetView.grid.bCutoff = bCutoff
    }
    if (exists(this.soupView.saveTargetView)) {
      this.soupView.saveTargetView.grid.bCutoff = bCutoff
    }
    this.soupView.isUpdateObservers = true
    this.soupView.isChanged = true
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

  getAnimateState () {
    return this.soupView.animateState
  }

  setAnimateState (v) {
    this.soupView.animateState = v
    this.soupView.isUpdateObservers = true
    this.soupView.isChanged = true
  }

  /**
   * Currently objects involving deleted atoms but does not
   * yet renumber annotations for changed indices
   *
   * @param iStructure
   */
  deleteStructure (iStructure) {
    let atom = this.soup.getAtomProxy()
    let res = this.soup.getResidueProxy()

    let iAtomStart = null
    let iAtomEnd = null
    let iResStart = null
    let iResEnd = null
    let iTraceStart = null
    let iTraceEnd = null

    for (let iAtom = 0; iAtom < this.soup.getAtomCount(); iAtom += 1) {
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

    for (let iTrace of _.range(this.soup.traces.length)) {
      let trace = this.soup.traces[iTrace]
      for (let iRes of trace.indices) {
        if (isInInterval(iRes, iResStart, iResEnd)) {
          if (_.isNil(iTraceStart)) {
            iTraceStart = iTrace
            iTraceEnd = iTrace + 1
          } else {
            iTraceEnd = iTrace + 1
          }
        }
      }
    }

    function isInInterval (i, iStart, iEnd) {
      return i >= iStart && i < iEnd
    }

    function patchInterval (i, iStart, iEnd) {
      return i >= iEnd ? i - (iEnd - iStart) : i
    }

    function resolveView (view) {
      _.remove(
        view.selectedTraces,
        _.partial(isInInterval, iTraceStart, iTraceEnd)
      )
      view.selectedTraces = _.map(
        view.selectedTraces,
        _.partial(patchInterval, iTraceStart, iTraceEnd)
      )

      _.remove(
        view.distances,
        d =>
          isInInterval(d.i_atom1, iAtomStart, iAtomEnd) ||
          isInInterval(d.i_atom2, iAtomStart, iAtomEnd)
      )
      for (let d of view.distances) {
        d.i_atom1 = patchInterval(d.i_atom1, iAtomStart, iAtomEnd)
        d.i_atom2 = patchInterval(d.i_atom2, iAtomStart, iAtomEnd)
      }

      _.remove(view.selected, iRes => isInInterval(iRes, iResStart, iResEnd))
      view.selected = _.map(view.selected, iRes =>
        patchInterval(iRes, iResStart, iResEnd)
      )

      _.remove(view.labels, l => isInInterval(l.iAtom, iAtomStart, iAtomEnd))
      for (let l of view.labels) {
        l.iAtom = patchInterval(l.iAtom, iAtomStart, iAtomEnd)
      }
    }

    _.remove(
      this.soup.selectedTraces,
      _.partial(isInInterval, iTraceStart, iTraceEnd)
    )
    this.soup.selectedTraces = _.map(
      this.soup.selectedTraces,
      _.partial(patchInterval, iTraceStart, iTraceEnd)
    )

    resolveView(this.soupView.currentView)
    for (let view of this.soupView.savedViews) {
      resolveView(view)
    }

    let nAtomOffset = iAtomEnd - iAtomStart
    let nAtom = this.soup.getAtomCount()
    let nAtomNew = nAtom - nAtomOffset
    let nAtomCopy = nAtom - iAtomEnd

    let nResOffset = iResEnd - iResStart
    let nRes = this.soup.getResidueCount()
    let nResNew = nRes - nResOffset
    let nResCopy = nRes - iResEnd

    this.soup.atomStore.copyWithin(iAtomStart, iAtomEnd, nAtomCopy)
    this.soup.atomStore.count -= nAtomOffset

    for (let iAtom = 0; iAtom < nAtomNew; iAtom += 1) {
      atom.iAtom = iAtom
      if (atom.iRes >= iResStart) {
        atom.iRes -= nResOffset
      }
    }

    for (let iRes = 0; iRes < nResNew; iRes += 1) {
      if (iRes >= iResStart) {
        let iResOld = iRes + nResOffset
        if (iResOld in this.soup.residueNormal) {
          this.soup.residueNormal[iRes] = this.soup.residueNormal[
            iResOld
          ].clone()
        }
      }
    }

    for (let iRes = nResNew; iRes < nRes; iRes += 1) {
      delete this.soup.residueNormal[iRes]
    }

    this.soup.residueStore.copyWithin(iResStart, iResEnd, nResCopy)
    this.soup.residueStore.count -= nResOffset
    this.soup.resIds.splice(iResStart, nResOffset)

    for (let iRes = 0; iRes < nResNew; iRes += 1) {
      res.iRes = iRes
      if (res.iAtom >= iAtomStart) {
        res.iAtom -= nAtomOffset
        atom.iAtom = res.iAtom
      }
      if (this.soup.residueStore.atomOffset[iRes] >= iAtomStart) {
        this.soup.residueStore.atomOffset[iRes] -= nAtomOffset
      }
      if (res.iStructure >= iStructure) {
        res.iStructure -= 1
      }
    }

    this.soup.structureIds.splice(iStructure, 1)
    this.soup.iStructure -= 1

    this.soup.calcBondsStrategic()

    this.soup.calculateTracesForRibbons()

    if (this.soup.isEmpty()) {
      this.soupView.savedViews.length = 0
      for (let id of _.keys(this.soupView.savedViewsByViewId)) {
        delete this.soupView.savedViewsByViewId[id]
      }
      this.soupView.currentView = new View()
      this.soupView.targetView = null
      this.soupView.isStartTargetAfterRender = false
      this.soupView.nUpdateStep = -1
    } else {
      this.soupView.isUpdateSidechain = true
      this.soupView.isUpdateColors = true
    }
    this.soupView.isUpdateObservers = true
    this.soupView.isChanged = true
  }

  zoomOut () {
    if (!this.soup.isEmpty()) {
      this.setTargetView(this.soupView.getZoomedOutViewOfCurrentView())
      this.soupView.isChanged = true
    }
  }

  zoomToChainContainingAtom (iAtom) {
    let atom = this.soup.getAtomProxy(iAtom)
    let atomIndices = this.soup.getAtomsOfChainContainingResidue(atom.iRes)
    let view = this.soupView.getZoomedOutViewOf(atomIndices)
    view.selectedTraces = this.soupView.getTracesOfChainContainingResidue(
      atom.iRes
    )
    this.setTargetView(view)
  }

  zoomToSelection () {
    if (!this.soup.isEmpty()) {
      this.setTargetView(this.soupView.getZoomedOutViewOfSelection())
      this.soupView.isChanged = true
    }
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    this.soupView.adjustCamera(
      xRotationAngle,
      yRotationAngle,
      zRotationAngle,
      zoomRatio
    )
  }

  triggerAtom (iAtomHover) {
    if (_.isNil(iAtomHover)) {
      this.clearSelectedResidues()
      this.zoomOut()
    } else {
      let atom = this.soup.getAtomProxy(iAtomHover)
      let residue = this.soup.getResidueProxy(atom.iRes)
      let chain = residue.chain
      let iStructure = residue.iStructure
      let isSameChainSelected = false
      if (this.soupView.getMode() === 'chain') {
        if (this.soup.selectedTraces.length > 0) {
          let iTrace = this.soup.selectedTraces[0]
          let iRes = this.soup.traces[iTrace].indices[0]
          let residue = this.soup.getResidueProxy(iRes)
          if (residue.iStructure === iStructure && residue.chain === chain) {
            isSameChainSelected = true
          }
        }
        if (!isSameChainSelected) {
          this.clearSelectedResidues()
          this.zoomToChainContainingAtom(atom.iAtom)
          return
        }
      }
      this.clearSelectedResidues()
      this.selectResidue(atom.iRes, true)
      this.setTargetViewByIAtom(iAtomHover)
    }
    this.soupView.isUpdateColors = true
    this.soupView.isUpdateObservers = true
  }
}

export { SoupController }
