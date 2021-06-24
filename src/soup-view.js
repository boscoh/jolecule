import _ from 'lodash'
import v3 from './v3'
import { exists, randomId } from './util.js'
import * as glgeom from './glgeom.js'
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
    let maxLength = this.soup.maxLength

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

export { SoupView, View }
