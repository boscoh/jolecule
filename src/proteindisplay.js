import THREE from 'three'
import $ from 'jquery'
import _ from 'lodash'
import v3 from './v3'
import {View} from './protein'

import {
  UnitCylinderGeometry,
  BlockArrowGeometry,
  setVisible,
  RaisedShapeGeometry,
  getUnitVectorRotation,
  getFractionRotation,
  setGeometryVerticesColor,
  clearObject3D,
  Trace,
  mergeUnitGeom,
  getSphereMatrix,
  getCylinderMatrix
} from './glgeometry'

import {
  toggleButton,
  exists,
  getDomPosition,
  inArray,
  stickJqueryDivInTopLeft,
  textEntryDialog
} from './util'

import widgets from './widgets'

import * as data from './data'

let TV3 = THREE.Vector3


function degToRad (deg) {
  return deg * Math.PI / 180.0
}

function getVerticesFromAtomDict (atoms, atomTypes) {
  let vertices = []

  for (let i = 0; i < atomTypes.length; i += 1) {
    let aType = atomTypes[i]
    vertices.push(v3.clone(atoms[aType].pos))
  }

  return vertices
}

function fraction (reference, target, t) {
  return t * (target - reference) + reference
}

/**
 * Converts the older view datastructure to a target data
 * structure that can be easily converted into a THREE.js
 * camera
 *
 * - camera
 *     - pos: scene center, camera focus
 *     - up: gives the direction of the y vector from pos
 *     - in: gives the positive z-axis direction
 *     - scene is from 0 to positive z; since canvasjolecule draws +z into screen
 *     - as opengl +z is out of screen, need to flip z direction
 *     - in opengl, the box is -1 to 1 that gets projected on screen + perspective
 *     - by adding a i distance to move the camera further into -z
 *     - z_front and z_back define cutoffs
 * - opengl:
 *     - x right -> left
 *     - y bottom -> top (inverse of classic 2D coordinate)
 *     - z far -> near
 *     - that is positive Z direction is out of the screen
 *     - box -1to +1
 **/

function convertViewToTarget (view) {
  let cameraTarget = v3.clone(view.abs_camera.pos)

  let cameraDirection = v3.clone(view.abs_camera.in_v)
    .sub(cameraTarget)
    .multiplyScalar(view.abs_camera.zoom)
    .negate()

  let cameraPosition = cameraTarget.clone()
    .add(cameraDirection)

  let cameraUp = v3.clone(view.abs_camera.up_v)
    .sub(cameraTarget)
    .negate()

  return {
    cameraTarget: cameraTarget,
    cameraPosition: cameraPosition,
    cameraUp: cameraUp,
    zFront: view.abs_camera.z_front,
    zBack: view.abs_camera.z_back,
    zoom: view.abs_camera.zoom
  }
}

function convertTargetToView (target) {
  let view = new View()

  let cameraDirection = target.cameraPosition.clone()
    .sub(target.cameraTarget)
    .negate()

  view.abs_camera.zoom = cameraDirection.length()
  view.abs_camera.z_front = target.zFront
  view.abs_camera.z_back = target.zBack

  view.abs_camera.pos = v3.clone(target.cameraTarget)

  let up = target.cameraUp.clone().negate()

  view.abs_camera.up_v = v3.clone(
    target.cameraTarget.clone()
      .add(up))

  cameraDirection.normalize()
  view.abs_camera.in_v = v3.clone(
    target.cameraTarget.clone()
      .add(cameraDirection))

  return view
}






/**
 *
 * ProteinDisplay: The main window for drawing the protein
 * in a WebGL HTML5 canvas, with a Z-Slabe and Sequence Display
 */
class ProteinDisplay {

  /**
   * @param scene - Scene object that holds a protein and views
   * @param divTag - a tag for a DOM element
   * @param controller - the controller for the scene
   * @param isGrid - flat to show autodock 3D grid
   * @param backgroundColor - the background color of the canvas
   *                          and protein
   */
  constructor (scene, divTag, controller, isGrid, backgroundColor) {
    this.divTag = divTag
    this.scene = scene
    this.protein = scene.protein
    this.controller = controller
    this.isGrid = isGrid

    this.controller.set_target_view_by_res_id = (resId) => {
      this.setTargetFromResId(resId)
    }
    this.controller.calculate_current_abs_camera = function() {}

    this.saveMouseX = null
    this.saveMouseY = null
    this.saveMouseR = null
    this.saveMouseT = null
    this.mouseX = null
    this.mouseY = null
    this.mouseR = null
    this.mouseT = null
    this.mousePressed = false

    this.labels = []

    // relative to the scene position from camera
    this.zFront = -40
    this.zBack = 20

    // determines how far away the camera is from the scene
    this.zoom = 50.0

    this.mainDiv = $(this.divTag)
    this.mainDiv.css('overflow', 'hidden')

    this.hover = new widgets.PopupText(this.divTag, 'lightblue')
    this.hover.div.css('pointer-events', 'none')
    this.hover.arrow.css('pointer-events', 'none')

    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .addClass('jolecule-loading-message')

    this.setProcessingMesssage('Loading data for proteins')

    this.nDataServer = 0

    this.unitSphereGeom = new THREE.SphereGeometry(1, 8, 8)

    this.backgroundColor = backgroundColor

    this.webglDivId = this.mainDiv.attr('id') + '-canvas-wrapper'
    this.webglDivTag = '#' + this.webglDivId
    this.webglDiv = $('<div>')
      .attr('id', this.webglDivId)
      .css('overflow', 'hidden')
      .css('background-color', '#CCC')
    this.webglDiv.contextmenu(() => false)

    this.mainDiv.append(this.webglDiv)
    this.mainDiv.css('background-color', '#CCC')

    this.cameraTarget = new THREE.Vector3(0, 0, 0)
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.width() / this.height(),
      this.zFront + this.zoom,
      this.zBack + this.zoom)

