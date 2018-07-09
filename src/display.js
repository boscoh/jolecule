import $ from 'jquery'
import _ from 'lodash'
import * as THREE from 'three'
import Signal from 'signals'

import v3 from './v3'
import * as util from './util'
import * as glgeom from './glgeom'
import widgets from './widgets'
import * as data from './data'
import { interpolateCameras } from './soup'
import { registerGlobalAnimationLoop } from './animation'


/**
 * Utility class to handle a three.js HTML object with
 * a standard set of features:
 *  - instantiate a <div> and <canvas> element
 *  - camera object
 *  - display scene
 *  - picking scene, with helpful picking functions
 *  - a status messaging in the div
 *  - input handlers for mouse
 */
class WebglWidget {
  constructor (divTag, backgroundColor) {
    this.divTag = divTag
    this.div = $(this.divTag)
    this.div.css('overflow', 'hidden')

    this.backgroundColor = backgroundColor
    this.div.css('background-color', this.backgroundColor)

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
    this.displayMaterial = new THREE.MeshPhongMaterial(
      {vertexColors: THREE.VertexColors})

    this.pickingScene = new THREE.Scene()
    this.pickingTexture = new THREE.WebGLRenderTarget(this.width(), this.height())
    this.pickingTexture.texture.minFilter = THREE.LinearFilter

    this.pickingMeshes = {}
    this.pickingMaterial = new THREE.MeshBasicMaterial(
      {vertexColors: THREE.VertexColors})

    this.representations = {}

    this.lights = []
    this.buildLights()

    // div to display processing messages
    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .addClass('jolecule-loading-message')
    this.setMesssage('Loading data...')

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
    this.downTimer = null
  }

  initWebglRenderer () {
    this.renderer = new THREE.WebGLRenderer({antialias: true})
    this.renderer.setClearColor(this.backgroundColor)
    this.renderer.setSize(this.width(), this.height())

    let dom = this.renderer.domElement
    this.webglDiv[0].appendChild(dom)

    const bind = (w, fn) => { dom.addEventListener(w, fn) }
    bind('mousedown', e => this.mousedown(e))
    bind('mousemove', e => this.mousemove(e))
    bind('mouseup', e => this.mouseup(e))
    bind('mouseout', e => this.mouseout(e))
    bind('mousewheel', e => this.mousewheel(e))
    // bind('dblclick', e => this.doubleclick(e))
    bind('DOMMouseScroll', e => this.mousewheel(e))
    bind('touchstart', e => this.mousedown(e))
    bind('touchmove', e => this.mousemove(e))
    bind('touchend', e => this.mouseup(e))
    bind('touchcancel', e => this.mouseup(e))
    bind('gesturestart', e => this.gesturestart(e))
    bind('gesturechange', e => this.gesturechange(e))
    bind('gestureend', e => this.gestureend(e))
  }

  render () {
    // leave this to the very last moment
    // to avoid the dreaded black canvas
    if (!util.exists(this.renderer)) {
      this.initWebglRenderer()
    }

    // renders visible meshes to the gpu
    this.renderer.render(this.displayScene, this.camera)
  }

  getPosXY (pos) {
    let widthHalf = 0.5 * this.width()
    let heightHalf = 0.5 * this.height()

    let vector = pos.clone().project(this.camera)

    return {
      x: (vector.x * widthHalf) + widthHalf + this.x(),
      y: -(vector.y * heightHalf) + heightHalf + this.y()
    }
  }

  getPickColorFromMouse () {
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

    // interpret the color as an Uint8 integer
    return (
      (pixelBuffer[0] << 16) |
      (pixelBuffer[1] << 8) |
      (pixelBuffer[2])
    )
  }

