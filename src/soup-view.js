import _ from 'lodash'
import v3 from './v3'
import { randomId, exists } from './util.js'
import * as glgeom from './glgeom'
import * as THREE from 'three'

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
    this.selectedTraces = []
    this.text = 'Default view of PDB file'
    this.userId = ''
    this.pdbId = ''
    this.show = {
      sidechain: true,
      peptide: true,
      hydrogen: false,
      water: false,
      ligands: true,
      trace: true,
      backbone: false,
      ribbon: true,
      sphere: false,
      transparent: false
    }
    this.grid = {
      isElem: {},
      bCutoff: null,
      isChanged: false
    }
    this.lock = false
    this.creator = 'public'
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
    v.pdbId = this.pdbId
    v.iAtom = this.iAtom
    v.selected = this.selected
    v.selectedTraces = _.cloneDeep(this.selectedTraces)
    v.labels = _.cloneDeep(this.labels)
    v.distances = _.cloneDeep(this.distances)
    v.order = this.order
    v.text = this.text
    v.time = this.time
    v.cameraParams = _.cloneDeep(this.cameraParams)
    v.show = _.cloneDeep(this.show)
    v.grid = _.cloneDeep(this.grid)
    v.lock = this.lock
    v.creator = this.creator
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
    let cameraDir = this.cameraParams.focus
      .clone()
      .sub(this.cameraParams.position)
    let zoom = cameraDir.length()
    cameraDir.normalize()
    let pos = this.cameraParams.focus
    let inV = pos.clone().add(cameraDir)
    let upV = pos.clone().sub(this.cameraParams.up)

    let show = _.clone(this.show)
    show.all_atom = show.backbone
    delete show.backbone

    return {
      version: 2,
      view_id: this.id,
      user_id: this.userId,
      pdb_id: this.pdbId,
      order: this.order,
      show: show,
      grid: _.cloneDeep(this.grid),
      text: this.text,
      i_atom: this.iAtom,
      labels: this.labels,
      selected: this.selected,
      selected_traces: this.selectedTraces,
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
      },
      lock: this.lock,
      creator: this.creator
    }
  }

  setFromDict (flatDict) {
    this.id = flatDict.view_id
    this.pdbId = flatDict.pdb_id
    this.lock = flatDict.lock
    this.creator = flatDict.creator
    this.text = flatDict.text
    this.userId = flatDict.user_id
    this.order = flatDict.order
    this.resId = flatDict.resId
    this.iAtom = flatDict.i_atom

    this.labels = flatDict.labels
    this.selected = flatDict.selected
    this.distances = flatDict.distances

    for (let key of _.keys(flatDict.show)) {
      if (key in this.show) {
        this.show[key] = !!flatDict.show[key]
      }
      if (key === 'all_atom') {
        this.show.backbone = !!flatDict.show.all_atom
      }
    }

    if (!(this.show.backbone || this.show.trace || this.show.ribbon)) {
      this.show.ribbon = true
    }

    if (!(this.show.all_atom || this.show.trace || this.show.ribbon)) {
      this.show.backbone = true
    }

    if ('grid' in flatDict) {
      this.grid = flatDict.grid
    }

    if ('selected_traces' in flatDict) {
      this.selectedTraces = _.cloneDeep(flatDict['selected_traces'])
    }

    let pos = v3.create(
      flatDict.camera.pos[0],
      flatDict.camera.pos[1],
      flatDict.camera.pos[2]
    )

    let upV = v3.create(
      flatDict.camera.up[0],
      flatDict.camera.up[1],
      flatDict.camera.up[2]
    )

    let inV = v3.create(
      flatDict.camera.in[0],
      flatDict.camera.in[1],
      flatDict.camera.in[2]
    )

    let zoom = flatDict.camera.slab.zoom

    let focus = v3.clone(pos)

    let cameraDirection = v3
      .clone(inV)
      .sub(focus)
      .multiplyScalar(zoom)
      .negate()

    let position = v3.clone(focus).add(cameraDirection)

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

function interpolateCameras (oldCamera, futureCamera, fraction) {
  let oldCameraDirection = oldCamera.position.clone().sub(oldCamera.focus)
  let oldZoom = oldCameraDirection.length()
  oldCameraDirection.normalize()

  let futureCameraDirection = futureCamera.position
    .clone()
    .sub(futureCamera.focus)

  let futureZoom = futureCameraDirection.length()
  futureCameraDirection.normalize()

  let cameraDirRotation = glgeom.getUnitVectorRotation(
    oldCameraDirection,
    futureCameraDirection
  )

  let partialRotatedCameraUp = oldCamera.up
    .clone()
    .applyQuaternion(cameraDirRotation)

  let fullCameraUpRotation = glgeom
    .getUnitVectorRotation(partialRotatedCameraUp, futureCamera.up)
    .multiply(cameraDirRotation)
  let cameraUpRotation = glgeom.getFractionRotation(
    fullCameraUpRotation,
    fraction
  )

  let focusDisp = futureCamera.focus
    .clone()
    .sub(oldCamera.focus)
    .multiplyScalar(fraction)

  let focus = oldCamera.focus.clone().add(focusDisp)

  let zoom = glgeom.fraction(oldZoom, futureZoom, fraction)

  let focusToPosition = oldCameraDirection
    .clone()
    .applyQuaternion(cameraUpRotation)
    .multiplyScalar(zoom)

  return {
    focus: focus,
    position: focus.clone().add(focusToPosition),
    up: oldCamera.up.clone().applyQuaternion(cameraUpRotation),
    zFront: glgeom.fraction(oldCamera.zFront, futureCamera.zFront, fraction),
    zBack: glgeom.fraction(oldCamera.zBack, futureCamera.zBack, fraction),
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

    this.isChanged = true

    // indicates when sidechains need to be rebuilt
    this.isUpdateSidechain = false

    // indicates when colors need to be updated
    this.isUpdateColors = false

    // delayed flag to change rendering after
    // rotations have been done
    this.isStartTargetAfterRender = false

    // indicates when decorators/widgets need to be redrawn
    this.isUpdateObservers = true

    // stores the current cameraParams, display
    // options, distances, labels, selected
    // residues
    this.currentView = new View()

    // stores other views that can be reloaded
    this.savedViewsByViewId = {}
    this.savedViews = []
    this.iLastViewSelected = 0

    // Animation variables store here so
    // that Controller can get access to them

    // the current animation state -
    // 'none', 'loop', 'rock', 'rotate'
    this.animateState = 'none'

    // stores a target view for animation
    this.targetView = null

    // timing counter that is continually decremented
    // until it becomes negative
    this.nUpdateStep = -1

    // this is to set the time between transitions of views
    this.maxUpdateStep = 70
    this.msPerStep = 17

    this.mode = 'normal' // or 'chain'
  }

  build () {
    if (this.savedViews.length === 0 && !this.soup.isEmpty()) {
      this.setCurrentViewToDefaultAndSave()
    }
    this.saveGridToCurrentView()
  }

  getMode () {
    return this.mode
  }

  setMode (mode) {
    this.mode = mode
  }

  saveGridToCurrentView () {
    for (let elem in this.soup.grid.isElem) {
      if (elem in this.soup.grid.isElem) {
        this.currentView.grid.isElem[elem] = this.soup.grid.isElem[elem]
      }
    }
    if (exists(this.soup.grid.bCutoff)) {
      this.currentView.grid.bCutoff = this.soup.grid.bCutoff
    }
  }

  setCurrentViewToDefaultAndSave () {
    this.currentView.show.sidechain = false
    this.currentView.order = 0
    this.currentView.text = this.soup.title
    this.currentView.pdbId = this.soup.structureIds[0]
    this.currentView = this.getZoomedOutViewOfCurrentView()
    this.saveView(this.currentView)
    this.isChanged = true
  }

  setTargetView (view) {
    this.isStartTargetAfterRender = true
    this.saveTargetView = view.clone()
    this.saveTargetView.iAtom = this.soup.getIAtomAtPosition(
      view.cameraParams.focus
    )
  }

  startTargetView () {
    this.targetView = this.saveTargetView
    this.saveTargetView = null
    this.isUpdateObservers = true
    this.isStartTargetAfterRender = false
    this.isChanged = true
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
    this.isChanged = true
  }

  saveView (view) {
    this.savedViewsByViewId[view.id] = view
    this.savedViews.push(view)
  }

  getZoomedOutViewOf (atomIndices) {
    let maxLength = this.soup.calcMaxLength()

    let newView = this.currentView.clone()

    if (maxLength === 0) {
      return newView
    }

    let cameraParams = newView.cameraParams

    cameraParams.zFront = -maxLength / 2
    cameraParams.zBack = maxLength / 2
    cameraParams.zoom = Math.abs(maxLength) * 1.75

    let center = this.soup.getCenter(atomIndices)

    let look = cameraParams.position
      .clone()
      .sub(cameraParams.focus)
      .normalize()
    cameraParams.focus.copy(center)
    cameraParams.position = cameraParams.focus
      .clone()
      .add(look.multiplyScalar(cameraParams.zoom))

    newView.iAtom = this.soup.getIAtomAtPosition(center)

    newView.selectedTraces.length = 0

    return newView
  }

  getZoomedOutViewOfCurrentView () {
    let atomIndices = _.range(this.soup.getAtomCount())
    return this.getZoomedOutViewOf(atomIndices)
  }

  setTargetViewByViewId (viewId) {
    let view = this.savedViewsByViewId[viewId]
    this.iLastViewSelected = this.savedViewsByViewId[viewId].order
    this.setTargetView(view)
  }

  getTracesOfChainContainingResidue (iRes) {
    let result = []
    let residue = this.soup.getResidueProxy(iRes)
    let chain = residue.chain
    let iStructure = residue.iStructure
    for (let [iTrace, trace] of this.soup.traces.entries()) {
      residue.load(trace.indices[0])
      if (residue.chain === chain && residue.iStructure === iStructure) {
        result.push(iTrace)
      }
    }
    return result
  }

  setTargetViewByIAtom (iAtom) {
    let atom = this.soup.getAtomProxy(iAtom)
    let view = this.currentView.getViewTranslatedTo(atom.pos)
    view.iAtom = this.soup.getIAtomAtPosition(view.cameraParams.focus)
    view.selectedTraces = this.getTracesOfChainContainingResidue(atom.iRes)
    this.setTargetView(view)
  }

  getZoomedOutViewOfSelection () {
    let newView = this.currentView.clone()

    let atomIndices = []
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.load(iRes)
      if (residue.selected) {
        atomIndices.push(residue.iAtom)
      }
    }
    let center = this.soup.getCenter(atomIndices)
    let maxLength = this.soup.calcMaxLength(atomIndices)

    if (maxLength === 0) {
      return newView
    }

    let cameraParams = newView.cameraParams

    cameraParams.zFront = -maxLength / 2
    cameraParams.zBack = maxLength / 2
    cameraParams.zoom = Math.abs(maxLength) * 1.2

    let look = cameraParams.position
      .clone()
      .sub(cameraParams.focus)
      .normalize()
    cameraParams.focus.copy(center)
    cameraParams.position = cameraParams.focus
      .clone()
      .add(look.multiplyScalar(cameraParams.zoom))

    newView.iAtom = this.soup.getIAtomAtPosition(center)
    return newView
  }

  saveCurrentView () {
    let newView = this.currentView.clone()
    newView.id = randomId()
    newView.text = 'Click edit to change this text.'
    newView.pdbId = this.soup.structureIds[0]
    newView.selected = this.soup.makeSelectedResidueList()
    newView.selectedTraces = _.cloneDeep(this.soup.selectedTraces)

    let iNewView = this.iLastViewSelected + 1
    this.insertView(iNewView, newView.id, newView)
    this.setTargetViewByViewId(newView.id)
    this.isChanged = true
    this.isUpdateColors = true
    console.log('Soupview.saveCurrentView', newView)

    return newView.id
  }

  setCurrentView (view) {
    let oldViewSelected = this.currentView.selected
    this.currentView = view.clone()
    this.soup.selectedTraces = _.cloneDeep(view.selectedTraces)
    if (!_.isEqual(oldViewSelected.sort(), view.selected.sort())) {
      this.soup.clearSidechainResidues()
      this.soup.setSidechainOfResidues(view.selected, true)
      this.isUpdateSidechain = true
    }

    // use view.grid parameters to reset soup.grid
    for (let elem in view.grid.isElem) {
      if (elem in this.soup.grid.isElem) {
        if (view.grid.isElem[elem] !== this.soup.grid.isElem[elem]) {
          this.soup.grid.isElem[elem] = view.grid.isElem[elem]
          this.isUpdateObservers = true
          this.soup.grid.isChanged = true
        }
      }
    }
    if (!_.isNil(view.grid.bCutoff)) {
      if (this.soup.grid.bCutoff !== view.grid.bCutoff) {
        this.soup.grid.bCutoff = view.grid.bCutoff
        this.isUpdateObservers = true
        this.soup.grid.isChanged = true
      }
    }

    this.isChanged = true
  }

  setTargetToPrevView () {
    if (this.savedViews.length === 0) {
      return ''
    }
    this.iLastViewSelected -= 1
    if (this.iLastViewSelected < 0) {
      this.iLastViewSelected = this.savedViews.length - 1
    }
    let id = this.savedViews[this.iLastViewSelected].id
    this.setTargetViewByViewId(id)
    return id
  }

  setTargetToNextView () {
    if (this.savedViews.length === 0) {
      return ''
    }
    this.iLastViewSelected += 1
    if (this.iLastViewSelected >= this.savedViews.length) {
      this.iLastViewSelected = 0
    }
    let id = this.savedViews[this.iLastViewSelected].id
    this.setTargetViewByViewId(id)
    return id
  }

  setTargetToPrevResidue () {
    let iAtom = _.get(this.targetView, 'iAtom')
    if (exists(iAtom)) {
      iAtom = this.targetView.iAtom
    } else {
      iAtom = this.currentView.iAtom
    }
    if (iAtom < 0) {
      iAtom = 0
    }
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
    let iAtom = _.get(this.targetView, 'iAtom')
    if (exists(iAtom)) {
      iAtom = this.targetView.iAtom
    } else {
      iAtom = this.currentView.iAtom
    }
    if (iAtom < 0) {
      iAtom = 0
    }
    let iRes = this.soup.getAtomProxy(iAtom).iRes
    if (iRes >= this.soup.getResidueCount() - 1) {
      iRes = 0
    } else {
      iRes += 1
    }
    iAtom = this.soup.getResidueProxy(iRes).iAtom
    this.setTargetViewByIAtom(iAtom)
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    let cameraParams = this.currentView.cameraParams

    let y = cameraParams.up
    let z = cameraParams.position
      .clone()
      .sub(cameraParams.focus)
      .normalize()
    let x = v3
      .create()
      .crossVectors(y, z)
      .normalize()

    let rotZ = new THREE.Quaternion().setFromAxisAngle(z, zRotationAngle)

    let rotY = new THREE.Quaternion().setFromAxisAngle(y, -yRotationAngle)

    let rotX = new THREE.Quaternion().setFromAxisAngle(x, -xRotationAngle)

    let rotation = new THREE.Quaternion()
      .multiply(rotZ)
      .multiply(rotY)
      .multiply(rotX)

    let newZoom = zoomRatio * cameraParams.zoom
    if (newZoom < 2) {
      newZoom = 2
    }
    if (newZoom > 1000) {
      newZoom = 1000
    }

    let position = cameraParams.position
      .clone()
      .sub(cameraParams.focus)
      .applyQuaternion(rotation)
      .normalize()
      .multiplyScalar(newZoom)
      .add(cameraParams.focus)

    let view = this.currentView.clone()
    view.cameraParams.focus = cameraParams.focus.clone()
    view.cameraParams.position = position
    view.cameraParams.up = cameraParams.up.clone().applyQuaternion(rotation)
    view.cameraParams.zoom = newZoom

    this.setCurrentView(view)
  }

  setCurrentViewToTargetView () {
    this.setCurrentView(this.targetView)
    if (this.getMode() === 'chain') {
      this.currentView.show.transparent = true
    }
    this.targetView = null
    this.isUpdateColors = true
    this.isUpdateObservers = true
    this.isChanged = true
    this.targetView = null
  }

  /**
   * Function that goes from lowY to highY and back down to lowY in
   * a sinusoidal form between 0 and maxTime
   *
   * @param time
   * @param maxTime
   * @param highY
   * @param lowY
   * @returns {*}
   */
  scalingFunction (time, maxTime, highY, lowY) {
    return (
      ((highY - lowY) / 2) *
        (Math.sin(((2 * Math.PI) / maxTime) * time - (1 / 2) * Math.PI) + 1) +
      lowY
    )
  }

  animate (elapsedTime) {
    this.nUpdateStep -= elapsedTime / this.msPerStep
    if (this.nUpdateStep < 0) {
      if (this.targetView !== null) {
        this.setCurrentViewToTargetView()
        this.nUpdateStep = this.maxUpdateStep
      } else {
        if (this.isStartTargetAfterRender) {
          this.isChanged = true
        } else if (this.animateState === 'loop') {
          if (this.nUpdateStep < -this.maxWaitStep) {
            this.setTargetToNextView()
          }
        } else if (this.animateState === 'rotate') {
          this.adjustCamera(0.0, 0.002, 0, 1)
        } else if (this.animateState === 'rock') {
          let nStepRock = 18
          let scale = this.scalingFunction(
            -this.nUpdateStep - nStepRock,
            2 * nStepRock,
            4,
            1
          )
          let dAng = 0.001
          let ang = dAng * scale
          if (this.nUpdateStep > -nStepRock) {
            this.adjustCamera(0.0, ang, 0, 1)
          } else if (this.nUpdateStep > -3 * nStepRock) {
            this.adjustCamera(0.0, -ang, 0, 1)
          } else if (this.nUpdateStep > -4 * nStepRock) {
            this.adjustCamera(0.0, +ang, 0, 1)
          } else {
            this.nUpdateStep = 0
          }
        }
      }
    } else if (this.nUpdateStep > 0) {
      if (this.targetView != null) {
        let view = this.currentView.clone()
        let nStepToGo = this.nUpdateStep
        let scale = this.scalingFunction(nStepToGo, this.maxUpdateStep, 4, 1)
        let fraction = (1.0 / nStepToGo) * scale
        if (fraction > 1) {
          fraction = 1
        }
        view.setCamera(
          interpolateCameras(
            this.currentView.cameraParams,
            this.targetView.cameraParams,
            fraction
          )
        )
        this.setCurrentView(view)
      }
    }
  }
}

/**
 * The Controller for SoupView. All mutations
 * to a Soup and its Views go through here.
 */
class SoupViewController {
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

  async asyncLoadProteinData (proteinData, asyncSetMessageFn) {
    await this.soup.asyncLoadProteinData(proteinData, asyncSetMessageFn)
    // pre-calculations needed before building meshes
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

export { SoupView, SoupViewController }