    this.traces = []

    this.displayMeshes = {}
    this.displayScene = new THREE.Scene()
    this.displayScene.background = new THREE.Color(this.backgroundColor)
    this.displayScene.fog = new THREE.Fog(this.backgroundColor, 1, 100)
    this.displayScene.fog.near = this.zoom + 1
    this.displayScene.fog.far = this.zoom + this.zBack
    this.displayMaterial = new THREE.MeshLambertMaterial(
      {vertexColors: THREE.VertexColors})

    this.radius = 0.35 // small atom radius
    this.obj = new THREE.Object3D() // utility object

    this.pickingMeshes = {}
    this.pickingScene = new THREE.Scene()
    this.pickingTexture = new THREE.WebGLRenderTarget(this.width(), this.height())
    this.pickingTexture.texture.minFilter = THREE.LinearFilter
    this.pickingMaterial = new THREE.MeshBasicMaterial(
      {vertexColors: THREE.VertexColors})

    this.lights = []
    this.buildLights()

    this.buildCrossHairs()

    this.distanceWidget = new widgets.DistanceMeasuresWidget(this)
    this.labelWidget = new widgets.AtomLabelsWidget(this)
    this.sequenceWidget = new widgets.SequenceWidget(this.divTag, this)
    this.zSlabWidget = new widgets.ZSlabWidget(this.divTag, this.scene)
    this.gridControlWidget = new widgets.GridControlWidget(this.divTag, this.scene, this.isGrid)