  setCameraParams (cameraParams) {
    // rotate lights to soupView orientation
    let cameraDirection = this.cameraParams.position.clone()
      .sub(this.cameraParams.focus)
      .normalize()
    let viewCameraDirection = cameraParams.position.clone()
      .sub(cameraParams.focus)
    viewCameraDirection.normalize()
    let rotation = glgeom.getUnitVectorRotation(
      cameraDirection, viewCameraDirection)
    for (let i = 0; i < this.lights.length; i += 1) {
      this.lights[i].position.applyQuaternion(rotation)
    }

    this.cameraParams = cameraParams

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

    this.displayScene.fog.near = this.cameraParams.zoom
    this.displayScene.fog.far = far
  }

  buildLights () {
    let directedLight = new THREE.DirectionalLight(0xFFFFFF)
    directedLight.position.copy(
      v3.create(0.2, 0.2, -100).normalize())
    directedLight.dontDelete = true
    this.lights.push(directedLight)

    let ambientLight = new THREE.AmbientLight(0x606060, 1)
    ambientLight.dontDelete = true
    this.lights.push(ambientLight)

    for (let i = 0; i < this.lights.length; i += 1) {
      this.displayScene.add(this.lights[i])
    }
  }

  resize () {
    let position = this.div.position()
    this.webglDiv.css('left', this.x() + position.left)
    this.webglDiv.css('top', this.y() + position.top)

    this.camera.aspect = this.width() / this.height()
    this.camera.updateProjectionMatrix()

    this.pickingTexture.setSize(this.width(), this.height())

    if (util.exists(this.renderer)) {
      this.renderer.setSize(this.width(), this.height())
    }
  }

  setMesssage (message) {
    console.log('Display.setProcessingMessage:', message)
    this.messageDiv.html(message).show()
    util.stickJqueryDivInTopLeft(this.div, this.messageDiv, 120, 20)
  };

  async asyncSetMesssage (message) {
    this.setMesssage(message)
    await util.delay(0)
  };

  cleanupMessage () {
    this.messageDiv.hide()
  };

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
  rebuildSceneFromMeshes () {
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

  addRepresentation (name, repr) {
    this.representations[name] = repr
    this.displayMeshes[name] = repr.displayObj
    this.pickingMeshes[name] = repr.pickingObj
    this.updateMeshesInScene = true
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
    if (meshName in this.displayMeshes) {
      glgeom.setVisible(this.displayMeshes[meshName], visible)
    }
    if (meshName in this.pickingMeshes) {
      glgeom.setVisible(this.pickingMeshes[meshName], visible)
    }
  }

  x () {
    return 0
  }

  y () {
    return 0
  }

  width () {
    let width = this.div.width() - this.x()
    return width
  }

  height () {
    let height = this.div.height() - this.y()
    return height
  }

  getPointer (event) {
    if (util.exists(event.touches) && (event.touches.length > 0)) {
      this.eventX = event.touches[0].clientX
      this.eventY = event.touches[0].clientY
    } else {
      this.eventX = event.clientX
      this.eventY = event.clientY
    }

    let rect = event.target.getBoundingClientRect()
    this.mouseX = this.eventX - rect.left
    this.mouseY = this.eventY - rect.top

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

  savePointer () {
    this.saveMouseX = this.mouseX
    this.saveMouseY = this.mouseY
    this.saveMouseR = this.mouseR
    this.saveMouseT = this.mouseT
  }

}

/*******************************************************
 * Representations of the Protein as THREE.JS meshes
 *******************************************************
 */

let pickingMaterial = new THREE.MeshBasicMaterial(
  {vertexColors: THREE.VertexColors})
let displayMaterial = new THREE.MeshPhongMaterial(
  {vertexColors: THREE.VertexColors})
let atomRadius = 0.35
let gridAtomRadius = 1.0

function getIndexColor (i) {
  return new THREE.Color().setHex(i + 1)
}

function transferObjects(fromObj, toObj) {
  for (let child of fromObj.children) {
    toObj.add(child)
  }
}

/**
 * constructs THREE.js geometries from protein object:
 *  1. a displayGeom
 *  2. a pickingGeom
 */
class ArrowRepresentation {
  constructor (soup) {
    this.soup = soup
    this.traces = soup.traces
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)
    let nCopy = 0
    for (let trace of this.traces) {
      nCopy += trace.points.length
    }

    let unitGeom = new glgeom.BlockArrowGeometry()
    let unitBufferGeom = new THREE.BufferGeometry().fromGeometry(unitGeom)

    this.displayGeom = new glgeom.CopyBufferGeometry(unitBufferGeom, nCopy)
    this.pickingGeom = new glgeom.CopyBufferGeometry(unitBufferGeom, nCopy)

    let obj = new THREE.Object3D()

    let iCopy = 0
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let point = trace.points[i]
        let tangent = trace.tangents[i]
        let normal = trace.binormals[i]
        let target = point.clone().add(tangent)

        obj.matrix.identity()
        obj.position.copy(point)
        obj.up.copy(normal)
        obj.lookAt(target)
        obj.updateMatrix()

        this.displayGeom.applyMatrixToCopy(obj.matrix, iCopy)
        this.pickingGeom.applyMatrixToCopy(obj.matrix, iCopy)
        this.pickingGeom.applyColorToCopy(trace.indexColors[i], iCopy)

        iCopy += 1
      }
    }

