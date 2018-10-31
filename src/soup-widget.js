import _ from 'lodash'
import * as THREE from 'three'
import Signal from 'signals'

import v3 from './v3'
import * as util from './util'
import widgets from './widgets'
import * as representation from './representation'
import { registerGlobalAnimationLoop } from './animation'

import { WebglWidget } from './webgl-widget'

/**
 * Display is the main window for drawing the soup
 * in a WebGL HTML5 canvas, includes various widgets that
 * are described in widgets.js.
 *
 * Display takes a soup, and builds three.js from
 * it. Display also handles mouse input and
 * uses controller to make changes to the underlying soup
 * and their associated views
 */
class SoupWidget extends WebglWidget {
  /**
   * @param soupView - SoupView object that holds a soup and views
   * @param divTag - a selector tag for a DOM element
   * @param controller - the controller for the soupView
   * @param isGrid - flat to show autodock 3D grid control panel
   * @param backgroundColor - the background color of canvas and webgl
   */
  constructor(soupView, divTag, controller, isGrid, backgroundColor) {
    super(divTag, backgroundColor)

    this.observers = {
      rebuilt: new Signal(),
      updated: new Signal(),
      resized: new Signal()
    }

    // DataServer is needed to save views
    this.dataServer = null

    // Hooks to protein data
    this.soupView = soupView
    this.soup = soupView.soup
    this.controller = controller

    // screen atom radius
    this.atomRadius = 0.35
    this.gridAtomRadius = 1.0

    // Cross-hairs to identify centered atom
    this.buildCrossHairs()

    // popup hover box over the mouse position
    this.clickTimer = null
    this.hover = new widgets.PopupText(this.divTag, 50)
    this.iAtomHover = null

    // Docking display control
    this.isGrid = isGrid

    // Widgets that decorate the display
    // display distance measures between atoms
    this.distanceMeasuresWidget = new widgets.DistanceMeasuresWidget(this)
    // display atom labels
    this.atomLabelsWidget = new widgets.AtomLabelsWidget(this)
    // draw onscreen line for mouse dragging between atoms
    this.lineElement = new widgets.LineElement(this, '#FF7777')

    registerGlobalAnimationLoop(this)
  }

  addObserver(observer) {
    if ('update' in observer) {
      this.observers.updated.add(() => {
        observer.update()
      })
    }
    if ('rebuild' in observer) {
      this.observers.rebuilt.add(() => {
        observer.rebuild()
      })
    }
    if ('resize' in observer) {
      this.observers.resized.add(() => {
        observer.resize()
      })
    }
  }

  buildCrossHairs() {
    let radius = 2.0
    let segments = 60
    let material = new THREE.LineBasicMaterial({ color: 0xff5555 })
    let geometry = new THREE.CircleGeometry(radius, segments)

    // Remove center vertex
    geometry.vertices.shift()

    this.crossHairs = new THREE.LineLoop(geometry, material)
    this.crossHairs.dontDelete = true
    this.displayScene.add(this.crossHairs)
  }

  /**
   ******************************************
   * Handle cameraParams
   ******************************************
   */

  setTargetViewByIAtom(iAtom) {
    this.controller.setTargetViewByIAtom(iAtom)
  }

  getCameraOfCurrentView() {
    return this.soupView.currentView.cameraParams
  }

  getZ(pos) {
    let cameraParams = this.getCameraOfCurrentView()
    let cameraDir = cameraParams.focus
      .clone()
      .sub(cameraParams.position)
      .normalize()
    let posRelativeToOrigin = pos.clone().sub(cameraParams.focus)
    return posRelativeToOrigin.dot(cameraDir)
  }

  inZlab(pos) {
    let z = this.getZ(pos)
    let cameraParams = this.getCameraOfCurrentView()
    return z >= cameraParams.zFront && z <= cameraParams.zBack
  }

  opacity(pos) {
    let z = this.getZ(pos)

    let cameraParams = this.getCameraOfCurrentView()

    if (z < cameraParams.zFront) {
      return 1.0
    }

    if (z > cameraParams.zBack) {
      return 0.0
    }

    return (
      1 - (z - cameraParams.zFront) / (cameraParams.zBack - cameraParams.zFront)
    )
  }

  /**
   ******************************************
   * Draw & Animate Graphical objects
   ******************************************
   */

