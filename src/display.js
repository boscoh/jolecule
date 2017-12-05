import THREE from 'three'
import $ from 'jquery'
import _ from 'lodash'
import v3 from './v3'

import * as glgeom from './glgeom'
import * as util from './util'
import widgets from './widgets'
import * as data from './data'
import {interpolateCameras} from './soup'


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
   * @param scene - Scene object that holds a soup and views
   * @param divTag - a selector tag for a DOM element
   * @param controller - the controller for the scene
   * @param isGrid - flat to show autodock 3D grid control panel
   * @param backgroundColor - the background color of canvas and webgl
   */
  constructor (scene, divTag, controller, isGrid, backgroundColor) {

    this.divTag = divTag
    this.scene = scene
    this.soup = scene.soup
    this.controller = controller

    // stores the trace of the soup & DNA backbones, used
    // to generate the ribbons and tubes
    this.traces = []

    this.div = $(this.divTag)
    this.div.css('overflow', 'hidden')

    // popup hover box over the mouse position
    this.hover = new widgets.PopupText(this.divTag, 'lightblue')
    this.hover.div.css('pointer-events', 'none')
    this.hover.arrow.css('pointer-events', 'none')

    // div to display processing messages
    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .addClass('jolecule-loading-message')

    this.setProcessingMesssage('Loading data for proteins')

    this.nDataServer = 0

    this.unitSphereGeom = new THREE.SphereGeometry(1, 8, 8)

    this.backgroundColor = backgroundColor

    this.webglDivId = this.div.attr('id') + '-canvas-wrapper'
    this.webglDivTag = '#' + this.webglDivId
    this.webglDiv = $('<div>')
      .attr('id', this.webglDivId)
      .css('overflow', 'hidden')
      .css('background-color', '#CCC')
    this.webglDiv.contextmenu(() => false)

    this.div.append(this.webglDiv)
    this.div.css('background-color', '#CCC')

    // atom radius used to display on the screen
    this.atomRadius = 0.35

    // parameters for viewport
    this.camera = {
      focus: new THREE.Vector3(0, 0, 0),
      position: new THREE.Vector3(0, 0, -1),
      up: new THREE.Vector3(0, 1, 0),
      // the front and back of viewable area relative to the origin
      zFront: -40,
      zBack: 20,
      // distance of focus from camera
      zoom: 1.0
    }

    // a THREE.js camera, will be set properly before draw
    this.threeJsCamera = new THREE.PerspectiveCamera(
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

    // WebGL objects that only need to build once in the life-cycle
    this.lights = []
    this.buildLights()

    this.buildCrossHairs()

    this.distanceWidget = new widgets.DistanceMeasuresWidget(this)
    this.labelWidget = new widgets.AtomLabelsWidget(this)
    this.sequenceWidget = new widgets.SequenceWidget(this.divTag, this)
    this.zSlabWidget = new widgets.ZSlabWidget(this.divTag, this.scene)
    this.gridControlWidget = new widgets.GridControlWidget(
      this.divTag, this.scene, isGrid)

    this.lineElement = new widgets.LineElement(this.webglDivTag, '#FF7777')

    // input control parametsrs
    this.saveMouseX = null
    this.saveMouseY = null
    this.saveMouseR = null
    this.saveMouseT = null
    this.mouseX = null
    this.mouseY = null
    this.mouseR = null
    this.mouseT = null
    this.mousePressed = false
  }

  initWebglRenderer () {
    this.renderer = new THREE.WebGLRenderer()
    this.renderer.setClearColor(this.backgroundColor)
    this.renderer.setSize(this.width(), this.height())

    let dom = this.renderer.domElement
    this.webglDiv[0].appendChild(dom)

    const bind = (w, fn) => {
      dom.addEventListener(w, fn)
    }

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

  setProcessingMesssage (message) {
    console.log('Display.setProcessingMessage:', message)
    this.messageDiv.html(message).show()
    util.stickJqueryDivInTopLeft(this.div, this.messageDiv, 100, 90)
  };

  cleanupProcessingMessage () {
    this.resize()
    this.messageDiv.hide()
  };

  /**
   * Pause before a computeFn to allow the DOM to show a message
   */
  displayMessageBeforeCompute (message, computeFn) {
    this.setProcessingMesssage(message)
    setTimeout(computeFn, 0)
  }

  buildAfterInitialLoad () {
    this.scene.current_view.makeDefaultOfSoup(this.soup)
    this.scene.save_view(this.scene.current_view)
    this.scene.changed = true

    for (let i of _.range(this.soup.getResidueCount())) {
      let ss = this.soup.getResidue(i).ss
      this.soup.setResidueColor(i, data.getSsColor(ss))
    }

    this.buildScene()

    this.sequenceWidget.reset()

  }

  buildAfterAdditionalLoad () {
    this.buildScene()
    this.scene.changed = true
    this.sequenceWidget.reset()
    this.gridControlWidget.reset()
  }

  calculateTracesForRibbons () {
    this.traces.length = 0

    let currTrace

    for (let iRes = 0; iRes < this.soup.getResidueCount(); iRes += 1) {
      let residue = this.soup.getResidue(iRes)

      if (residue.isPolymer) {

        let isBreak = false
        if (iRes === 0) {
          isBreak = true
        } else {
          let peptideConnect = this.soup.isPeptideConnected(iRes - 1, iRes)
          let nucleotideConnect = this.soup.isSugarPhosphateConnected(iRes - 1, iRes)
          isBreak = !(peptideConnect) && !(nucleotideConnect)
        }

        if (isBreak) {
          currTrace = new glgeom.Trace()
          {
            let trace = currTrace
            trace.getReference = i => {
              let iRes = trace.indices[i]
              return this.soup.getResidue(iRes)
            }
          }
          this.traces.push(currTrace)
        }

        currTrace.indices.push(iRes)
        currTrace.points.push(this.soup.getResidue(iRes).getCentralAtom().pos)
        let normal = null
        if (residue.normal) {
          normal = residue.normal
        }
        currTrace.normals.push(normal)
      }
    }

    for (let trace of this.traces) {
      trace.calcTangents()
      trace.calcNormals()
      trace.calcBinormals()
      trace.expand()
    }

  }

  getAtomColor (iAtom) {
    let atom = this.soup.getAtom(iAtom)
    if (atom.elem === 'C' || atom.elem === 'H') {
      let iRes = atom.iRes
      return this.soup.getResidue(iRes).color
    } else if (atom.elem in data.ElementColors) {
      return data.ElementColors[atom.elem]
    }
    return data.darkGrey
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

    // pre-calculations needed before building meshes
    this.gridControlWidget.findLimitsAndElements()
    this.calculateTracesForRibbons()

    this.buildMeshOfRibbons()
    this.buildMeshOfGrid()
    this.buildMeshOfLigands()
    this.buildMeshOfNucleotides()
    this.buildMeshOfArrows()

    this.rebuildSceneWithMeshes()
  }

  /**
   * Clears/creates a mesh entry in the mesh collection
   *
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
   * Rebuild scene from meshes in this.displayMeshes &
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

  selectVisibleMeshes () {

    this.updateMeshesInScene = false

    let show = this.scene.current_view.show
    this.setMeshVisible('tube', show.trace)
    this.setMeshVisible('water', show.water)
    this.setMeshVisible('ribbons', show.ribbon)
    this.setMeshVisible('arrows', !show.all_atom)
    this.setMeshVisible('backbone', show.all_atom)
    this.setMeshVisible('ligands', show.ligands)

    if (util.exists(this.displayMeshes.grid)) {
      for (let mesh of [this.displayMeshes.grid, this.pickingMeshes.grid]) {
        mesh.traverse(child => {
          if (util.exists(child.i)) {
            child.visible = this.isVisibleGridAtom(child.i)
          }
        })
      }
    }

    // since residues are built on demand at every cycle
    this.buildSelectedResidues(show.sidechain)

    if (util.exists(this.displayMeshes.sidechains)) {
      for (let mesh of [this.displayMeshes.sidechains, this.pickingMeshes.sidechains]) {
        mesh.traverse(child => {
          if (util.exists(child.i)) {
            let residue = this.soup.getResidue(child.i)
            child.visible = show.sidechain || residue.selected
          }
        })
      }
    }

    if (this.updateMeshesInScene) {
      this.rebuildSceneWithMeshes()
    }
  }

  mergeAtomToGeom (geom, pickGeom, iAtom) {
    let atom = this.soup.getAtom(iAtom)
    let matrix = glgeom.getSphereMatrix(atom.pos, this.atomRadius)
    let unitGeom = this.unitSphereGeom
    glgeom.mergeUnitGeom(geom, unitGeom, this.getAtomColor(iAtom), matrix)
    glgeom.mergeUnitGeom(pickGeom, unitGeom, data.getIndexColor(iAtom), matrix)
  }

  mergeBondsInResidue (geom, iRes, bondFilterFn) {
    let residue = this.soup.getResidue(iRes)
    let unitGeom = new glgeom.UnitCylinderGeometry()
    let color = residue.color
    let p1, p2
    for (let bond of residue.bonds) {
      if (bondFilterFn && !bondFilterFn(bond)) {
        continue
      }
      p1 = bond.atom1.pos
      p2 = bond.atom2.pos
      if (bond.atom1.iRes !== bond.atom2.iRes) {
        let midpoint = p2.clone().add(p1).multiplyScalar(0.5)
        if (bond.atom1.iRes === residue.i) {
          p2 = midpoint
        } else if (bond.atom2.iRes === residue.i) {
          p1 = midpoint
        }
      }
      glgeom.mergeUnitGeom(geom, unitGeom, color, glgeom.getCylinderMatrix(p1, p2, 0.2))
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
        let isRound = res.ss === 'C'
        let isFront = ((i === 0) ||
          (res.ss !== trace.getReference(i - 1).ss))
        let isBack = ((i === n - 1) ||
          (res.ss !== trace.getReference(i + 1).ss))
        let resGeom = trace.getSegmentGeometry(
          i, face, isRound, isFront, isBack, color)
        displayGeom.merge(resGeom)
        glgeom.setGeometryVerticesColor(resGeom, data.getIndexColor(res.iAtom))
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
    let geom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReference(i)
        let color = res.color
        let isRound = true
        let isFront = (i === 0)
        let isBack = (i === n - 1)
        let resGeom = trace.getSegmentGeometry(
          i, data.fatCoilFace, isRound, isFront, isBack, color)
        geom.merge(resGeom)
        glgeom.setGeometryVerticesColor(
          resGeom, new THREE.Color().setHex(res.iAtom))
      }
    }
    this.addGeomToDisplayMesh('tube', geom)
  }

  buildSelectedResidues (showAllResidues) {

    if (!('sidechains' in this.displayMeshes)) {
      this.createOrClearMesh('sidechains')
    }

    function bondFilter (bond) {
      return !_.includes(data.backboneAtoms, bond.atom1.type) ||
        !_.includes(data.backboneAtoms, bond.atom2.type)
    }

    for (let trace of this.traces) {
      for (let i of _.range(trace.indices.length)) {
        let iRes = trace.indices[i]
        let residue = trace.getReference(i)
        let residueShow = showAllResidues || residue.selected
        if (residueShow && !util.exists(residue.mesh)) {

          let displayGeom = new THREE.Geometry()
          let pickingGeom = new THREE.Geometry()

          this.mergeBondsInResidue(displayGeom, iRes, bondFilter)

          for (let atom of residue.getAtoms()) {
            if (!util.inArray(atom.type, data.backboneAtoms)) {
              atom.is_sidechain = true
              let matrix = glgeom.getSphereMatrix(atom.pos, this.atomRadius)
              glgeom.mergeUnitGeom(
                displayGeom, this.unitSphereGeom, this.getAtomColor(atom.i), matrix)
              glgeom.mergeUnitGeom(
                pickingGeom, this.unitSphereGeom, data.getIndexColor(atom.i), matrix)
            }
          }

          this.addGeomToDisplayMesh('sidechains', displayGeom, iRes)
          this.addGeomToPickingMesh('sidechains', pickingGeom, iRes)

          this.updateMeshesInScene = true
          residue.mesh = true
        }
      }
    }
  }

  buildMeshOfBackbone () {
    this.createOrClearMesh('backbone')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      let residue = this.soup.getResidue(iRes)
      if (residue.isPolymer) {
        let bondFilter = bond => {
          return _.includes(data.backboneAtoms, bond.atom1.type) &&
            _.includes(data.backboneAtoms, bond.atom2.type)
        }
        this.mergeBondsInResidue(displayGeom, iRes, bondFilter)
        for (let atom of residue.getAtoms()) {
          if (util.inArray(atom.type, data.backboneAtoms)) {
            this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
          }
        }
      }
    }
    this.addGeomToDisplayMesh('backbone', displayGeom)
    this.addGeomToPickingMesh('backbone', pickingGeom)
  }

  buildMeshOfLigands () {
    this.createOrClearMesh('ligands')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      let residue = this.soup.getResidue(iRes)
      if (residue.isLigand) {
        this.mergeBondsInResidue(displayGeom, iRes)
        for (let atom of residue.getAtoms()) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
        }
      }
    }
    this.addGeomToDisplayMesh('ligands', displayGeom)
    this.addGeomToPickingMesh('ligands', pickingGeom)
  }

  buildMeshOfWater () {
    this.createOrClearMesh('water')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      let residue = this.soup.getResidue(iRes)
      if (residue.type == "HOH") {
        this.mergeBondsInResidue(displayGeom, iRes)
        for (let atom of residue.getAtoms()) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
        }
      }
    }
    this.addGeomToDisplayMesh('water', displayGeom)
    this.addGeomToPickingMesh('water', pickingGeom)
  }

  isVisibleGridAtom (iAtom) {
    let atom = this.soup.getAtom(iAtom)
    let isAtomInRange = atom.bfactor > this.scene.grid
    let isAtomElemSelected = this.scene.grid_atoms[atom.elem]
    return isAtomElemSelected && isAtomInRange
  }

  buildMeshOfGrid () {
    if (!this.gridControlWidget.isGrid) {
      return
    }
    this.createOrClearMesh('grid')
    for (let iRes of _.range(this.soup.getResidueCount())) {
      let residue = this.soup.getResidue(iRes)
      if (residue.isGrid) {
        for (let atom of residue.getAtoms()) {
          if (this.isVisibleGridAtom(atom.i)) {
            let material = new THREE.MeshLambertMaterial({
              color: this.getAtomColor(atom.i)
            })
            let mesh = new THREE.Mesh(this.unitSphereGeom, material)
            mesh.scale.set(this.atomRadius, this.atomRadius, this.atomRadius)
            mesh.position.copy(atom.pos)
            mesh.i = atom.i
            this.displayMeshes.grid.add(mesh)

            let indexMaterial = new THREE.MeshBasicMaterial({
              color: data.getIndexColor(atom.i)
            })
            let pickingMesh = new THREE.Mesh(this.unitSphereGeom, indexMaterial)
            pickingMesh.scale.set(this.atomRadius, this.atomRadius, this.atomRadius)
            pickingMesh.position.copy(atom.pos)
            pickingMesh.i = atom.i
            this.pickingMeshes.grid.add(pickingMesh)
          }
        }
      }
    }
  }

  buildMeshOfNucleotides () {
    this.createOrClearMesh('basepairs')

    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()

    let cylinderGeom = new glgeom.UnitCylinderGeometry()

    for (let iRes of _.range(this.soup.getResidueCount())) {
      let residue = this.soup.getResidue(iRes)
      if (residue.ss !== 'D' || !residue.isPolymer) {
        continue
      }

      let basepairGeom = new THREE.Geometry()

      let atomTypes, bondTypes
      if (residue.type === 'DA' || residue.type === 'A') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']]
      } else if (residue.type === 'DG' || residue.type === 'G') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']]
      } else if (residue.type === 'DT' || residue.type === 'U') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']]
      } else if (residue.type === 'DC' || residue.type === 'C') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']]
      } else {
        continue
      }

      let getVerticesFromAtomDict = (iRes, atomTypes) => {
        let res = this.soup.getResidue(iRes)
        return _.map(atomTypes, a => res.getAtom(a).pos)
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
   * Handle camera
   ******************************************
   */

  setTargetViewFromAtom (iAtom) {
    this.controller.set_target_view_by_atom(iAtom)
  }

  getCurrentViewCamera () {
    return this.scene.current_view.camera
  }

  rotateCameraToCurrentView () {
    let view = this.scene.current_view
    let viewCamera = this.scene.current_view.camera

    // rotate lights to scene orientation
    let cameraDirection = this.camera.position.clone()
      .sub(this.camera.focus)
      .normalize()
    let viewCameraDirection = viewCamera.position.clone()
      .sub(viewCamera.focus)
    viewCameraDirection.normalize()
    let rotation = glgeom.getUnitVectorRotation(
      cameraDirection, viewCameraDirection)
    for (let i = 0; i < this.lights.length; i += 1) {
      this.lights[i].position.applyQuaternion(rotation)
    }

    this.camera = viewCamera

    let far = this.camera.zoom + this.camera.zBack
    let near = this.camera.zoom + this.camera.zFront
    if (near < 1) {
      near = 1
    }

    this.threeJsCamera.position.copy(this.camera.position)
    this.threeJsCamera.up.copy(this.camera.up)
    this.threeJsCamera.lookAt(this.camera.focus)
    this.threeJsCamera.near = near
    this.threeJsCamera.far = far
    this.threeJsCamera.updateProjectionMatrix()

    this.displayScene.fog.near = near
    this.displayScene.fog.far = far
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    let camera = this.getCurrentViewCamera()

    let y = camera.up
    let z = camera.position.clone()
      .sub(camera.focus)
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

    let newZoom = zoomRatio * camera.zoom

    if (newZoom < 2) {
      newZoom = 2
    }

    let position = camera.position.clone()
      .sub(camera.focus)
      .applyQuaternion(rotation)
      .normalize()
      .multiplyScalar(newZoom)
      .add(camera.focus)

    let view = this.scene.current_view.clone()
    view.camera.focus = camera.focus.clone()
    view.camera.position = position
    view.camera.up = camera.up.clone().applyQuaternion(rotation)
    view.camera.zoom = newZoom

    this.controller.set_current_view(view)
  }

  getZ (pos) {
    let camera = this.getCurrentViewCamera()
    let cameraDir = camera.focus.clone()
      .sub(camera.position)
      .normalize()
    let posRelativeToOrigin = pos.clone()
      .sub(camera.focus)
    return posRelativeToOrigin.dot(cameraDir)
  }

  inZlab (pos) {
    let z = this.getZ(pos)
    let camera = this.getCurrentViewCamera()
    return ((z >= camera.zFront) && (z <= camera.zBack))
  }

  opacity (pos) {
    let z = this.getZ(pos)

    let camera = this.getCurrentViewCamera()

    if (z < camera.zFront) {
      return 1.0
    }

    if (z > camera.zBack) {
      return 0.0
    }

    return 1 - (z - camera.zFront) / (camera.zBack - camera.zFront)
  }

  posXY (pos) {
    let widthHalf = 0.5 * this.width()
    let heightHalf = 0.5 * this.height()

    let vector = pos.clone().project(this.threeJsCamera)

    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }

  /**
   ******************************************
   * Draw & Animate Graphical objects
   ******************************************
   */

  updateCrossHairs () {
    let camera = this.getCurrentViewCamera()
    this.crossHairs.position.copy(camera.focus)
    this.crossHairs.lookAt(camera.position)
    this.crossHairs.updateMatrix()
  }

  atomLabelDialog () {
    let i_atom = this.scene.current_view.i_atom
    if (i_atom >= 0) {
      let atom = this.soup.getAtom(i_atom)
      let label = 'Label atom : ' + atom.label
      let success = text => { this.controller.make_label(i_atom, text) }
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

    // render the picking scene off-screen
    this.renderer.render(
      this.pickingScene, this.threeJsCamera, this.pickingTexture)

    // read the pixel under the mouse from the texture
    this.renderer.readRenderTargetPixels(
      this.pickingTexture,
      this.mouseX, this.pickingTexture.height - y,
      1, 1,
      pixelBuffer)

    // interpret the pixel as an ID
    let i = ( pixelBuffer[0] << 16 )
      | ( pixelBuffer[1] << 8 )
      | ( pixelBuffer[2] )

    if (i < this.soup.getAtomCount()) {
      return i
    }

    return null
  }

  updateHover () {
    if (this.getIAtomHover() !== null) {
      this.iHoverAtom = this.getIAtomHover()
    } else {
      this.iHoverAtom = null
    }

    if (this.iHoverAtom) {
      let atom = this.soup.getAtom(this.iHoverAtom)
      let text = atom.label
      if (atom === this.scene.centered_atom()) {
        text = '<div style="text-align: center">'
        text += atom.label
        text += '<br>[drag distances]<br>'
        text += '[double-click labels]'
        text += '</div>'
      }
      this.hover.html(text)
      let vector = this.posXY(v3.clone(atom.pos))
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
    return this.scene.changed
  }

  draw () {
    if (_.isUndefined(this.displayMeshes)) {
      return
    }
    if (!this.isChanged()) {
      return
    }

    this.resize()

    this.rotateCameraToCurrentView()

    this.selectVisibleMeshes()

    this.updateCrossHairs()

    // needs to be drawn before render
    this.distanceWidget.draw()
    this.zSlabWidget.draw()
    this.gridControlWidget.draw()
    this.sequenceWidget.draw()

    // leave this to the very last moment
    // to avoid the dreaded black canvas
    if (!util.exists(this.renderer)) {
      this.initWebglRenderer()
    }

    // renders visible meshes to the gpu
    this.renderer.render(this.displayScene, this.threeJsCamera)

    // needs to be drawn after render
    this.labelWidget.draw()

    this.scene.changed = false
  }

  animate () {
    if (this.scene.target_view === null) {
      return
    }

    this.scene.n_update_step -= 1
    let nStep = this.scene.n_update_step
    if (nStep <= 0) {
      return
    }

    let newCamera = interpolateCameras(
      this.scene.current_view.camera,
      this.scene.target_view.camera,
      1.0 / nStep)

    let view = this.scene.target_view.clone()
    view.setCamera(newCamera)
    this.controller.set_current_view(view)

    this.updateHover()
  }

  /**
   ********************************************
   * Standard DOM methods
   ********************************************
   */

  resize () {
    if (!util.exists(this.renderer)) {
      return
    }

    this.threeJsCamera.aspect = this.width() / this.height()
    this.threeJsCamera.updateProjectionMatrix()

    this.renderer.setSize(this.width(), this.height())

    this.pickingTexture.setSize(this.width(), this.height())

    this.zSlabWidget.resize()
    this.gridControlWidget.resize()
    this.sequenceWidget.resize()

    this.controller.flag_changed()
  }

  width () {
    return this.div.width()
  }

  height () {
    return this.div.height()
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
    this.mouseX = this.eventX - result[0]
    this.mouseY = this.eventY - result[1]

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
      if (this.iHoverAtom === this.scene.centered_atom().i) {
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
      let v = this.posXY(this.soup.getAtom(this.iDownAtom).pos)

      this.lineElement.move(this.mouseX, this.mouseY, v.x, v.y)
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
          this.controller.make_dist(this.iHoverAtom, this.iDownAtom)
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