    this.recolor()

    this.displayObj.add(new THREE.Mesh(this.displayGeom, displayMaterial))
    this.pickingObj.add(new THREE.Mesh(this.pickingGeom, pickingMaterial))
  }

  recolor () {
    let iCopy = 0
    let residue = this.soup.getResidueProxy()
    for (let trace of this.traces) {
      let n = trace.points.length
      for (let i of _.range(n)) {
        let iRes = trace.refIndices[i]
        let color = residue.load(iRes).activeColor
        this.displayGeom.applyColorToCopy(color, iCopy)
        iCopy += 1
      }
    }
    this.displayGeom.attributes.color.needsUpdate = true
  }
}

class RibbonRepresentation {
  constructor (soup) {
    this.soup = soup
    this.traces = soup.traces
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)
    this.displayGeom = new glgeom.BufferRibbonGeometry(
      this.traces, data.coilFace)
    this.pickingGeom = new glgeom.BufferRibbonGeometry(
      this.traces, data.coilFace, true)
    let displayMesh = new THREE.Mesh(this.displayGeom, displayMaterial)
    let pickingMesh = new THREE.Mesh(this.pickingGeom, pickingMaterial)
    this.displayObj.add(displayMesh)
    this.pickingObj.add(pickingMesh)
    this.recolor()
  }

  recolor () {
    let residue = this.soup.getResidueProxy()
    for (let trace of this.traces) {
      for (let iTrace of _.range(trace.points.length)) {
        let iRes = trace.refIndices[iTrace]
        trace.colors[iTrace] = residue.load(iRes).activeColor
      }
    }
    this.displayGeom.setColors()
  }
}

class AtomsRepresentation {
  constructor (soup, atomIndices, atomRadius) {
    this.soup = soup
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.atomIndices = atomIndices
    this.atomRadius = atomRadius
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)
    if (this.atomIndices.length === 0) {
      return
    }
    let nCopy = this.atomIndices.length
    let sphereBufferGeometry = new THREE.SphereBufferGeometry(1, 8, 8)
    this.displayGeom = new glgeom.CopyBufferGeometry(sphereBufferGeometry, nCopy)
    let pickingGeom = new glgeom.CopyBufferGeometry(sphereBufferGeometry, nCopy)

    let atom = this.soup.getAtomProxy()
    for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
      let iAtom = this.atomIndices[iCopy]
      atom.iAtom = iAtom
      let matrix = glgeom.getSphereMatrix(atom.pos, this.atomRadius)
      this.displayGeom.applyMatrixToCopy(matrix, iCopy)
      pickingGeom.applyMatrixToCopy(matrix, iCopy)
      this.displayGeom.applyColorToCopy(atom.color, iCopy)
      pickingGeom.applyColorToCopy(getIndexColor(iAtom), iCopy)
    }

    this.displayObj.add(new THREE.Mesh(this.displayGeom, displayMaterial))
    this.pickingObj.add(new THREE.Mesh(pickingGeom, pickingMaterial))
  }

  recolor () {
    if (this.atomIndices.length === 0) {
      return
    }
    let nCopy = this.atomIndices.length
    let atom = this.soup.getAtomProxy()
    for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
      atom.iAtom = this.atomIndices[iCopy]
      this.displayGeom.applyColorToCopy(atom.color, iCopy)
    }
  }
}

