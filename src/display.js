import $ from 'jquery'
import _ from 'lodash'
import v3 from './v3'

import * as THREE from 'three'
import * as glgeom from './glgeom'
import * as util from './util'
import widgets from './widgets'
import * as data from './data'
import { interpolateCameras } from './soup'

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
class Display {

  /**
   * @param soupView - SoupView object that holds a soup and views
   * @param divTag - a selector tag for a DOM element
   * @param controller - the controller for the soupView
   * @param isGrid - flat to show autodock 3D grid control panel
   * @param backgroundColor - the background color of canvas and webgl
   */
  constructor (soupView, divTag, controller, isGrid, backgroundColor) {

    this.divTag = divTag
    this.div = $(this.divTag)
    this.div.css('overflow', 'hidden')

    this.backgroundColor = backgroundColor
    this.div.css('background-color', this.backgroundColor)

    // input control parameters
    this.saveMouseX = null
    this.saveMouseY = null
    this.saveMouseR = null
    this.saveMouseT = null
    this.mouseX = null
    this.mouseY = null
    this.mouseR = null
    this.mouseT = null
    this.mousePressed = false

    // WebGL related properties

    // div to instantiate WebGL renderer
    this.webglDivId = this.div.attr('id') + '-canvas-wrapper'
    this.webglDiv = $('<div>')
      .attr('id', this.webglDivId)
      .css('overflow', 'hidden')
      .css('z-index', '0')
      .css('background-color', '#CCC')
      .css('position', 'absolute')
    this.webglDiv.contextmenu(() => false)
    this.div.append(this.webglDiv)

    // Params that will be used to set the camera below
    this.cameraParams = {
      focus: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(0, 0, -1),
      up: new THREE.Vector3(0, 1, 0),
      // clipping planes relative to focus
      zFront: -40,
      zBack: 20,
      // distance of focus from position
      zoom: 1.0
    }

    // a THREE.js camera, will be set properly before draw
    this.camera = new THREE.PerspectiveCamera(
      45, this.width() / this.height())

    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color(this.backgroundColor)
    this.displayScene.fog = new THREE.Fog(this.backgroundColor, 1, 100)

    // this.displayMeshes is a dictionary that holds THREE.Object3D
    // collections of meshes. This allows collections to be collectively
    // turned on and off. The meshes will be regenerated into this.displayScene
    // if the underlying data changes. The convenience function
    // will send geometries into the displayMeshes, using this.displayMaterial
    // as the default. This assumes vertexColors are used, allowing multiple
    // colors within the same geometry.
    this.displayMeshes = {}
    this.displayMaterial = new THREE.MeshLambertMaterial(
      {vertexColors: THREE.VertexColors})

    this.pickingScene = new THREE.Scene()
    this.pickingTexture = new THREE.WebGLRenderTarget(this.width(), this.height())
    this.pickingTexture.texture.minFilter = THREE.LinearFilter

    this.pickingMeshes = {}
    this.pickingMaterial = new THREE.MeshBasicMaterial(
      {vertexColors: THREE.VertexColors})

    this.lights = []
    this.buildLights()

    // Hooks to protein data
    this.soupView = soupView
    this.soup = soupView.soup
    this.controller = controller
    this.nDataServer = 0
    // stores trace of protein/nucleotide backbones for ribbons
    this.traces = []
    // screen atom radius
    this.atomRadius = 0.35

    // Cross-hairs to identify centered atom
    this.buildCrossHairs()

    // div to display processing messages
    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .addClass('jolecule-loading-message')
    this.setMesssage('Loading data...')

    // Widgets that decorate the display

    // popup hover box over the mouse position
    this.hover = new widgets.PopupText(this.divTag, 'lightblue')

    // Sequence bar of protein at top of embedded window
    this.sequenceWidget = new widgets.SequenceWidget(this)

    // Clipping plane control bar to the right
    this.zSlabWidget = new widgets.ZSlabWidget(this)

    // Docking display control
    this.isGrid = isGrid
    this.gridControlWidget = new widgets.GridControlWidget(this)

    // display distance measures between atoms
    this.distanceWidget = new widgets.DistanceMeasuresWidget(this)

    // display atom labels
    this.labelWidget = new widgets.AtomLabelsWidget(this)

    // draw onscreen line for mouse dragging between atoms
    this.lineElement = new widgets.LineElement(this, '#FF7777')

  }