    this.lineElement = new widgets.LineElement(this.webglDivTag, '#FF7777')
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
    console.log('> ProteinDisplay.setProcessingMessage:', message)
    this.messageDiv.html(message).show()
    stickJqueryDivInTopLeft(this.mainDiv, this.messageDiv, 100, 90)
  };

  cleanupProcessingMessage () {
    this.resize()
    this.messageDiv.hide()
  };

  /**
   * Allow the DOM to show a message before a compute-intensive function
   *
   * @param message
   * @param computeHeavyFn
   */
  displayMessageBeforeCompute (message, computeHeavyFn) {
    this.setProcessingMesssage(message)
    // this pause allows the DOM to draw before compute
    setTimeout(computeHeavyFn, 0)
  }

  buildAfterDataLoad () {

    for (let res of this.protein.residues) {
      res.color = data.getSsColor(res.ss)
    }

    this.buildScene()

    this.sequenceWidget.reset()

    // this is some mangling to link openGL
    // with the coordinate system that I had
    // chosen unwittingly when I first designed
    // the raster jolecule library

    let current_view = this.scene.current_view
    current_view.res_id = this.protein.residues[0].id

    current_view.abs_camera.z_front = -this.protein.max_length /
      2
    current_view.abs_camera.z_back = this.protein.max_length /
      2
    current_view.abs_camera.zoom = Math.abs(this.protein.max_length)
    current_view.camera.z_front = -this.protein.max_length / 2
    current_view.camera.z_back = this.protein.max_length / 2
    current_view.camera.zoom = Math.abs(this.protein.max_length)

    current_view.show.sidechain = false

    current_view.camera.up_v = v3.create(0, -1, 0)
    current_view.abs_camera.up_v = v3.create(0, -1, 0)

    let atom = this.protein.get_central_atom()
    current_view.res_id = atom.res_id
    let residue = this.protein.res_by_id[current_view.res_id]
    current_view.i_atom = residue.central_atom.i
    let center = residue.central_atom.pos

    current_view.abs_camera.transform(
      v3.translation(center))

    let neg_center = v3.scaled(center, -1)
    this.scene.origin.camera.transform(
      v3.translation(neg_center))

    let default_view = current_view.clone()
    default_view.order = 0
    default_view.text = this.protein.default_html
    default_view.pdb_id = this.protein.pdb_id

    this.scene.save_view(default_view)

    this.cameraTarget.copy(center)
    this.camera.position
      .set(0, 0, this.zoom)
      .add(this.cameraTarget)
    this.camera.lookAt(this.cameraTarget)

    this.displayScene.fog.near = this.zoom + 1
    this.displayScene.fog.far = this.zoom + this.zBack

    this.scene.is_new_view_chosen = true
    this.scene.changed = true
  }

  buildAfterAddProteinData () {
    this.buildScene()
    this.scene.changed = true
    this.sequenceWidget.reset()
    this.gridControlWidget.reset()
  }

  isPeptideConnected (iRes0, iRes1) {
    let res0 = this.protein.residues[iRes0]
    let res1 = this.protein.residues[iRes1]

    if (('C' in res0.atoms) &&
      ('N' in res1.atoms) &&
      ('CA' in res0.atoms) &&
      ('CA' in res1.atoms)) {
      // detect a potential peptide bond

      let c = res0.atoms['C']
      let n = res1.atoms['N']
      if (v3.distance(c.pos, n.pos) < 2) {
        return true
      }
    }

    return false
  }

  isSugarPhosphateConnected (iRes0, iRes1) {
    let res0 = this.protein.residues[iRes0]
    let res1 = this.protein.residues[iRes1]

    if (('C3\'' in res0.atoms) &&
      ('C1\'' in res0.atoms) &&
      ('C5\'' in res0.atoms) &&
      ('O3\'' in res0.atoms) &&
      ('P' in res1.atoms) &&
      ('C3\'' in res1.atoms) &&
      ('C1\'' in res1.atoms) &&
      ('C5\'' in res1.atoms)) {
      // detect nucloetide phosphate sugar bond
      let o3 = res0.atoms['O3\'']
      let p = res1.atoms['P']
      if (v3.distance(o3.pos, p.pos) < 2.5) {
        return true
      }
    }

    return false
  }

  getNormalOfNuc (iRes) {
    let atoms = this.protein.residues[iRes].atoms
    let forward = v3.diff(atoms['C3\''].pos, atoms['C5\''].pos)
    let up = v3.diff(atoms['C1\''].pos, atoms['C3\''].pos)
    return v3.crossProduct(forward, up)
  }

  findContinuousTraces () {
    this.traces.splice(0, this.traces.length)

    let residues = this.protein.residues

    let makeNewTrace = () => {
      this.trace = new Trace()
      this.trace.referenceObjects = residues
      this.traces.push(this.trace)
    }

    let nResidue = residues.length
    for (let iResidue = 0; iResidue < nResidue; iResidue += 1) {

      let residue = residues[iResidue]
      let isResInTrace = false

      if (residue.is_protein_or_nuc) {
        isResInTrace = true
      } else {
        // Handles non-standard amino-acids and nucleotides that are
        // covalently bonded with the correct atom types to 
        // neighbouring residues
        if (iResidue > 0) {
          if (this.isPeptideConnected(iResidue - 1, iResidue)) {
            residue.central_atom = residue.atoms['CA']
            isResInTrace = true
          } else if (this.isSugarPhosphateConnected(iResidue - 1, iResidue)) {
            residue.central_atom = residue.atoms['C3\'']
            isResInTrace = true
            residue.ss = 'R'
            residue.normal = this.getNormalOfNuc(iResidue)
          }
        }

        if (iResidue < nResidue - 1) {
          if (this.isPeptideConnected(iResidue, iResidue + 1)) {
            residue.central_atom = residue.atoms['CA']
            isResInTrace = true
          } else if (this.isSugarPhosphateConnected(iResidue, iResidue + 1)) {
            residue.central_atom = residue.atoms['C3\'']
            isResInTrace = true
            residue.ss = 'R'
            residue.normal = this.getNormalOfNuc(residue)
          }
        }
      }

      if (isResInTrace) {
        if (iResidue === 0) {
          makeNewTrace()
        } else {
          let iLastResidue = iResidue - 1
          let peptideConnect = this.isPeptideConnected(iLastResidue, iResidue)
          let nucleotideConnect = this.isSugarPhosphateConnected(iLastResidue, iResidue)
          if (!peptideConnect && !nucleotideConnect) {
            makeNewTrace()
          }
        }
        this.trace.indices.push(iResidue)
        this.trace.points.push(v3.clone(residue.central_atom.pos))
        let normal = null
        if (residues[iResidue].normal) {
          normal = residues[iResidue].normal
        }
        this.trace.normals.push(normal)
      }
    }

    // flip normals so that they are all pointing in same direction
    // within the same piece of chain
    for (let trace of this.traces) {
      for (let i of _.range(1, trace.indices.length)) {
        if (trace.getReferenceObject(i).ss !== 'D' &&
            trace.getReferenceObject(i - 1).ss !== 'D') {
          let normal = trace.normals[i]
          let prevNormal = trace.normals[i - 1]
          if (normal !== null && prevNormal !== null)
            if (normal.dot(prevNormal) < 0) {
              trace.normals[i].negate()
            }
        }
      }
    }

    for (let trace of this.traces) {
      trace.expand()
    }
  }

  getAtomColor (iAtom) {
    let atom = this.protein.atoms[iAtom]
    if (atom.elem === 'C' || atom.elem === 'H') {
      let res = this.protein.res_by_id[atom.res_id]
      return res.color
    } else if (atom.elem in data.ElementColors) {
      return data.ElementColors[atom.elem]
    }
    return data.darkGrey
  }

  assignBondsToResidues () {
    for (let res of this.protein.residues) {
      res.bonds = []
    }

    for (let bond of this.protein.bonds) {
      let atom1 = bond.atom1
      let atom2 = bond.atom2

      if (atom1.is_alt || atom2.is_alt) {
        continue
      }

      let res1 = this.protein.res_by_id[atom1.res_id]
      let res2 = this.protein.res_by_id[atom2.res_id]

      res1.bonds.push(bond)

      if (res1 !== res2) {
        res2.bonds.push(bond)
      }
    }
  }

  buildLights () {
    let directionalLight = new THREE.DirectionalLight(0xFFFFFF)
    directionalLight.position.copy(
      new TV3(0.2, 0.2, 100).normalize())
    directionalLight.dontDelete = true
    this.lights.push(directionalLight)

    let directionalLight2 = new THREE.DirectionalLight(0xFFFFFF)
    directionalLight2.position.copy(
      new TV3(0.2, 0.2, -100).normalize())
    directionalLight2.dontDelete = true
    this.lights.push(directionalLight2)

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

    // calculate protein parameters
    this.assignBondsToResidues()

    // generate the trace for ribbons and tubes
    this.findContinuousTraces()

    this.gridControlWidget.findLimits()

    // create default Meshes
    this.buildMeshOfRibbons()
    this.buildMeshOfGrid()
    // this.buildMeshOfNucleotides()
    this.buildMeshOfArrows()
    this.clearMesh('sidechains')

    this.rebuildSceneWithMeshes()
  }

  /**
   * Clears a mesh and/or creates a mesh entry in mesh collection,
   * so that a mesh collection can be altered independently of
   * other meshes
   *
   * @param meshName - the name for a mesh collection
   */
  clearMesh (meshName) {
    if (!(meshName in this.displayMeshes)) {
      this.displayMeshes[meshName] = new THREE.Object3D()
    } else {
      clearObject3D(this.displayMeshes[meshName])
    }
    if (!(meshName in this.pickingMeshes)) {
      this.pickingMeshes[meshName] = new THREE.Object3D()
    } else {
      clearObject3D(this.pickingMeshes[meshName])
    }
  }

  /**
   * Rebuild scene from meshes in this.displayMeshes &
   * this.pickingMeshes
   */
  rebuildSceneWithMeshes () {
    clearObject3D(this.displayScene)
    clearObject3D(this.pickingScene)
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
        console.log('> ProteinDisplay.' + buildMeshOfFunctionName)
        this[buildMeshOfFunctionName]()
        this.updateMeshesInScene = true
      }
    }
    if (meshName in this.displayMeshes) {
      setVisible(this.displayMeshes[meshName], visible)
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

    if (exists(this.displayMeshes.grid)) {
      for (let mesh of [this.displayMeshes.grid, this.pickingMeshes.grid]) {
        mesh.traverse(child => {
          if (exists(child.i)) {
            child.visible = this.isVisibleGridAtom(child.i)
          }
        })
      }
    }

    for (let trace of this.traces) {
      for (let i of _.range(trace.indices.length)) {
        let iRes = trace.indices[i]
        let residue = trace.getReferenceObject(i)
        let residueShow = show.sidechain || residue.selected
        if (residueShow && !exists(residue.mesh)) {
          this.buildMeshOfSidechain(iRes)
          this.updateMeshesInScene = true
          residue.mesh = true
        }
      }
    }

    if (exists(this.displayMeshes.sidechains)) {
      for (let mesh of [this.displayMeshes.sidechains, this.pickingMeshes.sidechains]) {
        mesh.traverse(child => {
          if (exists(child.i)) {
            let residue = this.protein.residues[child.i]
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
    let atom = this.protein.atoms[iAtom]
    let matrix = getSphereMatrix(atom.pos, this.radius)
    let unitGeom = this.unitSphereGeom
    mergeUnitGeom(geom, unitGeom, this.getAtomColor(iAtom), matrix)
    mergeUnitGeom(pickGeom, unitGeom, data.getIndexColor(iAtom), matrix)
  }

  mergeBondsInResidue (geom, iRes, bondFilterFn) {
    let residue = this.protein.residues[iRes]
    let unitGeom = new UnitCylinderGeometry()
    let color = residue.color
    let p1, p2
    for (let bond of residue.bonds) {
      if (bondFilterFn && !bondFilterFn(bond)) {
        continue
      }
      p1 = bond.atom1.pos
      p2 = bond.atom2.pos
      if (bond.atom1.res_id !== bond.atom2.res_id) {
        let midpoint = p2.clone().add(p1).multiplyScalar(0.5)
        if (bond.atom1.res_id === residue.id) {
          p2 = midpoint
        } else if (bond.atom2.res_id === residue.id) {
          p1 = midpoint
        }
      }
      mergeUnitGeom(geom, unitGeom, color, getCylinderMatrix(p1, p2, 0.2))
    }
  }

  addGeomToDisplayMesh (meshName, geom) {
    if (geom.vertices === 0) {
      return
    }
    this.displayMeshes[meshName].add(
      new THREE.Mesh(geom, this.displayMaterial)
    )
  }

  addGeomToPickingMesh (meshName, geom) {
    if (geom.vertices === 0) {
      return
    }
    this.pickingMeshes[meshName].add(
      new THREE.Mesh(geom, this.pickingMaterial)
    )
  }

  buildMeshOfRibbons () {
    this.clearMesh('ribbons')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReferenceObject(i)
        let face = data.getSsFace(res.ss)
        let color = res.color
        let isRound = res.ss === 'C'
        let isFront = ((i === 0) ||
          (res.ss !== trace.getReferenceObject(i - 1).ss))
        let isBack = ((i === n - 1) ||
          (res.ss !== trace.getReferenceObject(i + 1).ss))
        let resGeom = trace.getSegmentGeometry(
          i, face, isRound, isFront, isBack, color)
        displayGeom.merge(resGeom)
        let atom = res.central_atom
        setGeometryVerticesColor(resGeom, data.getIndexColor(atom.i))
        pickingGeom.merge(resGeom)
      }
    }
    this.addGeomToDisplayMesh('ribbons', displayGeom)
    this.addGeomToPickingMesh('ribbons', pickingGeom)
  }

  buildMeshOfArrows () {
    this.clearMesh('arrows')

    let geom = new THREE.Geometry()
    let blockArrowGeometry = new BlockArrowGeometry()
    blockArrowGeometry.computeFaceNormals()

    let obj = new THREE.Object3D()

    for (let trace of this.traces) {
      for (let i of _.range(trace.points.length)) {
        let point = trace.points[i]
        let tangent = trace.tangents[i]
        let normal = trace.binormals[i]
        let target = point.clone().add(tangent)

        let res = trace.getReferenceObject(i)
        let color = data.getDarkSsColor(res.ss)
        setGeometryVerticesColor(blockArrowGeometry, color)

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
    this.clearMesh('tube')
    let geom = new THREE.Geometry()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let res = trace.getReferenceObject(i)
        let color = res.color
        let isRound = true
        let isFront = (i === 0)
        let isBack = (i === n - 1)
        let resGeom = trace.getSegmentGeometry(
          i, data.fatCoilFace, isRound, isFront, isBack, color)
        geom.merge(resGeom)
        let iAtom = res.central_atom.i
        setGeometryVerticesColor(resGeom, new THREE.Color().setHex(iAtom))
      }
    }
    this.addGeomToDisplayMesh('tube', geom)
  }

  buildMeshOfSidechain (iRes) {
    let residue = this.protein.residues[iRes]
    if (!residue.is_protein_or_nuc) {
      return
    }

    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()

    this.mergeBondsInResidue(
      displayGeom, iRes, bond => {
        return !_.includes(data.backboneAtoms, bond.atom1.type) ||
               !_.includes(data.backboneAtoms, bond.atom2.type)
      })

    for (let atom of _.values(residue.atoms)) {
      if (!inArray(atom.type, data.backboneAtoms)) {
        atom.is_sidechain = true
        let matrix = getSphereMatrix(atom.pos, this.radius)
        mergeUnitGeom(
          displayGeom, this.unitSphereGeom, this.getAtomColor(atom.i), matrix)
        mergeUnitGeom(
          pickingGeom, this.unitSphereGeom, data.getIndexColor(atom.i), matrix)
      }
    }

    let displayMesh = new THREE.Mesh(displayGeom, this.displayMaterial)
    displayMesh.i = iRes
    this.displayMeshes.sidechains.add(displayMesh)

    let pickingMesh = new THREE.Mesh(pickingGeom, this.pickingMaterial)
    pickingMesh.i = iRes
    this.pickingMeshes.sidechains.add(pickingMesh)
  }

  buildMeshOfBackbone () {
    this.clearMesh('backbone')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let [iRes, residue] of this.protein.residues.entries()) {
      if (residue.is_protein_or_nuc) {
        for (let bond of residue.bonds) {
          this.mergeBondsInResidue(
            displayGeom, iRes, bond => {
              return _.includes(data.backboneAtoms, bond.atom1.type) &&
                     _.includes(data.backboneAtoms, bond.atom2.type)
            })
        }
        for (let atom of _.values(residue.atoms)) {
          if (inArray(atom.type, data.backboneAtoms)) {
            this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
          }
        }
      }
    }
    this.addGeomToDisplayMesh('backbone', displayGeom)
    this.addGeomToPickingMesh('backbone', pickingGeom)
  }

  buildMeshOfLigands () {
    this.clearMesh('ligands')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let [iRes, residue] of this.protein.residues.entries()) {
      if (residue.is_ligands) {
        this.mergeBondsInResidue(displayGeom, iRes)
        for (let atom of _.values(residue.atoms)) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
        }
      }
    }
    this.addGeomToDisplayMesh('ligands', displayGeom)
    this.addGeomToPickingMesh('ligands', pickingGeom)
  }

  buildMeshOfWater () {
    this.clearMesh('water')
    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()
    for (let [iRes, residue] of this.protein.residues.entries()) {
      if (residue.is_water) {
        this.mergeBondsInResidue(displayGeom, iRes)
        for (let atom of _.values(residue.atoms)) {
          this.mergeAtomToGeom(displayGeom, pickingGeom, atom.i)
        }
      }
    }
    this.addGeomToDisplayMesh('water', displayGeom)
    this.addGeomToPickingMesh('water', pickingGeom)
  }

  isVisibleGridAtom (iAtom) {
    let atom = this.protein.atoms[iAtom]
    let isAtomInRange = atom.bfactor > this.scene.grid
    let isAtomElemSelected = this.scene.grid_atoms[atom.elem]
    return isAtomElemSelected && isAtomInRange
  }

  buildMeshOfGrid () {
    if (!this.isGrid) {
      return
    }
    this.clearMesh('grid')
    for (let residue of this.protein.residues) {
      if (residue.is_grid) {
        for (let atom of _.values(residue.atoms)) {
          if (this.isVisibleGridAtom(atom.i)) {
            let radius = 0.35

            let material = new THREE.MeshLambertMaterial({
              color: this.getAtomColor(atom.i)
            })
            let mesh = new THREE.Mesh(this.unitSphereGeom, material)
            mesh.scale.set(radius, radius, radius)
            mesh.position.copy(atom.pos)
            mesh.i = atom.i
            this.displayMeshes.grid.add(mesh)

            let indexMaterial = new THREE.MeshBasicMaterial({
              color: data.getIndexColor(atom.i)
            })
            let pickingMesh = new THREE.Mesh(this.unitSphereGeom, indexMaterial)
            pickingMesh.scale.set(radius, radius, radius)
            pickingMesh.position.copy(atom.pos)
            pickingMesh.i = atom.i
            this.pickingMeshes.grid.add(pickingMesh)
          }
        }
      }
    }
  }

  buildMeshOfNucleotides () {
    this.clearMesh('basepairs')

    let displayGeom = new THREE.Geometry()
    let pickingGeom = new THREE.Geometry()

    let cylinderGeom = new UnitCylinderGeometry()

    for (let residue of this.protein.residues) {
      if (residue.ss !== 'D' || !residue.is_protein_or_nuc) {
        continue
      }

      let basepairGeom = new THREE.Geometry()

      let atomTypes, bondTypes
      if (residue.type === 'DA' || residue.type === 'A') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']
        ]
      } else if (residue.type === 'DG' || residue.type === 'G') {
        atomTypes = ['N9', 'C8', 'N7', 'C5', 'C6', 'N1', 'C2', 'N3', 'C4']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N9']
        ]
      } else if (residue.type === 'DT' || residue.type === 'U') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']
        ]
      } else if (residue.type === 'DC' || residue.type === 'C') {
        atomTypes = ['C6', 'N1', 'C2', 'N3', 'C4', 'C5']
        bondTypes = [['C3\'', 'C2\''], ['C2\'', 'C1\''], ['C1\'', 'N1']
        ]
      } else {
        continue
      }
      let vertices = getVerticesFromAtomDict(residue.atoms, atomTypes)
      basepairGeom.merge(new RaisedShapeGeometry(vertices, 0.3))

      let radius = 0.2
      for (let bond of bondTypes) {
        let vertices = getVerticesFromAtomDict(residue.atoms, [bond[0], bond[1]])
        basepairGeom.merge(cylinderGeom, getCylinderMatrix(vertices[0], vertices[1], radius))
      }

      basepairGeom.computeFaceNormals()

      setGeometryVerticesColor(basepairGeom, residue.color)
      displayGeom.merge(basepairGeom)

      setGeometryVerticesColor(basepairGeom, data.getIndexColor(residue.central_atom.i))
      pickingGeom.merge(basepairGeom)
    }

    this.addGeomToDisplayMesh('basepairs', displayGeom)
    this.addGeomToPickingMesh('basepairs', pickingGeom)
  }

  buildCrossHairs () {
    let radius = 1.2,
      segments = 60,
      material = new THREE.LineDashedMaterial(
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
   * Draw/Animate Graphical objects
   ******************************************
   */

  isChanged () {
    return this.scene.changed
  }

  updateCrossHairs () {
    this.crossHairs.position.copy(this.cameraTarget)
    this.crossHairs.lookAt(this.camera.position)
    this.crossHairs.updateMatrix()
  }

  draw () {
    if (_.isUndefined(this.displayMeshes)) {
      return
    }
    if (!this.isChanged()) {
      return
    }

    this.resize()

    this.setCameraFromCurrentView()

    this.selectVisibleMeshes()

    this.updateCrossHairs()

    // needs to be drawn before render
    this.distanceWidget.draw()
    this.zSlabWidget.draw()
    this.gridControlWidget.draw()
    this.sequenceWidget.draw()

    // leave this to the very last moment
    // to avoid the dreaded black canvas
    if (!exists(this.renderer)) {
      this.initWebglRenderer()
    }

    // renders visible meshes to the gpu
    this.renderer.render(this.displayScene, this.camera)

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

    let t = 1.0 / nStep

    let old = {
      cameraTarget: this.cameraTarget.clone(),
      cameraPosition: this.camera.position.clone(),
      cameraUp: this.camera.up.clone(),
      zFront: this.zFront,
      zBack: this.zBack
    }

    let oldCameraDirection = old.cameraPosition.clone()
      .sub(old.cameraTarget)
    let oldZoom = oldCameraDirection.length()
    oldCameraDirection.normalize()

    let target = convertViewToTarget(this.scene.target_view)
    let targetCameraDirection =
      target.cameraPosition.clone()
        .sub(target.cameraTarget)
    let targetZoom = targetCameraDirection.length()
    targetCameraDirection.normalize()

    let targetCameraDirRotation = getUnitVectorRotation(
      oldCameraDirection, targetCameraDirection)

    let rotatedCameraUp = old.cameraUp.clone()
      .applyQuaternion(targetCameraDirRotation)

    let newCameraRotation = getUnitVectorRotation(
      rotatedCameraUp, target.cameraUp)
    newCameraRotation.multiply(
      targetCameraDirRotation)
    newCameraRotation = getFractionRotation(
      newCameraRotation, t)

    let current = {}
    let disp
    disp = target.cameraTarget.clone()
      .sub(old.cameraTarget)
      .multiplyScalar(t)
    current.cameraTarget = old.cameraTarget.clone()
      .add(disp)
    let zoom = fraction(oldZoom, targetZoom, t)
    disp = oldCameraDirection.clone()
      .applyQuaternion(newCameraRotation)
      .multiplyScalar(zoom)
    current.cameraPosition = current.cameraTarget.clone()
      .add(disp)
    current.cameraUp = old.cameraUp.clone()
      .applyQuaternion(newCameraRotation)
    current.zFront = fraction(old.zFront, target.zFront, t)
    current.zBack = fraction(old.zBack, target.zBack, t)

    let view = convertTargetToView(current)
    view.copy_metadata_from_view(this.scene.target_view)
    this.controller.set_current_view(view)

    this.updateHover()
  }

  /**
   ******************************************
   * Handle camera
   ******************************************
   */

  setTargetFromResId (resId) {
    let atom = this.protein.res_by_id[resId].central_atom
    this.setTargetFromAtom(atom.i)
  }

  setTargetFromAtom (iAtom) {
    let atom = this.protein.atoms[iAtom]
    let position = v3.clone(atom.pos)
    let sceneDisplacement = position.clone()
      .sub(this.cameraTarget)

    let view = convertTargetToView({
      cameraTarget: position,
      cameraPosition: this.camera.position.clone()
        .add(sceneDisplacement),
      cameraUp: this.camera.up.clone(),
      zFront: this.zFront,
      zBack: this.zBack
    })

    view.copy_metadata_from_view(this.scene.current_view)
    view.res_id = atom.res_id
    view.i_atom = atom.i
    this.scene.target_view = view

    this.scene.is_new_view_chosen = true
    this.scene.n_update_step = this.scene.max_update_step
  }

  setCameraFromCurrentView () {
    let target = convertViewToTarget(
      this.scene.current_view
    )

    let cameraDirection = this.camera.position.clone()
      .sub(this.cameraTarget)
      .normalize()

    let targetCameraDirection = target.cameraPosition.clone()
      .sub(target.cameraTarget)
    this.zoom = targetCameraDirection.length()
    targetCameraDirection.normalize()

    let rotation = getUnitVectorRotation(
      cameraDirection, targetCameraDirection)

    for (let i = 0; i < this.lights.length; i += 1) {
      this.lights[i].position.applyQuaternion(rotation)
    }

    this.cameraTarget.copy(target.cameraTarget)
    this.camera.position.copy(target.cameraPosition)
    this.camera.up.copy(target.cameraUp)

    this.zFront = target.zFront
    this.zBack = target.zBack

    let far = this.zoom + this.zBack
    let near = this.zoom + this.zFront
    if (near < 1) {
      near = 1
    }

    this.camera.near = near
    this.camera.far = far
    this.camera.lookAt(this.cameraTarget)
    this.camera.updateProjectionMatrix()

    this.displayScene.fog.near = near
    this.displayScene.fog.far = far

    let residues = this.protein.residues
    let view = this.scene.current_view
    for (let i = 0; i < residues.length; i += 1) {
      residues[i].selected = false
    }
    for (let i = 0; i < view.selected.length; i += 1) {
      let i_res = view.selected[i]
      residues[i_res].selected = true
    }
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    let y = this.camera.up
    let z = this.camera.position.clone()
      .sub(this.cameraTarget)
      .normalize()
    let x = (new TV3())
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

    let newZoom = zoomRatio * this.zoom

    if (newZoom < 2) {
      newZoom = 2
    }

    let cameraPosition = this.camera.position.clone()
      .sub(this.cameraTarget)
      .applyQuaternion(rotation)
      .normalize()
      .multiplyScalar(newZoom)
      .add(this.cameraTarget)

    let view = convertTargetToView({
      cameraTarget: this.cameraTarget.clone(),
      cameraPosition: cameraPosition,
      cameraUp: this.camera.up.clone()
        .applyQuaternion(rotation),
      zFront: this.zFront,
      zBack: this.zBack
    })

    view.copy_metadata_from_view(this.scene.current_view)

    this.controller.set_current_view(view)
  }

  resize () {
    if (!exists(this.renderer)) {
      return
    }

    this.camera.aspect = this.width() / this.height()
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.width(), this.height())

    this.pickingTexture.setSize(this.width(), this.height())

    this.zSlabWidget.resize()
    this.gridControlWidget.resize()
    this.sequenceWidget.resize()

    this.controller.flag_changed()
  }

  width () {
    return this.mainDiv.width()
  }

  height () {
    return this.mainDiv.height()
  }

  getMouse (event) {
    if (exists(event.touches) && (event.touches.length > 0)) {
      this.eventX = event.touches[0].clientX
      this.eventY = event.touches[0].clientY
    } else {
      this.eventX = event.clientX
      this.eventY = event.clientY
    }

    let result = getDomPosition(this.mainDiv[0])
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

  getZ (pos) {
    let origin = this.cameraTarget.clone()

    let cameraDir = origin.clone()
      .sub(this.camera.position)
      .normalize()

    let posRelativeToOrigin = pos.clone()
      .sub(origin)

    return posRelativeToOrigin.dot(cameraDir)
  }

  inZlab (pos) {
    let z = this.getZ(pos)

    return ((z >= this.zFront) && (z <= this.zBack))
  }

  opacity (pos) {
    let z = this.getZ(pos)

    if (z < this.zFront) {
      return 1.0
    }

    if (z > this.zBack) {
      return 0.0
    }

    return 1 - (z - this.zFront) / (this.zBack - this.zFront)
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
      this.pickingScene, this.camera, this.pickingTexture)

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

    if (i < this.protein.atoms.length) {
      return i
    }

    return null

  }

  posXY (pos) {
    let widthHalf = 0.5 * this.width()
    let heightHalf = 0.5 * this.height()

    let vector = pos.clone().project(this.camera)

    return {
      x: (vector.x * widthHalf) + widthHalf,
      y: -(vector.y * heightHalf) + heightHalf
    }
  }

  atomLabelDialog () {
    let i_atom = this.scene.current_view.i_atom
    if (i_atom >= 0) {
      let controller = this.controller

      function success (text) {
        controller.make_label(i_atom, text)
      }

      let atom = this.protein.atoms[i_atom]
      let label = 'Label atom : ' + atom.label

      textEntryDialog(this.mainDiv, label, success)
    }
  }

  updateHover () {
    if (this.getIAtomHover() !== null) {
      this.iHoverAtom = this.getIAtomHover()
    } else {
      this.iHoverAtom = null
    }

    if (this.iHoverAtom) {
      let atom = this.protein.atoms[this.iHoverAtom]
      let text = atom.label
      if (atom === this.scene.centered_atom()) {
        text = '<div style="text-align: center">'
        text += atom.res_id + '-' + atom.name
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

  doubleclick () {
    if (this.iHoverAtom !== null) {
      if (this.iHoverAtom === this.scene.centered_atom().i) {
        this.atomLabelDialog()
      } else {
        this.setTargetFromAtom(this.iHoverAtom)
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
      let v = this.posXY(this.protein.atoms[this.iDownAtom].pos)

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
          yRotationAngle = degToRad(this.mouseX - this.saveMouseX)
          xRotationAngle = degToRad(this.mouseY - this.saveMouseY)
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
    if (exists(event.wheelDelta)) {
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
          this.controller.make_dist(
            this.protein.atoms[this.iHoverAtom],
            this.protein.atoms[this.iDownAtom])
        }
      }

      this.lineElement.hide()

      this.isDraggingCentralAtom = false
    }

    if (exists(event.touches)) {
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
      degToRad(event.rotation * 2 - this.lastPinchRotation),
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

export {ProteinDisplay}