  updateCrossHairs() {
    let cameraParams = this.getCameraOfCurrentView()
    this.crossHairs.position.copy(cameraParams.focus)
    this.crossHairs.lookAt(cameraParams.position)
    this.crossHairs.updateMatrix()
  }

  atomLabelDialog() {
    let iAtom = this.soupView.currentView.iAtom
    if (iAtom >= 0) {
      let atom = this.soup.getAtomProxy(iAtom)
      let label = 'Label atom : ' + atom.label
      let success = text => {
        this.controller.makeAtomLabel(iAtom, text)
      }
      util.textEntryDialog(this.div, label, success)
    }
  }

  getIAtomHover() {
    let i = this.getPickColorFromMouse()
    if (i > 0 && i < this.soup.getAtomCount() + 1) {
      return i - 1
    }
    return null
  }

  updateHover() {
    this.iAtomHover = this.getIAtomHover()
    if (this.iAtomHover) {
      let atom = this.soup.getAtomProxy(this.iAtomHover)
      let label = atom.label
      let iAtom = atom.iAtom
      let pos = atom.pos.clone()
      if (atom.resType === 'XXX') {
        label += ':' + 'E=' + this.soup.grid.convertB(atom.bfactor)
      }
      let text = ''
      if (iAtom === this.soupView.getICenteredAtom()) {
        text = '<div style="text-align: center">'
        text += label
        text += '<br>[drag distances]<br>'
        text += '[double-click labels]'
        text += '</div>'
      } else {
        text = label
      }
      this.hover.html(text)
      let vector = this.getPosXY(pos)
      this.hover.move(vector.x, vector.y)
    } else {
      this.hover.hide()
    }
  }

  /**
   **********************************************************
   * Mesh-building methods
   *
   * Routines to build meshes that will be incorporated into
   * scenes, and to be used for gpu-picking.
   *
   * Meshes are stored in a dictionary: this.displayMeshes &
   * this.pickingMeshes
   **********************************************************
   */

  addRepresentation(name, repr) {
    this.representations[name] = repr
    this.displayMeshes[name] = repr.displayObj
    this.pickingMeshes[name] = repr.pickingObj
    this.updateMeshesInScene = true
  }

  buildScene() {
    // clear this.displayMeshes and this.pickingMeshes
    for (let key of _.keys(this.displayMeshes)) {
      _.unset(this.displayMeshes, key)
    }
    for (let key of _.keys(this.pickingMeshes)) {
      _.unset(this.pickingMeshes, key)
    }

    this.addRepresentation(
      'transparentRibbon',
      new representation.CartoonRepresentation(this.soup, true)
    )
    this.addRepresentation(
      'ribbon',
      new representation.CartoonRepresentation(
        this.soup,
        false,
        this.soup.selectedTraces
      )
    )
    this.addRepresentation(
      'ligand',
      new representation.LigandRepresentation(this.soup, this.atomRadius)
    )
    if (this.isGrid) {
      this.addRepresentation(
        'grid',
        new representation.GridRepresentation(this.soup, this.gridAtomRadius)
      )
    }
    this.addRepresentation(
      'sidechain',
      new representation.SidechainRepresentation(this.soup, this.atomRadius)
    )

    this.rebuildSceneFromMeshes()

    this.observers.rebuilt.dispatch()

    this.soupView.isChanged = true
    this.soupView.isUpdateObservers = true
  }

  deleteStructure(iStructure) {
    this.controller.deleteStructure(iStructure)
    this.buildScene()
    this.observers.rebuilt.dispatch()
  }

  /**
   ********************************************
   * Main event loop methods
   ********************************************
   */

  /**
   * Status function to work with registerAnimation Loop
   * @returns Boolean
   */
  isChanged() {
    return this.soupView.isChanged
  }