  initWebglRenderer () {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setClearColor(this.backgroundColor)
    this.renderer.setSize(this.width(), this.height())

    let dom = this.renderer.domElement
    this.webglDiv[0].appendChild(dom)

    const bind = (w, fn) => { dom.addEventListener(w, fn) }
    bind('mousedown', e => this.mousedown(e))
    bind('mousemove', e => this.mousemove(e))
    bind('mouseup', e => this.mouseup(e))
    bind('mousewheel', e => this.mousewheel(e))
    bind('DOMMouseScroll', e => this.mousewheel(e))
    bind('touchstart', e => this.mousedown(e))
    bind('touchmove', e => this.mousemove(e))
    bind('touchend', e => this.mouseup(e))
    bind('touchcancel', e => this.mouseup(e))
    bind('gesturestart', e => this.gesturestart(e))
    bind('gesturechange', e => this.gesturechange(e))
    bind('gestureend', e => this.gestureend(e))
  }

  setMesssage (message) {
    console.log('Display.setProcessingMessage:', message)
    this.messageDiv.html(message).show()
    util.stickJqueryDivInTopLeft(this.div, this.messageDiv, 100, 90)
  };

  async asyncSetMesssage (message) {
    this.setMesssage(message)
    await util.delay(0)
  };

  cleanupMessage () {
    this.messageDiv.hide()
  };

  calculateTracesForRibbons () {
    this.traces.length = 0

    let lastTrace

    let residue = this.soup.getResidueProxy()
    let atom = this.soup.getAtomProxy()

    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      residue.iRes = iRes
      if (residue.isPolymer) {
        if ((iRes === 0) || !residue.isConnectedToPrev()) {
          let newTrace = new glgeom.Trace()
          newTrace.getReference = i => {
            residue.iRes = newTrace.indices[i]
            return residue
          }
          this.traces.push(newTrace)
          lastTrace = newTrace
        }
        lastTrace.indices.push(iRes)

        atom.iAtom = residue.iAtom
        lastTrace.points.push(atom.pos.clone())

        let normal = residue.normal
        lastTrace.normals.push(normal)
      }
    }