class GridRepresentation extends AtomsRepresentation {
  constructor (soup, radius) {
    super(soup, [], radius)
  }

  build () {
    let grid = this.soup.grid
    this.atomIndices = []
    let residue = this.soup.getResidueProxy()
    let atom = this.soup.getAtomProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss === 'G') {
        atom.iAtom = residue.iAtom
        if ((atom.bfactor > grid.bCutoff) && grid.isElem[atom.elem]) {
          this.atomIndices.push(atom.iAtom)
        }
      }
    }
    super.build()
  }
}

class BondsRepresentation {
  constructor (soup, bondIndices) {
    this.soup = soup
    this.bondIndices = bondIndices
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)
    let bondIndices = this.bondIndices
    if (bondIndices.length === 0) {
      return
    }
    let nCopy = bondIndices.length

    let cylinderBufferGeometry = new THREE.CylinderBufferGeometry(1, 1, 1, 4, 1, false)
    cylinderBufferGeometry.applyMatrix(
      new THREE.Matrix4()
        .makeRotationFromEuler(
          new THREE.Euler(Math.PI / 2, Math.PI, 0)))

    this.displayGeom = new glgeom.CopyBufferGeometry(cylinderBufferGeometry, nCopy)

    let atom1 = this.soup.getAtomProxy()
    let atom2 = this.soup.getAtomProxy()
    let bond = this.soup.getBondProxy()
    let residue = this.soup.getResidueProxy()

    for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
      bond.iBond = bondIndices[iCopy]
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

      this.displayGeom.applyMatrixToCopy(matrix, iCopy)
      this.displayGeom.applyColorToCopy(residue.activeColor, iCopy)
    }

    let displayMesh = new THREE.Mesh(this.displayGeom, displayMaterial)
    this.displayObj.add(displayMesh)
  }

  recolor () {
    let bondIndices = this.bondIndices
    if (bondIndices.length === 0) {
      return
    }
    let nCopy = bondIndices.length

    let bond = this.soup.getBondProxy()
    let atom1 = this.soup.getAtomProxy()
    let residue = this.soup.getResidueProxy()

    for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
      bond.iBond = bondIndices[iCopy]
      atom1.iAtom = bond.iAtom1
      residue.iRes = atom1.iRes
      this.displayGeom.applyColorToCopy(residue.activeColor, iCopy)
    }
  }
}

class LigandRepresentation {
  constructor (soup, radius) {
    this.soup = soup
    this.radius = radius
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)

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

    this.atomRepr = new AtomsRepresentation(this.soup, atomIndices, this.radius)
    this.bondRepr = new BondsRepresentation(this.soup, bondIndices)
    if (atomIndices.length > 0) {
      transferObjects(this.atomRepr.displayObj, this.displayObj)
      transferObjects(this.bondRepr.displayObj, this.displayObj)
      transferObjects(this.atomRepr.pickingObj, this.pickingObj)
    }
  }
}

class WaterRepresentation extends AtomsRepresentation {
  constructor (soup, radius) {
    super(soup, [], radius)
    this.name = 'water'
    this.atomIndices = []
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.resType === 'HOH') {
        this.atomIndices.push(residue.iAtom)
      }
    }
    this.build()
  }
}

class NucleotideRepresentation {
  constructor (soup) {
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.soup = soup
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)

    let residue = this.soup.getResidueProxy()
    let atom = this.soup.getAtomProxy()
    let getVecFromAtomType = a => atom.load(residue.getIAtom(a)).pos.clone()