  drawFrame() {
    if (!this.isChanged()) {
      return
    }

    let isNoMoreChanges =
      !this.soupView.soup.grid.isChanged &&
      !this.soupView.isUpdateSidechain &&
      !this.soupView.isUpdateColors

    if (this.soupView.isStartTargetAfterRender) {
      // set target only AFTER all changes have been applied in previous tick
      if (isNoMoreChanges) {
        this.soupView.startTargetView()
        this.soupView.nUpdateStep = this.soupView.maxUpdateStep
      }
    }

    this.updateMeshesInScene = false

    let isNewTrigger = (meshName, visible) => {
      return visible && !(meshName in this.displayMeshes)
    }

    let show = this.soupView.currentView.show

    if (isNewTrigger('water', show.water)) {
      this.addRepresentation(
        'water',
        new representation.WaterRepresentation(this.soup, this.atomRadius)
      )
    }

    if (isNewTrigger('backbone', show.backbone)) {
      this.addRepresentation(
        'backbone',
        new representation.BackboneRepresentation(this.soup, this.atomRadius)
      )
    }

    if (isNewTrigger('sphere', show.sphere)) {
      this.addRepresentation(
        'sphere',
        new representation.SphereRepresentation(this.soup)
      )
    }

    this.setMeshVisible('ribbon', show.ribbon)
    this.setMeshVisible('transparentRibbon', show.ribbon && show.transparent)
    this.setMeshVisible('water', show.water)
    this.setMeshVisible('backbone', show.backbone)
    this.setMeshVisible('ligand', show.ligands)
    this.setMeshVisible('sphere', show.sphere)

    if (show.transparent) {
      if (
        !_.isEqual(
          this.soup.selectedTraces,
          this.representations.ribbon.selectedTraces
        )
      ) {
        console.log(
          'SoupWidget.drawFrame new soup.selectedTraces',
          this.soup.selectedTraces
        )
        this.representations.ribbon.selectedTraces = _.cloneDeep(this.soup.selectedTraces)
        this.representations.ribbon.build()
        this.updateMeshesInScene = true
      }
    } else {
      if (
        this.representations.ribbon &&
        this.representations.ribbon.selectedTraces.length > 0
      ) {
        this.representations.ribbon.selectedTraces.length = 0
        this.representations.ribbon.build()
        this.updateMeshesInScene = true
      }
    }

    if (this.isGrid) {
      if (this.soupView.soup.grid.isChanged) {
        if (!_.isUndefined(this.representations.grid)) {
          this.soup.colorResidues()
          this.representations.grid.build()
        }
        this.soupView.soup.grid.isChanged = false
      }
    } else {
      this.soupView.soup.grid.isChanged = false
    }

    if (this.soupView.isUpdateSidechain) {
      this.representations.sidechain.build()
      this.soupView.isUpdateSidechain = false
      this.updateMeshesInScene = true
    }

    if (this.soupView.isUpdateColors) {
      for (let repr of _.values(this.representations)) {
        if ('recolor' in repr) {
          repr.recolor()
        }
      }
      this.soupView.isUpdateColors = false
      this.soupView.isUpdateObservers = true
    }

    if (this.updateMeshesInScene) {
      this.rebuildSceneFromMeshes()
    }

    this.updateCrossHairs()

    this.setCameraParams(this.getCameraOfCurrentView())

    // needs to be observers.updated before render
    // as lines must be placed in THREE.js scene
    this.distanceMeasuresWidget.drawFrame()

    this.render()

    if (this.soupView.isUpdateObservers) {
      this.observers.updated.dispatch()
      this.soupView.isUpdateObservers = false
    }

    // needs to be observers.updated after render
    this.atomLabelsWidget.drawFrame()

    this.soupView.isChanged = false
  }

  animate(elapsedTime) {
    this.soupView.animate(elapsedTime)
    this.updateHover()
  }

  /**
   ********************************************
   * Standard DOM methods
   ********************************************
   */

  resize() {
    this.observers.resized.dispatch()
    super.resize()
    this.soupView.isUpdateObservers = true
    this.controller.setChangeFlag()
  }

  doubleclick(event) {
    if (this.iAtomHover !== null) {
      if (this.iAtomHover === this.soupView.getICenteredAtom()) {
        this.atomLabelDialog()
      } else {
        this.controller.triggerAtom(this.iAtomHover)
      }
      this.isDraggingCentralAtom = false
    } else {
      this.controller.triggerAtom()
    }
    this.iAtomPressed = null
    this.iResClick = null
  }

  click(event) {
    if (util.exists(this.iResClick)) {
      if (!event.metaKey && !event.shiftKey) {
        this.controller.selectResidue(this.iResClick)
      } else if (event.shiftKey) {
        this.controller.selectAdditionalRangeToResidue(this.iResClick)
      } else {
        this.controller.selectAdditionalResidue(this.iResClick)
      }
    }
    this.iAtomPressed = null
    this.iResClick = null
    this.clickTimer = null
    this.timePressed = null
  }

