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
    this.user_id = ''
    this.pdb_id = ''
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
    v.pdb_id = this.pdb_id
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
      user_id: this.user_id,
      pdb_id: this.pdb_id,
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
      }
    }
  }

  setFromDict (flatDict) {
    this.id = flatDict.view_id
    this.pdb_id = flatDict.pdb_id
    this.lock = flatDict.lock
    this.text = flatDict.text
    this.user_id = flatDict.user_id
    this.order = flatDict.order
    this.res_id = flatDict.res_id
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

function interpolateCameras (oldCamera, futureCamera, t) {
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
  let cameraUpRotation = glgeom.getFractionRotation(fullCameraUpRotation, t)

  let focusDisp = futureCamera.focus
    .clone()
    .sub(oldCamera.focus)
    .multiplyScalar(t)

  let focus = oldCamera.focus.clone().add(focusDisp)

  let zoom = glgeom.fraction(oldZoom, futureZoom, t)

  let focusToPosition = oldCameraDirection
    .clone()
    .applyQuaternion(cameraUpRotation)
    .multiplyScalar(zoom)

  return {
    focus: focus,
    position: focus.clone().add(focusToPosition),
    up: oldCamera.up.clone().applyQuaternion(cameraUpRotation),
    zFront: glgeom.fraction(oldCamera.zFront, futureCamera.zFront, t),
    zBack: glgeom.fraction(oldCamera.zBack, futureCamera.zBack, t),
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
    this.isUpdateSelection = false

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
  }

  build () {
    if (this.savedViews.length === 0 && !this.soup.isEmpty()) {
      this.setCurrentViewToDefaultAndSave()
    }
    this.saveGridToCurrentView()
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
    this.currentView.pdb_id = this.soup.structureIds[0]
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

  getZoomedOutViewOfCurrentView () {
    let maxLength = this.soup.calcMaxLength()

    let newView = this.currentView.clone()

    if (maxLength === 0) {
      return newView
    }

    let cameraParams = newView.cameraParams

    cameraParams.zFront = -maxLength / 2
    cameraParams.zBack = maxLength / 2
    cameraParams.zoom = Math.abs(maxLength) * 1.75

    let atomIndices = _.range(this.soup.getAtomCount())
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
    return newView
  }

  setTargetViewByViewId (viewId) {
    let view = this.savedViewsByViewId[viewId]
    this.iLastViewSelected = this.savedViewsByViewId[viewId].order
    this.setTargetView(view)
  }

  setTargetViewByIAtom (iAtom) {
    let atom = this.soup.getAtomProxy(iAtom)
    let view = this.currentView.getViewTranslatedTo(atom.pos)
    view.iAtom = this.soup.getIAtomAtPosition(view.cameraParams.focus)
    view.selectedTraces = []
    for (let [iTrace, trace] of this.soup.traces.entries()) {
      if (_.includes(trace.indices, atom.iRes)) {
        view.selectedTraces.push(iTrace)
      }
    }
    console.log('SoupView.setTargetViewByIAtom new trace', view.selectedTraces)
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
    newView.pdb_id = this.soup.structureIds[0]
    newView.selected = this.soup.makeSelectedResidueList()
    newView.selectedTraces = _.cloneDeep(this.soup.selectedTraces)

    let iNewView = this.iLastViewSelected + 1
    this.insertView(iNewView, newView.id, newView)
    this.setTargetViewByViewId(newView.id)
    this.isChanged = true
    this.isUpdateSelection = true
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

  animate (elapsedTime) {
    this.nUpdateStep -= elapsedTime / this.msPerStep
    if (this.nUpdateStep < 0) {
      if (this.targetView !== null) {
        this.setCurrentView(this.targetView)
        this.isUpdateObservers = true
        this.isChanged = true
        this.targetView = null
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
          if (this.nUpdateStep > -nStepRock) {
            this.adjustCamera(0.0, 0.002, 0, 1)
          } else if (this.nUpdateStep > -3 * nStepRock) {
            this.adjustCamera(0.0, -0.002, 0, 1)
          } else if (this.nUpdateStep > -4 * nStepRock) {
            this.adjustCamera(0.0, +0.002, 0, 1)
          } else {
            this.nUpdateStep = 0
          }
        }
      }
    } else if (this.nUpdateStep >= 1) {
      if (this.targetView != null) {
        let view = this.currentView.clone()
        view.setCamera(
          interpolateCameras(
            this.currentView.cameraParams,
            this.targetView.cameraParams,
            1.0 / this.nUpdateStep
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
    this.soupView.setTargetToPrevResidue()
  }

  setTargetToNextResidue () {
    this.soupView.setTargetToNextResidue()
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
    this.soupView.isUpdateSelection = true
    this.soupView.isChanged = true
  }

  setResidueSelect (iRes, val) {
    let res = this.soup.getResidueProxy(iRes)
    res.selected = val
    this.soupView.isUpdateSelection = true
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
    this.clearSelectedResidues()
    this.setResidueSelect(iRes, val)
    this.iResLastSelected = val ? iRes : null
    this.soupView.isUpdateSelection = true
    this.soupView.isChanged = true
  }

  selectAdditionalResidue (iRes) {
    let res = this.soup.getResidueProxy(iRes)
    let val = !res.selected
    this.setResidueSelect(iRes, val)
    this.iResLastSelected = val ? iRes : null
    this.soupView.isUpdateSelection = true
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
    this.soupView.isUpdateSelection = true
    this.soupView.isChanged = true
  }

  toggleSelectedSidechains () {
    let residue = this.soup.getResidueProxy()
    let indices = []
    let nSidechain = 0
    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      residue.load(iRes)
      if (residue.selected) {
        indices.push(iRes)
        if (residue.sidechain) {
          nSidechain += 1
        }
      }
    }
    let isSidechain = true
    if (nSidechain === indices.length) {
      isSidechain = false
    }
    for (let iRes of indices) {
      residue.load(iRes)
      residue.sidechain = isSidechain
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

  setShowOption (option, bool) {
    console.log('Controller.setShowOption', option, bool)
    this.soupView.currentView.show[option] = bool
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
    this.soup.colorResidues()

    this.soupView.currentView.grid.isElem = _.cloneDeep(this.soup.grid.isElem)
    this.soupView.isChanged = true

    this.soupView.isUpdateObservers = true
    this.soupView.isUpdateSelection = true
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

  deleteStructure (iStructure) {
    this.soup.deleteStructure(iStructure)
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
      this.soupView.isUpdateSelection = true
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
}

export { SoupView, SoupViewController }