    let verticesList = []
    this.nucleotideColorList = []
    let indexColorList = []
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss === 'D' && residue.isPolymer) {
        this.nucleotideColorList.push(residue.activeColor)
        indexColorList.push(getIndexColor(residue.iAtom))
        let atomTypes = data.getNucleotideBaseAtomTypes(residue.resType)
        verticesList.push(_.map(atomTypes, getVecFromAtomType))
      }
    }

    this.nucleotideGeom = new glgeom.BufferRaisedShapesGeometry(
      verticesList, this.nucleotideColorList, 0.2)
    let displayMesh = new THREE.Mesh(this.nucleotideGeom, displayMaterial)
    this.displayObj.add(displayMesh)

    let pickingGeom = new glgeom.BufferRaisedShapesGeometry(verticesList, indexColorList, 0.2)
    let pickingMesh = new THREE.Mesh(pickingGeom, pickingMaterial)
    this.pickingObj.add(pickingMesh)

    this.nucleotideConnectList = []
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss === 'D' && residue.isPolymer) {
        for (let bond of data.getNucleotideConnectorBondAtomTypes(residue.resType)) {
          this.nucleotideConnectList.push([
            getVecFromAtomType(bond[0]),
            getVecFromAtomType(bond[1]),
            iRes])
        }
      }
    }

    let nBond = this.nucleotideConnectList.length
    let cylinderBufferGeometry = glgeom.makeBufferZCylinderGeometry(0.4)
    this.nucleotideConnectorGeom = new glgeom.CopyBufferGeometry(cylinderBufferGeometry, nBond)
    for (let iBond = 0; iBond < nBond; iBond += 1) {
      let [p1, p2, iRes] = this.nucleotideConnectList[iBond]
      this.nucleotideConnectorGeom.applyMatrixToCopy(
        glgeom.getCylinderMatrix(p1, p2, 0.3), iBond)
    }
    for (let iBond = 0; iBond < nBond; iBond += 1) {
      let [p1, p2, iRes] = this.nucleotideConnectList[iBond]
      let color = residue.load(iRes).activeColor
      this.nucleotideConnectorGeom.applyColorToCopy(color, iBond)
    }
    let mesh = new THREE.Mesh(this.nucleotideConnectorGeom, displayMaterial)
    this.displayObj.add(mesh)
  }

  recolor () {
    this.nucleotideColorList = []
    let residue = this.soup.getResidueProxy()
    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (residue.ss === 'D' && residue.isPolymer) {
        this.nucleotideColorList.push(residue.activeColor)
      }
    }
    this.nucleotideGeom.recolor(this.nucleotideColorList)

    let nBond = this.nucleotideConnectList.length
    for (let iBond = 0; iBond < nBond; iBond += 1) {
      let [p1, p2, iRes] = this.nucleotideConnectList[iBond]
      let color = residue.load(iRes).activeColor
      this.nucleotideConnectorGeom.applyColorToCopy(color, iBond)
    }
    this.nucleotideConnectorGeom.attributes.color.needsUpdate = true
  }
}

class SidechainRepresentation {
  constructor (soup, radius) {
    this.soup = soup
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.radius = radius
    this.build()
  }