  mousedown(event) {
    if (this.isGesture) {
      return
    }
    console.log('WebglWidget.mousedown')

    event.preventDefault()

    this.getPointer(event)
    this.updateHover()
    this.iAtomPressed = this.iAtomHover
    this.iResClick = this.soup.getAtomProxy(this.iAtomPressed).iRes

    if (this.iAtomPressed === this.soupView.getICenteredAtom()) {
      this.isDraggingCentralAtom = this.iAtomPressed !== null
    }

    let now = new Date().getTime()
    let elapsedTime = this.timePressed ? now - this.timePressed : 0

    if (_.isNil(this.clickTimer)) {
      this.clickTimer = setTimeout(() => this.click(event), 250)
    } else if (elapsedTime < 600) {
      clearTimeout(this.clickTimer)
      this.doubleclick(event)
      this.clickTimer = null
    }

    this.getPointer(event)
    this.savePointer()
    this.timePressed = new Date().getTime()
    this.pointerPressed = true
  }

  mousemove(event) {
    event.preventDefault()
    if (this.isGesture) {
      return
    }
    console.log('WebglWidget.mousemove')

    this.getPointer(event)

    this.updateHover()

    if (this.isDraggingCentralAtom) {
      let pos = this.soup.getAtomProxy(this.soupView.getICenteredAtom()).pos
      let v = this.getPosXY(pos)
      this.lineElement.move(
        this.mouseX + this.x(),
        this.mouseY + this.y(),
        v.x,
        v.y
      )
    } else {
      let shiftDown = event.shiftKey === 1

      let rightMouse = event.button === 2 || event.which === 3

      if (this.pointerPressed) {
        let zoomRatio = 1.0
        let zRotationAngle = 0
        let yRotationAngle = 0
        let xRotationAngle = 0

        if (rightMouse || shiftDown) {
          zRotationAngle = this.mouseT - this.saveMouseT

          if (this.mouseR > 0.0) {
            zoomRatio = this.saveMouseR / this.mouseR
          }
        } else {
          yRotationAngle = v3.degToRad(this.mouseX - this.saveMouseX)
          xRotationAngle = v3.degToRad(this.mouseY - this.saveMouseY)
        }

        this.controller.adjustCamera(
          xRotationAngle,
          yRotationAngle,
          zRotationAngle,
          zoomRatio
        )

        this.savePointer()
      }
    }
  }

  mouseout(event) {
    this.hover.hide()
    this.pointerPressed = false
  }

  mouseup(event) {
    this.getPointer(event)

    event.preventDefault()

    if (this.isDraggingCentralAtom) {
      if (this.iAtomHover !== null) {
        let iAtomCentre = this.soupView.getICenteredAtom()
        if (this.iAtomHover !== iAtomCentre) {
          this.controller.makeDistance(this.iAtomHover, iAtomCentre)
        }
      }
      this.lineElement.hide()
      this.isDraggingCentralAtom = false
    }

    if (util.exists(event.touches)) {
      this.hover.hide()
    }

    this.pointerPressed = false
  }

  mousewheel(event) {
    if (this.isGesture) {
      return
    }

    event.preventDefault()

    let wheel
    if (util.exists(event.wheelDelta)) {
      wheel = event.wheelDelta / 120
    } else {
      // for Firefox
      wheel = -event.detail / 12
    }

    // converted from pinch-zoom on mac
    if (event.ctrlKey) {
      wheel /= 10
      wheel *= -1
    }

    let zoom = Math.pow(1 + Math.abs(wheel) / 2, wheel > 0 ? 1 : -1)

    this.controller.adjustCamera(0, 0, 0, zoom)
  }

  gesturestart(event) {
    event.preventDefault()
    console.log('WebglWidget.gesturestart')
    this.isGesture = true
    this.lastPinchRotation = 0
    this.lastScale = event.scale * event.scale
  }

  gesturechange(event) {
    event.preventDefault()
    this.controller.adjustCamera(
      0,
      0,
      v3.degToRad(event.rotation * 2 - this.lastPinchRotation),
      this.lastScale / (event.scale * event.scale)
    )
    this.lastPinchRotation = event.rotation * 2
    this.lastScale = event.scale * event.scale
  }

  gestureend(event) {
    event.preventDefault()
    this.isGesture = false
    this.iAtomPressed = null
    this.iResClick = null
    if (this.clickTimer !== null) {
      clearTimeout(this.clickTimer)
      this.clickTimer = null
    }
    this.pointerPressed = false
  }
}

export { SoupWidget }
