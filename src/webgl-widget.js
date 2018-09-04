import $ from 'jquery'
import _ from 'lodash'
import * as THREE from 'three'

import v3 from './v3'
import * as util from './util'
import * as glgeom from './glgeom'

/**
 * Utility class to handle a three.js HTML object with
 * a standard set of features:
 *  - instantiate a <div> and <canvas> element
 *  - camera object
 *  - display scene
 *  - picking scene, with helpful picking functions
 *  - a status messaging div
 *  - lights
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

    // this.representations is a dictionary that holds representations
    // that transform this.soup into meshes that will be inserted into
    // this.displayMeshes and this.pickingMeshes at draw time
    this.representations = {}

    // this.displayMeshes is a dictionary that holds THREE.Object3D
    // collections of meshes. This allows collections to be collectively
    // turned on and off. The meshes will be regenerated into this.displayScene
    // if the underlying data changes. The convenience function
    // will send geometries into the displayMeshes, using this.displayMaterial
    // as the default. This assumes vertexColors are used, allowing multiple
    // colors within the same geometry.
    this.displayMeshes = {}
    this.pickingMeshes = {}

    this.pickingScene = new THREE.Scene()
    this.pickingTexture = new THREE.WebGLRenderTarget(this.width(), this.height())
    this.pickingTexture.texture.minFilter = THREE.LinearFilter

    this.lights = []
    this.buildLights()

    // div to display processing messages
    this.messageDiv = $('<div>')
      .attr('id', 'loading-message')
      .addClass('jolecule-loading-message')
    this.setMesssage('Initialized jolecule.')

    // input control parameters
    this.saveMouseX = null
    this.saveMouseY = null
    this.saveMouseR = null
    this.saveMouseT = null
    this.mouseX = null
    this.mouseY = null
    this.mouseR = null
    this.mouseT = null
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
    bind('mouseleave', e => this.mouseout(e))
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
    this.lights.length = 0

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

    util.stickJqueryDivInTopLeft(this.div, this.messageDiv, 120, 20)
    this.messageDiv.width(this.div.width() - 200)

    this.camera.aspect = this.width() / this.height()
    this.camera.updateProjectionMatrix()

    this.pickingTexture.setSize(this.width(), this.height())

    if (util.exists(this.renderer)) {
      this.renderer.setSize(this.width(), this.height())
    }
  }

  setMesssage (message) {
    console.log('SoupWidget.setMesssage:', message)
    this.messageDiv.html(message).show()
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

export { WebglWidget }