  build () {
    glgeom.clearObject3D(this.displayObj)
    glgeom.clearObject3D(this.pickingObj)

    let atomIndices = []
    let bondIndices = []

    let atom = this.soup.getAtomProxy()
    let residue = this.soup.getResidueProxy()

    for (let iRes of _.range(this.soup.getResidueCount())) {
      residue.iRes = iRes
      if (!residue.isPolymer) {
        continue
      }
      if (!residue.sidechain) {
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

    this.atomRepr = new AtomsRepresentation(this.soup, atomIndices, this.radius)
    this.bondRepr = new BondsRepresentation(this.soup, bondIndices)

    transferObjects(this.atomRepr.displayObj, this.displayObj)
    transferObjects(this.bondRepr.displayObj, this.displayObj)
    transferObjects(this.atomRepr.pickingObj, this.pickingObj)
  }
}

class BackboneRepresentation {
  constructor (soup, radius) {
    this.soup = soup
    this.displayObj = new THREE.Object3D()
    this.pickingObj = new THREE.Object3D()
    this.radius = radius
    this.build()
  }

  build () {
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

    this.atomRepr = new AtomsRepresentation(this.soup, atomIndices, this.radius)
    this.bondRepr = new BondsRepresentation(this.soup, bondIndices)
    if (atomIndices.length > 0) {
      transferObjects(this.atomRepr.displayObj, this.displayObj)
      transferObjects(this.bondRepr.displayObj, this.displayObj)
      transferObjects(this.atomRepr.pickingObj, this.pickingObj)
    }
  }
}


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
class Display extends WebglWidget {
  /**
   * @param soupView - SoupView object that holds a soup and views
   * @param divTag - a selector tag for a DOM element
   * @param controller - the controller for the soupView
   * @param isGrid - flat to show autodock 3D grid control panel
   * @param backgroundColor - the background color of canvas and webgl
   */
  constructor (soupView, divTag, controller, isGrid, backgroundColor) {
    super(divTag, backgroundColor)

    this.observers = {
      rebuilt: new Signal(),
      updated: new Signal(),
      resized: new Signal()
    }

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

  addObserver (observer) {
    if ('update' in observer) {
      this.observers.updated.add(() => { observer.update() })
    }
    if ('rebuild' in observer) {
      this.observers.rebuilt.add(() => { observer.rebuild() })
    }
    if ('resize' in observer) {
      this.observers.resized.add(() => { observer.resize() })
    }
  }

  calculateTracesForRibbons () {
    this.soup.calculateTracesForRibbons()
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
    if (this.soupView.savedViews.length === 0) {
      this.soupView.setCurrentViewToDefault()
    }

    this.soup.colorResidues()

    // pre-calculations needed before building meshes

    this.soup.findGridLimits()
    this.calculateTracesForRibbons()

    this.addRepresentation(
      'ribbons', new RibbonRepresentation(this.soup))
    this.addRepresentation(
      'arrows', new ArrowRepresentation(this.soup))
    this.addRepresentation(
      'nucleotides', new NucleotideRepresentation(this.soup))
    this.addRepresentation(
      'ligands', new LigandRepresentation(this.soup, this.atomRadius))
    if (this.isGrid) {
      this.addRepresentation(
        'grid', new GridRepresentation(this.soup, this.gridAtomRadius))
    }
    this.addRepresentation(
      'sidechain', new SidechainRepresentation(this.soup, this.atomRadius))

    this.rebuildSceneFromMeshes()

    this.observers.rebuilt.dispatch()

    this.soupView.changed = true
    this.soupView.updateObservers = true
  }

  deleteStructure (iStructure) {
    this.controller.deleteStructure(iStructure)
    this.observers.rebuilt.dispatch()
    this.buildScene()
  }

  buildCrossHairs () {
    let radius = 1.2
    let segments = 60
    let material = new THREE.LineBasicMaterial({color: 0xFF5555})
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

  setTargetViewByIAtom (iAtom) {
    this.controller.setTargetViewByIAtom(iAtom)
  }

  getCameraOfCurrentView () {
    return this.soupView.currentView.cameraParams
  }
  
  rotateCameraParamsToCurrentView () {
    this.setCameraParams(this.getCameraOfCurrentView())
  }

  adjustCamera (xRotationAngle, yRotationAngle, zRotationAngle, zoomRatio) {
    let cameraParams = this.getCameraOfCurrentView()

    let y = cameraParams.up
    let z = cameraParams.position.clone()
      .sub(cameraParams.focus)
      .normalize()
    let x = (v3.create())
      .crossVectors(y, z)
      .normalize()

    let rotZ = new THREE.Quaternion()
      .setFromAxisAngle(z, zRotationAngle)

    let rotY = new THREE.Quaternion()
      .setFromAxisAngle(y, -yRotationAngle)

    let rotX = new THREE.Quaternion()
      .setFromAxisAngle(x, -xRotationAngle)

    let rotation = new THREE.Quaternion()
      .multiply(rotZ)
      .multiply(rotY)
      .multiply(rotX)

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
    let cameraParams = this.getCameraOfCurrentView()
    let cameraDir = cameraParams.focus.clone()
      .sub(cameraParams.position)
      .normalize()
    let posRelativeToOrigin = pos.clone()
      .sub(cameraParams.focus)
    return posRelativeToOrigin.dot(cameraDir)
  }

  inZlab (pos) {
    let z = this.getZ(pos)
    let cameraParams = this.getCameraOfCurrentView()
    return ((z >= cameraParams.zFront) && (z <= cameraParams.zBack))
  }

  opacity (pos) {
    let z = this.getZ(pos)

    let cameraParams = this.getCameraOfCurrentView()

    if (z < cameraParams.zFront) {
      return 1.0
    }

    if (z > cameraParams.zBack) {
      return 0.0
    }

    return 1 - (z - cameraParams.zFront) / (cameraParams.zBack - cameraParams.zFront)
  }

  /**
   ******************************************
   * Draw & Animate Graphical objects
   ******************************************
   */

  updateCrossHairs () {
    let cameraParams = this.getCameraOfCurrentView()
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
    let i = this.getPickColorFromMouse()
    if ((i > 0) && (i < this.soup.getAtomCount() + 1)) {
      return i - 1
    }
    return null
  }

  updateHover () {
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
   ********************************************
   * Main event loop methods
   ********************************************
   */

  isChanged () {
    return this.soupView.changed
  }

  drawFrame () {
    if (!this.isChanged()) {
      return
    }
    this.updateMeshesInScene = false

    if (this.soupView.startTargetAfterRender) {
      // call here as the tick AFTER the new stuff
      // has been rebuilt and rendered
      if (
        !this.soupView.soup.grid.changed &&
        !this.soupView.updateSidechain &&
        !this.soupView.updateSelection) {
        this.soupView.startTargetView()
        this.soupView.nUpdateStep = this.soupView.maxUpdateStep
      }
    }

    let isNewTrigger = (meshName, visible) => visible && (!(meshName in this.displayMeshes))

    let show = this.soupView.currentView.show
    if (isNewTrigger('water', show.water)) {
      this.addRepresentation('water', new BackboneRepresentation(this.soup, this.atomRadius))
    }

    this.setMeshVisible('ribbons', show.ribbon)
    this.setMeshVisible('arrows', !show.backboneAtom)
    this.setMeshVisible('water', show.water)
    this.setMeshVisible('backbone', show.backboneAtom)
    this.setMeshVisible('ligands', show.ligands)

    if (this.isGrid) {
      if (this.soupView.soup.grid.changed) {
        if (!_.isUndefined(this.representations.grid)) {
          this.representations.grid.build()
        }
        this.soupView.soup.grid.changed = false
      }
    }

    if (this.soupView.updateSidechain) {
      this.representations.sidechain.build()
      this.soupView.updateSidechain = false
      this.updateMeshesInScene = true
    }

    if (this.soupView.updateSelection) {
      this.representations.ribbons.recolor()
      this.representations.arrows.recolor()
      this.representations.nucleotides.recolor()
      this.representations.sidechain.build()
      this.soupView.updateSelection = false
      this.updateMeshesInScene = true
      this.soupView.updateObservers = true
    }

    if (this.updateMeshesInScene) {
      this.rebuildSceneFromMeshes()
    }

    this.updateCrossHairs()

    this.rotateCameraParamsToCurrentView()

    // needs to be observers.updated before render
    // as lines must be placed in THREE.js scene
    this.distanceMeasuresWidget.drawFrame()

    this.render()

    if (this.soupView.updateObservers) {
      this.observers.updated.dispatch()
      this.soupView.updateObservers = false
    }

    // needs to be observers.updated after render
    this.atomLabelsWidget.drawFrame()

    this.soupView.changed = false
  }

  animate (elapsedTime) {
    const MS_PER_STEP = 17
    this.soupView.nUpdateStep -= elapsedTime / MS_PER_STEP
    if (this.soupView.nUpdateStep < 0) {
      if (this.soupView.targetView !== null) {
        this.controller.setCurrentView(this.soupView.targetView)
        this.soupView.updateObservers = true
        this.soupView.changed = true
        this.soupView.targetView = null
        this.soupView.nUpdateStep = 70
      } else {
        if (this.soupView.startTargetAfterRender) {
          this.soupView.changed = true
        } else if (this.soupView.isLoop) {
          this.controller.setTargetToNextView()
        }
      }
    } else if (this.soupView.nUpdateStep >= 1) {
      if (this.soupView.targetView != null) {
        let view = this.soupView.currentView.clone()
        view.setCamera(interpolateCameras(
          this.soupView.currentView.cameraParams,
          this.soupView.targetView.cameraParams,
          1.0 / this.soupView.nUpdateStep))
        this.controller.setCurrentView(view)
      }
    }
    this.updateHover()
  }

  /**
   ********************************************
   * Standard DOM methods
   ********************************************
   */

  resize () {
    this.observers.resized.dispatch()
    super.resize()
    this.soupView.updateObservers = true
    this.controller.setChangeFlag()
  }

  doubleclick (event) {
    if (this.iAtomHover !== null) {
      if (this.iAtomHover === this.soupView.getICenteredAtom()) {
        this.atomLabelDialog()
      } else {
        let iRes = this.soup.getAtomProxy(this.iAtomHover).iRes
        this.controller.selectResidue(iRes)
        this.setTargetViewByIAtom(this.iAtomHover)
      }
      this.isDraggingCentralAtom = false
    } else {
      this.controller.zoomOut()
    }
    this.iAtomPressed = null
    this.iResClick = null
  }

  click (event) {
    if (!_.isUndefined(this.iResClick) && (this.iResClick !== null)) {
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

  mousedown (event) {
    if (this.isGesture) {
      return
    }

    event.preventDefault()

    this.getPointer(event)
    this.updateHover()
    this.iAtomPressed = this.iAtomHover
    this.iResClick = this.soup.getAtomProxy(this.iAtomPressed).iRes

    if (this.iAtomPressed === this.soupView.getICenteredAtom()) {
      this.isDraggingCentralAtom = this.iAtomPressed !== null
    }

    let now = (new Date()).getTime()
    let elapsedTime = this.timePressed ? now - this.timePressed : 0

    if (this.clickTimer === null) {
      this.clickTimer = setTimeout(() => this.click(event), 250)
    } else if (elapsedTime < 600) {
      clearTimeout(this.clickTimer)
      this.doubleclick(event)
      this.clickTimer = null
    }

    this.getPointer(event)
    this.savePointer()
    this.timePressed = (new Date()).getTime()
    this.pointerPressed = true
  }

  mousemove (event) {
    event.preventDefault()
    if (this.isGesture) {
      return
    }

    this.getPointer(event)

    this.updateHover()

    if (this.isDraggingCentralAtom) {
      let pos = this.soup.getAtomProxy(this.soupView.getICenteredAtom()).pos
      let v = this.getPosXY(pos)
      this.lineElement.move(this.mouseX + this.x(), this.mouseY + this.y(), v.x, v.y)
    } else {
      let shiftDown = (event.shiftKey === 1)

      let rightMouse =
        (event.button === 2) || (event.which === 3)

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

        this.adjustCamera(
          xRotationAngle,
          yRotationAngle,
          zRotationAngle,
          zoomRatio)

        this.savePointer()
      }
    }
  }

  mouseout (event) {
    this.hover.hide()
    this.pointerPressed = false
  }

  mouseup (event) {
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

  mousewheel (event) {
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

    this.adjustCamera(0, 0, 0, zoom)
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
    this.iAtomPressed = null
    this.iResClick = null
    if (this.clickTimer !== null) {
      clearTimeout(this.clickTimer)
      this.clickTimer = null
    }
    this.pointerPressed = false
  }
}

export { Display }