    for (let trace of this.traces) {
      trace.calcTangents()
      trace.calcNormals()
      trace.calcBinormals()
      trace.expand()
    }

  }

  buildLights () {
    let directedLight = new THREE.DirectionalLight(0xFFFFFF)
    directedLight.position.copy(
      v3.create(0.2, 0.2, -100).normalize())
    directedLight.dontDelete = true
    this.lights.push(directedLight)

    let ambientLight = new THREE.AmbientLight(0x202020)
    ambientLight.dontDelete = true
    this.lights.push(ambientLight)

    for (let i = 0; i < this.lights.length; i += 1) {
      this.displayScene.add(this.lights[i])
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

  buildScene () {

    if (this.soupView.savedViews.length == 0) {
      this.soupView.currentView.makeDefaultOfSoup(this.soup)
      this.soupView.saveView(this.soupView.currentView)
      this.soupView.changed = true
    }

    // pre-calculations needed before building meshes
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      residue.color = data.getSsColor(residue.ss)
    }
    this.soup.findGridLimits()
    this.calculateTracesForRibbons()

    this.buildMeshOfRibbons()
    this.buildMeshOfGrid()
    this.buildMeshOfLigands()
    this.buildMeshOfNucleotides()
    this.buildMeshOfArrows()

    this.rebuildSceneWithMeshes()

    this.sequenceWidget.reset()
    this.gridControlWidget.reset()

    this.soupView.updateView = true
  }

  /**
   * Clears/creates a mesh entry in the mesh collection
   * @param meshName - the name for a mesh collection
   */
  createOrClearMesh (meshName) {
    if (!(meshName in this.displayMeshes)) {
      this.displayMeshes[meshName] = new THREE.Object3D()
    } else {
      glgeom.clearObject3D(this.displayMeshes[meshName])
    }
    if (!(meshName in this.pickingMeshes)) {
      this.pickingMeshes[meshName] = new THREE.Object3D()
    } else {
      glgeom.clearObject3D(this.pickingMeshes[meshName])
    }
  }

  /**
   * Rebuild soupView from meshes in this.displayMeshes &
   * this.pickingMeshes
   */
  rebuildSceneWithMeshes () {
    glgeom.clearObject3D(this.displayScene)
    glgeom.clearObject3D(this.pickingScene)
    for (let mesh of _.values(this.displayMeshes)) {
      if (mesh.children.length > 0) {
        this.displayScene.add(mesh)
      }
    }
    for (let mesh of _.values(this.pickingMeshes)) {
      if (mesh.children.length > 0) {
        this.pickingScene.add(mesh)
      }
    }
  }

  /**
   * Sets the visibility of a mesh this.displayMeshes & this.pickingMeshes.
   * If it does not exist, create it, and look for the corresponding method
   * to build the mesh this.build<CaptializaedMeshName>
   *
   * @param meshName
   * @param visible
   */
  setMeshVisible (meshName, visible) {
    if (visible) {
      if (!(meshName in this.displayMeshes)) {
        let buildMeshOfFunctionName = 'buildMeshOf' + _.capitalize(meshName)

        console.log('Display.' + buildMeshOfFunctionName)
        this[buildMeshOfFunctionName]()

        this.updateMeshesInScene = true
      }
    }
    if (meshName in this.displayMeshes) {
      glgeom.setVisible(this.displayMeshes[meshName], visible)
    }
    if (meshName in this.pickingMeshes) {
      glgeom.setVisible(this.pickingMeshes[meshName], visible)
    }
  }

  addGeomToDisplayMesh (meshName, geom, i) {
    if (geom.vertices.length === 0) {
      return
    }
    let mesh = new THREE.Mesh(geom, this.displayMaterial)
    if (!_.isUndefined(i)) {
      mesh.i = i
    }
    this.displayMeshes[meshName].add(mesh)
  }

  addGeomToPickingMesh (meshName, geom, i) {
    if (geom.vertices.length === 0) {
      return
    }
    let mesh = new THREE.Mesh(geom, this.pickingMaterial)
    if (!_.isUndefined(i)) {
      mesh.i = i
    }
    this.pickingMeshes[meshName].add(mesh)
  }

  buildMeshOfRibbons () {
    this.createOrClearMesh('ribbons')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReference(i)
        let face = data.getSsFace(res.ss)
        let color = res.color
        let iAtom = res.iAtom
        let isRound = res.ss === 'C'
        let isFront = ((i === 0) ||
          (res.ss !== trace.getReference(i - 1).ss))
        let isBack = ((i === n - 1) ||
          (res.ss !== trace.getReference(i + 1).ss))
        let resGeom = trace.getSegmentGeometry(
          i, face, isRound, isFront, isBack, color)
        displayGeom.merge(resGeom)
        glgeom.setGeometryVerticesColor(resGeom, data.getIndexColor(iAtom))
        pickingGeom.merge(resGeom)
      }
    }
    this.addGeomToDisplayMesh('ribbons', displayGeom)
    this.addGeomToPickingMesh('ribbons', pickingGeom)
  }

  buildMeshOfArrows () {
    this.createOrClearMesh('arrows')

    let geom = new THREE.Geometry()
    let blockArrowGeometry = new glgeom.BlockArrowGeometry()
    blockArrowGeometry.computeFaceNormals()

    let obj = new THREE.Object3D()

    for (let trace of this.traces) {
      for (let i of _.range(trace.points.length)) {
        let point = trace.points[i]
        let tangent = trace.tangents[i]
        let normal = trace.binormals[i]
        let target = point.clone().add(tangent)

        let res = trace.getReference(i)
        let color = data.getDarkSsColor(res.ss)
        glgeom.setGeometryVerticesColor(blockArrowGeometry, color)

        obj.matrix.identity()
        obj.position.copy(point)
        obj.up.copy(normal)
        obj.lookAt(target)
        obj.updateMatrix()

        geom.merge(blockArrowGeometry, obj.matrix)
      }
    }

    this.addGeomToDisplayMesh('arrows', geom)
  }

  buildMeshOfTube () {
    this.createOrClearMesh('tube')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReference(i)
        let color = res.color
        let iAtom = res.iAtom
        let isRound = true
        let isFront = (i === 0)
        let isBack = (i === n - 1)
        let resGeom = trace.getSegmentGeometry(
          i, data.fatCoilFace, isRound, isFront, isBack, color)
        displayGeom.merge(resGeom)
        glgeom.setGeometryVerticesColor(
          resGeom, new THREE.Color().setHex(iAtom))
        glgeom.setGeometryVerticesColor(resGeom, data.getIndexColor(iAtom))
        pickingGeom.merge(resGeom)
      }
    }
    this.addGeomToPickingMesh('tube', pickingGeom)
    this.addGeomToDisplayMesh('tube', displayGeom)
  }

  buildAtomMeshes (atomIndices, meshName) {
    if (atomIndices.length === 0) {
      return
    }
    let nCopy = atomIndices.length
    let sphereBufferGeometry = new THREE.SphereBufferGeometry(1, 8, 8)
    let displayGeom = new glgeom.CopyBufferGeometry(sphereBufferGeometry, nCopy)
    let pickingGeom = new glgeom.CopyBufferGeometry(sphereBufferGeometry, nCopy)

    let atom = this.soup.getAtomProxy()
    for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
      let iAtom = atomIndices[iCopy]
      atom.iAtom = iAtom
      let matrix = glgeom.getSphereMatrix(atom.pos, this.atomRadius)
      displayGeom.applyMatrixToCopy(matrix, iCopy)
      pickingGeom.applyMatrixToCopy(matrix, iCopy)
      displayGeom.applyColorToCopy(atom.color, iCopy)
      pickingGeom.applyColorToCopy(data.getIndexColor(iAtom), iCopy)
    }

    let displayMesh = new THREE.Mesh(displayGeom, this.displayMaterial)
    this.displayMeshes[meshName].add(displayMesh)

    let pickingMesh = new THREE.Mesh(pickingGeom, this.pickingMaterial)
    this.pickingMeshes[meshName].add(pickingMesh)
  }

  buildBondMeshes (bondIndices, meshName) {
    if (bondIndices.length === 0) {
      return
    }
    let nCopy = bondIndices.length

    let cylinderBufferGeometry = new THREE.CylinderBufferGeometry(1, 1, 1, 4, 1, false)
    cylinderBufferGeometry.applyMatrix(
      new THREE.Matrix4()
        .makeRotationFromEuler(
          new THREE.Euler(Math.PI / 2, Math.PI, 0)))

    let displayGeom = new glgeom.CopyBufferGeometry(cylinderBufferGeometry, nCopy)

    let atom1 = this.soup.getAtomProxy()
    let atom2 = this.soup.getAtomProxy()
    let bond = this.soup.getBondProxy()
    let residue = this.soup.getResidueProxy()

    for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
      let iBond = bondIndices[iCopy]

      bond.iBond = iBond
      atom1.iAtom = bond.iAtom1
      atom2.iAtom = bond.iAtom2
      residue.iRes = atom1.iRes

      let p1 = atom1.pos.clone()
      let p2 = atom2.pos.clone()

      if (atom1.iRes !== atom2.iRes) {
        let midpoint = p2.clone().add(p1).multiplyScalar(0.5)
        if (atom1.iRes === residue.iRes) {
          p2 = midpoint
        } else if (atom2.iRes === residue.iRes) {
          p1 = midpoint
        }
      }

      let matrix = glgeom.getCylinderMatrix(p1, p2, 0.2)

      displayGeom.applyMatrixToCopy(matrix, iCopy)
      displayGeom.applyColorToCopy(residue.color, iCopy)
    }

    let displayMesh = new THREE.Mesh(displayGeom, this.displayMaterial)
    this.displayMeshes[meshName].add(displayMesh)
  }

  buildSelectedResidues (showAllResidues) {
    this.createOrClearMesh('sidechains')

    let atomIndices = []
    let bondIndices = []

    let atom = this.soup.getAtomProxy()
    let residue = this.soup.getResidueProxy()

    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (!residue.isPolymer) {
        continue
      }
      let residueShow = showAllResidues || residue.selected
      if (!residueShow) {
        continue
      }
      for (let iAtom of residue.getAtomIndices()) {
        atom.iAtom = iAtom
        if (!util.inArray(atom.atomType, data.backboneAtomTypes)) {
          atomIndices.push(iAtom)
          for (let iBond of atom.getBondIndices()) {
            bondIndices.push(iBond)
          }
        }
      }
    }
    this.buildAtomMeshes(atomIndices, 'sidechains')
    this.buildBondMeshes(bondIndices, 'sidechains')
  }

  buildMeshOfBackbone () {
    this.createOrClearMesh('backbone')

    let atomIndices = []
    let bondIndices = []

    let atom = this.soup.getAtomProxy()
    let residue = this.soup.getResidueProxy()

    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (!residue.isPolymer) {
        continue
      }
      for (let iAtom of residue.getAtomIndices()) {
        atom.iAtom = iAtom
        if (util.inArray(atom.atomType, data.backboneAtomTypes)) {
          atomIndices.push(iAtom)
          for (let iBond of atom.getBondIndices()) {
            bondIndices.push(iBond)
          }
        }
      }
    }
    this.buildAtomMeshes(atomIndices, 'backbone')
    this.buildBondMeshes(bondIndices, 'backbone')
  }

  buildMeshOfLigands () {
    this.createOrClearMesh('ligands')
    let atomIndices = []
    let bondIndices = []

    let atom = this.soup.getAtomProxy()
    let residue = this.soup.getResidueProxy()

    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss !== '-') {
        continue
      }
      for (let iAtom of residue.getAtomIndices()) {
        atom.iAtom = iAtom
        atomIndices.push(iAtom)
        for (let iBond of atom.getBondIndices()) {
          bondIndices.push(iBond)
        }
      }
    }
    this.buildAtomMeshes(atomIndices, 'ligands')
    this.buildBondMeshes(bondIndices, 'ligands')
  }

  buildMeshOfWater () {
    this.createOrClearMesh('water')
    let atomIndices = []
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.resType === 'HOH') {
        atomIndices.push(residue.iAtom)
      }
    }
    this.buildAtomMeshes(atomIndices, 'water')
  }

  buildMeshOfGrid () {
    if (!this.gridControlWidget.isGrid) {
      return
    }
    this.createOrClearMesh('grid')

    let grid = this.soupView.soup.grid

    let atomIndices = []
    let residue = this.soup.getResidueProxy()
    let atom = this.soup.getAtomProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss === 'G') {
        atom.iAtom = residue.iAtom
        if ((atom.bfactor > grid.bCutoff) && grid.isElem[atom.elem]) {
          atomIndices.push(atom.iAtom)
        }
      }
    }
    this.buildAtomMeshes(atomIndices, 'grid')
  }

  buildMeshOfNucleotides () {
    this.createOrClearMesh('basepairs')

    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()

    let cylinderGeom = new glgeom.UnitCylinderGeometry()

    let residue = this.soup.getResidueProxy()
    let atom = this.soup.getAtomProxy()

    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss !== 'D' || !residue.isPolymer) {
        continue
      }

      let basepairGeom = new THREE.Geometry()

      let atomTypes, bondTypes
      if (residue.resType === 'DA' || residue.resType === 'A') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']]
      } else if (residue.resType === 'DG' || residue.resType === 'G') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']]
      } else if (residue.resType === 'DT' || residue.resType === 'U') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']]
      } else if (residue.resType === 'DC' || residue.resType === 'C') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']]
      } else {
        continue
      }

      let getVerticesFromAtomDict = (iRes, atomTypes) => {
        residue.iRes = iRes
        return _.map(atomTypes, a => {
          atom.iAtom = residue.getIAtom(a)
          return atom.pos.clone()
        })
      }

      let vertices = getVerticesFromAtomDict(iRes, atomTypes)
      let faceGeom = new glgeom.RaisedShapeGeometry(vertices, 0.2)
      basepairGeom.merge(faceGeom)

      for (let bond of bondTypes) {
        let vertices = getVerticesFromAtomDict(iRes, [bond[0], bond[1]])
        basepairGeom.merge(
          cylinderGeom, glgeom.getCylinderMatrix(vertices[0], vertices[1], 0.2))
      }

      // explicitly set to zero-length array as RaisedShapeGeometry
      // sets no uv but cylinder does, and the merged geometry causes
      // warnings in THREE.js v0.79
      basepairGeom.faceVertexUvs = [new Array()]

      glgeom.setGeometryVerticesColor(
        basepairGeom, residue.color)
      displayGeom.merge(basepairGeom)

      glgeom.setGeometryVerticesColor(
        basepairGeom, data.getIndexColor(residue.iAtom))
      pickingGeom.merge(basepairGeom)
    }

    this.addGeomToDisplayMesh('basepairs', displayGeom)
    this.addGeomToPickingMesh('basepairs', pickingGeom)
  }

  buildCrossHairs () {
    let radius = 1.2
    let segments = 60
    let material = new THREE.LineDashedMaterial(
      {color: 0xFF7777, linewidth: 2})
    let geometry = new THREE.CircleGeometry(radius, segments)

    // Remove center vertex
    geometry.vertices.shift()

    this.crossHairs = new THREE.Line(geometry, material)
    this.crossHairs.dontDelete = true
    this.displayScene.add(this.crossHairs)
  }

  /**
   ******************************************
   * Handle cameraParams
   ******************************************
   */

  setTargetViewFromAtom (iAtom) {
    this.controller.setTargetViewByAtom(iAtom)
  }

  getCurrentViewCamera () {
    return this.soupView.currentView.cameraParams
  }

  rotateCameraToCurrentView () {
    let viewCamera = this.soupView.currentView.cameraParams

    // rotate lights to soupView orientation
    let cameraDirection = this.cameraParams.position.clone()
      .sub(this.cameraParams.focus)
      .normalize()
    let viewCameraDirection = viewCamera.position.clone()
      .sub(viewCamera.focus)
    viewCameraDirection.normalize()
    let rotation = glgeom.getUnitVectorRotation(
      cameraDirection, viewCameraDirection)
    for (let i = 0; i < this.lights.length; i += 1) {
      this.lights[i].position.applyQuaternion(rotation)
    }

    this.cameraParams = viewCamera

    let far = this.cameraParams.zoom + this.cameraParams.zBack
    let near = this.cameraParams.zoom + this.cameraParams.zFront
    if (near < 1) {
      near = 1
    }

    this.camera.position.copy(this.cameraParams.position)
    this.camera.up.copy(this.cameraParams.up)
    this.camera.lookAt(this.cameraParams.focus)
    this.camera.near = near
    this.camera.far = far
    this.camera.updateProjectionMatrix()

    this.displayScene.fog.near = near
    this.displayScene.fog.far = far
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    let cameraParams = this.getCurrentViewCamera()

    let y = cameraParams.up
    let z = cameraParams.position.clone()
      .sub(cameraParams.focus)
      .normalize()
    let x = (v3.create())
      .crossVectors(y, z)
      .normalize()

    let rot_z = new THREE.Quaternion()
      .setFromAxisAngle(z, zRotationAngle)

    let rot_y = new THREE.Quaternion()
      .setFromAxisAngle(y, -yRotationAngle)

    let rot_x = new THREE.Quaternion()
      .setFromAxisAngle(x, -xRotationAngle)

    let rotation = new THREE.Quaternion()
      .multiply(rot_z)
      .multiply(rot_y)
      .multiply(rot_x)

    let newZoom = zoomRatio * cameraParams.zoom

    if (newZoom < 2) {
      newZoom = 2
    }

    let position = cameraParams.position.clone()
      .sub(cameraParams.focus)
      .applyQuaternion(rotation)
      .normalize()
      .multiplyScalar(newZoom)
      .add(cameraParams.focus)

    let view = this.soupView.currentView.clone()
    view.cameraParams.focus = cameraParams.focus.clone()
    view.cameraParams.position = position
    view.cameraParams.up = cameraParams.up.clone().applyQuaternion(rotation)
    view.cameraParams.zoom = newZoom

    this.controller.setCurrentView(view)
  }

  getZ (pos) {
    let cameraParams = this.getCurrentViewCamera()
    let cameraDir = cameraParams.focus.clone()
      .sub(cameraParams.position)
      .normalize()
    let posRelativeToOrigin = pos.clone()
      .sub(cameraParams.focus)
    return posRelativeToOrigin.dot(cameraDir)
  }

  inZlab (pos) {
    let z = this.getZ(pos)
    let cameraParams = this.getCurrentViewCamera()
    return ((z >= cameraParams.zFront) && (z <= cameraParams.zBack))
  }

  opacity (pos) {
    let z = this.getZ(pos)

    let cameraParams = this.getCurrentViewCamera()

    if (z < cameraParams.zFront) {
      return 1.0
    }

    if (z > cameraParams.zBack) {
      return 0.0
    }

    return 1 - (z - cameraParams.zFront) / (cameraParams.zBack - cameraParams.zFront)
  }

  posXY (pos) {
    let widthHalf = 0.5 * this.width()
    let heightHalf = 0.5 * this.height()

    let vector = pos.clone().project(this.camera)

    return {
      x: (vector.x * widthHalf) + widthHalf + this.x(),
      y: -(vector.y * heightHalf) + heightHalf + this.y()
    }
  }

  /**
   ******************************************
   * Draw & Animate Graphical objects
   ******************************************
   */

  updateCrossHairs () {
    let cameraParams = this.getCurrentViewCamera()
    this.crossHairs.position.copy(cameraParams.focus)
    this.crossHairs.lookAt(cameraParams.position)
    this.crossHairs.updateMatrix()
  }

  atomLabelDialog () {
    let iAtom = this.soupView.currentView.iAtom
    if (iAtom >= 0) {
      let atom = this.soup.getAtomProxy(iAtom)
      let label = 'Label atom : ' + atom.label
      let success = text => { this.controller.makeAtomLabel(iAtom, text) }
      util.textEntryDialog(this.div, label, success)
    }
  }

  getIAtomHover () {
    let x = this.mouseX
    let y = this.mouseY

    if ((x === null) || (y === null)) {
      return null
    }

    // create buffer for reading single pixel
    let pixelBuffer = new Uint8Array(4)

    // render the picking soupView off-screen
    this.renderer.render(
      this.pickingScene, this.camera, this.pickingTexture)

    // read the pixel under the mouse from the texture
    this.renderer.readRenderTargetPixels(
      this.pickingTexture,
      this.mouseX, this.pickingTexture.height - y,
      1, 1,
      pixelBuffer)

    // interpret the pixel as an ID
    let i = (pixelBuffer[0] << 16)
      | (pixelBuffer[1] << 8)
      | (pixelBuffer[2])

    if (i < this.soup.getAtomCount()) {
      return i
    }

    return null
  }

  updateHover () {
    if (this.soupView.nUpdateStep > 1) {
      this.hover.hide()
      return
    }

    this.iHoverAtom = this.getIAtomHover()

    if (this.iHoverAtom) {
      let atom = this.soup.getAtomProxy(this.iHoverAtom)
      let text = atom.label
      let iAtom = atom.iAtom
      let pos = atom.pos.clone()
      if (iAtom === this.soupView.getCenteredAtom().iAtom) {
        text = '<div style="text-align: center">'
        text += atom.label
        text += '<br>[drag distances]<br>'
        text += '[double-click labels]'
        text += '</div>'
      }
      this.hover.html(text)
      let vector = this.posXY(pos)
      this.hover.move(vector.x, vector.y)
    } else {
      this.hover.hide()
    }
  }

  /**
   ********************************************
   * Main event loop methods
   ********************************************
   */

  isChanged () {
    return this.soupView.changed
  }

  draw () {
    if (!this.isChanged()) {
      return
    }

    this.updateMeshesInScene = false

    let show = this.soupView.currentView.show
    this.setMeshVisible('tube', show.trace)
    this.setMeshVisible('water', show.water)
    this.setMeshVisible('ribbons', show.ribbon)
    this.setMeshVisible('arrows', !show.backboneAtom)
    this.setMeshVisible('backbone', show.backboneAtom)
    this.setMeshVisible('ligands', show.ligands)

    if (this.soupView.soup.grid.changed) {
      this.buildMeshOfGrid()
      this.soupView.soup.grid.changed = false
      this.updateMeshesInScene = true
    }

    if (this.soupView.updateResidueSelection) {
      this.buildSelectedResidues(show.sidechain)
      this.soupView.updateResidueSelection = false
      this.updateMeshesInScene = true
    }

    if (this.updateMeshesInScene) {
      this.rebuildSceneWithMeshes()
    }

    this.updateCrossHairs()

    this.rotateCameraToCurrentView()

    // needs to be drawn before render
    this.distanceWidget.draw()

    // leave this to the very last moment
    // to avoid the dreaded black canvas
    if (!util.exists(this.renderer)) {
      this.initWebglRenderer()
    }

    // renders visible meshes to the gpu
    this.renderer.render(
      this.displayScene, this.camera)

    if (this.soupView.updateView) {
      this.zSlabWidget.draw()
      this.sequenceWidget.draw()
      this.gridControlWidget.draw()
      this.soupView.updateView = false
    }

    // needs to be drawn after render
    this.labelWidget.draw()

    this.soupView.changed = false
  }

  animate () {
    if (this.soupView.targetView === null) {
      return
    }

    this.soupView.nUpdateStep -= 1
    let nStep = this.soupView.nUpdateStep
    if (nStep <= 0) {
      return
    }

    let newCamera = interpolateCameras(
      this.soupView.currentView.cameraParams,
      this.soupView.targetView.cameraParams,
      1.0 / nStep)

    let view = this.soupView.targetView.clone()
    view.setCamera(newCamera)
    this.controller.setCurrentView(view)

    this.updateHover()
  }

  /**
   ********************************************
   * Standard DOM methods
   ********************************************
   */

  resize () {
    console.log('Display.resize')

    this.zSlabWidget.resize()
    this.gridControlWidget.resize()
    this.sequenceWidget.resize()

    let position = this.div.position()
    this.webglDiv.css('left', this.x() + position.left)
    this.webglDiv.css('top', this.y() + position.top)

    this.camera.aspect = this.width() / this.height()
    this.camera.updateProjectionMatrix()

    this.pickingTexture.setSize(this.width(), this.height())

    this.soupView.updateView = true
    this.controller.setChangeFlag()

    if (util.exists(this.renderer)) {
      this.renderer.setSize(this.width(), this.height())
    }

  }

  x () {
    return 0
  }

  y () {
    let y = 0
    if (!_.isUndefined(this.sequenceWidget)) {
      y += this.sequenceWidget.height()
    }
    return y
  }

  width () {
    let width = this.div.width() - this.x()
    if (!_.isUndefined(this.zSlabWidget)) {
      width -= this.zSlabWidget.width()
    }
    return width
  }

  height () {
    return this.div.height() - this.y()
  }

  getMouse (event) {
    if (util.exists(event.touches) && (event.touches.length > 0)) {
      this.eventX = event.touches[0].clientX
      this.eventY = event.touches[0].clientY
    } else {
      this.eventX = event.clientX
      this.eventY = event.clientY
    }

    let result = util.getDomPosition(this.div[0])
    this.mouseX = this.eventX - result[0] - this.x()
    this.mouseY = this.eventY - result[1] - this.y()

    let x = this.mouseX - this.width() / 2
    let y = this.mouseY - this.height() / 2

    this.mouseR = Math.sqrt(x * x + y * y)

    this.mouseT = Math.atan(y / x)
    if (x < 0) {
      if (y > 0) {
        this.mouseT += Math.PI
      } else {
        this.mouseT -= Math.PI
      }
    }
  }

  saveMouse () {
    this.saveMouseX = this.mouseX
    this.saveMouseY = this.mouseY
    this.saveMouseR = this.mouseR
    this.saveMouseT = this.mouseT
  }

  doubleclick () {
    if (this.iHoverAtom !== null) {
      if (this.iHoverAtom === this.soupView.getCenteredAtom().iAtom) {
        this.atomLabelDialog()
      } else {
        this.setTargetViewFromAtom(this.iHoverAtom)
      }
      this.isDraggingCentralAtom = false
    }
  }

  mousedown (event) {
    this.getMouse(event)

    event.preventDefault()

    let now = (new Date()).getTime()

    let isDoubleClick = (now - this.timePressed) < 500

    this.updateHover()

    this.iDownAtom = this.getIAtomHover()

    if (isDoubleClick) {
      this.doubleclick()
    } else {
      this.isDraggingCentralAtom = this.iDownAtom !== null
    }

    this.timePressed = now

    this.saveMouse()
    this.mousePressed = true
  }

  mousemove (event) {
    this.getMouse(event)

    event.preventDefault()

    if (this.isGesture) {
      return
    }

    this.updateHover()

    if (this.isDraggingCentralAtom) {
      let v = this.posXY(this.soup.getAtomProxy(this.iDownAtom).pos)

      this.lineElement.move(this.mouseX + this.x(), this.mouseY + this.y(), v.x, v.y)
    } else {
      let shiftDown = (event.shiftKey === 1)

      let rightMouse =
        (event.button === 2) || (event.which === 3)

      if (this.mousePressed) {
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

        this.adjustCamera(
          xRotationAngle,
          yRotationAngle,
          zRotationAngle,
          zoomRatio)

        this.saveMouse()
      }
    }
  }

  mousewheel (event) {
    event.preventDefault()

    let wheel
    if (util.exists(event.wheelDelta)) {
      wheel = event.wheelDelta / 120
    } else {
      // for Firefox
      wheel = -event.detail / 12
    }
    let zoom = Math.pow(1 + Math.abs(wheel) / 2, wheel > 0 ? 1 : -1)

    this.adjustCamera(0, 0, 0, zoom)
  }

  mouseup (event) {
    this.getMouse(event)

    event.preventDefault()

    if (this.isDraggingCentralAtom) {
      if (this.iHoverAtom !== null) {
        if (this.iHoverAtom !== this.iDownAtom) {
          this.controller.makeDistance(this.iHoverAtom, this.iDownAtom)
        }
      }

      this.lineElement.hide()

      this.isDraggingCentralAtom = false
    }

    if (util.exists(event.touches)) {
      this.hover.hide()
      this.mouseX = null
      this.mouseY = null
    }

    this.iDownAtom = null

    this.mousePressed = false
  }

  gesturestart (event) {
    event.preventDefault()
    this.isGesture = true
    this.lastPinchRotation = 0
    this.lastScale = event.scale * event.scale
  }

  gesturechange (event) {
    event.preventDefault()
    this.adjustCamera(
      0,
      0,
      v3.degToRad(event.rotation * 2 - this.lastPinchRotation),
      this.lastScale / (event.scale * event.scale))

    this.lastPinchRotation = event.rotation * 2
    this.lastScale = event.scale * event.scale
  }

  gestureend (event) {
    event.preventDefault()
    this.isGesture = false
    this.iDownAtom = null
    this.mousePressed = false
  }

}

export { Display }
