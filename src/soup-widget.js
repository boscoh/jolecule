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
    constructor (
        soupView,
        divTag,
        controller,
        isGrid,
        backgroundColor,
        isMouseWheel
    ) {
        super(divTag, backgroundColor)

        this.observers = {
            rebuilt: new Signal(),
            updated: new Signal(),
            resized: new Signal(),
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
        this.isCrossHairs = true
        this.buildCrossHairs()

        // popup hover box over the mouse position
        this.isClickInitiated = false
        this.hover = new widgets.PopupText(this.divTag, 50)
        this.iAtomHover = null

        // Docking display control
        this.isGrid = isGrid

        this.isMouseWheel = isMouseWheel

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

    buildCrossHairs () {
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

    setTargetViewByIAtom (iAtom) {
        this.controller.setTargetViewByIAtom(iAtom)
    }

    getCameraOfCurrentView () {
        return this.soupView.currentView.cameraParams
    }

    getZ (pos) {
        let cameraParams = this.getCameraOfCurrentView()
        let cameraDir = cameraParams.focus
            .clone()
            .sub(cameraParams.position)
            .normalize()
        let posRelativeToOrigin = pos.clone().sub(cameraParams.focus)
        return posRelativeToOrigin.dot(cameraDir)
    }

    inZlab (pos) {
        let z = this.getZ(pos)
        let cameraParams = this.getCameraOfCurrentView()
        return z >= cameraParams.zFront && z <= cameraParams.zBack
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

        return (
            1 -
            (z - cameraParams.zFront) /
                (cameraParams.zBack - cameraParams.zFront)
        )
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
            let success = text => {
                this.controller.makeAtomLabel(iAtom, text)
            }
            util.textEntryDialog(this.div, label, success)
        }
    }

    getIAtomHover () {
        let i = this.getPickColorFromMouse()
        if (i > 0 && i < this.soup.getAtomCount() + 1) {
            return i - 1
        }
        return null
    }

    popupText (iAtomHover) {
        let atom = this.soup.getAtomProxy(iAtomHover)
        let label = atom.label
        let iAtom = atom.iAtom
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
        return text
    }

    updateHover () {
        this.iAtomHover = this.getIAtomHover()
        if (this.iAtomHover) {
            this.hover.html(this.popupText(this.iAtomHover))
            let pos = this.soup.getAtomProxy(this.iAtomHover).pos
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

    addRepresentation (name, repr) {
        this.representations[name] = repr
        this.displayMeshes[name] = repr.displayObj
        this.pickingMeshes[name] = repr.pickingObj
        this.updateMeshesInScene = true
    }

    buildScene () {
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
                new representation.GridRepresentation(
                    this.soup,
                    this.gridAtomRadius
                )
            )
        }
        this.addRepresentation(
            'sidechain',
            new representation.SidechainRepresentation(
                this.soup,
                this.atomRadius
            )
        )

        this.rebuildSceneFromMeshes()

        this.observers.rebuilt.dispatch()

        this.soupView.isChanged = true
        this.soupView.isUpdateObservers = true
    }

    deleteStructure (iStructure) {
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
    isChanged () {
        return this.soupView.isChanged
    }

    drawFrame () {
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
                new representation.WaterRepresentation(
                    this.soup,
                    this.atomRadius
                )
            )
        }

        if (isNewTrigger('backbone', show.backbone)) {
            this.addRepresentation(
                'backbone',
                new representation.BackboneRepresentation(
                    this.soup,
                    this.atomRadius
                )
            )
        }

        if (isNewTrigger('sphere', show.sphere)) {
            this.addRepresentation(
                'sphere',
                new representation.SphereRepresentation(this.soup)
            )
        }

        this.setMeshVisible('ribbon', show.ribbon)
        this.setMeshVisible(
            'transparentRibbon',
            show.ribbon && show.transparent
        )
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
                this.representations.ribbon.selectedTraces = _.cloneDeep(
                    this.soup.selectedTraces
                )
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

    animate (elapsedTime) {
        this.soupView.animate(elapsedTime)
        this.updateHover()
    }

    /**
     ********************************************
     * Standard DOM methods
     ********************************************
     */

    focus () {
        this.div.focus()
        console.log('SoupWidget.focus')
    }

    resize () {
        super.resize()
        this.observers.resized.dispatch()
        this.soupView.isUpdateObservers = true
        this.controller.setChangeFlag()
    }

    doubleclick (event) {
        if (this.iAtomHover !== null) {
            if (this.iAtomHover === this.soupView.getICenteredAtom()) {
                if (!event.metaKey && !event.shiftKey) {
                    this.atomLabelDialog()
                }
            }
            this.isDraggingCentralAtom = false
        }
        this.iAtomFirstPressed = null
        this.iResFirstPressed = null
        this.iAtomPreClick = null
    }

    /**
     * Click is triggered on a mouseup following a mousedown
     */
    click (event) {
        let iAtomPressed = this.iAtomHover
        let iResPressed = this.soup.getAtomProxy(iAtomPressed).iRes
        if (util.exists(iResPressed) && iResPressed === this.iResFirstPressed) {
            if (this.soupView.currentView.show.transparent) {
                if (!this.soup.isSameChainSelected(iResPressed)) {
                    this.controller.selectTraceOfResidue(iResPressed)
                }
            }
            if (!event.metaKey && !event.shiftKey) {
                console.log('Got here')
                this.controller.triggerAtom(iAtomPressed)
            } else if (event.metaKey) {
                this.controller.toggleSelectResidue(iResPressed)
                this.controller.zoomToSelection()
            } else if (event.shiftKey) {
                this.controller.selectAdditionalRangeToResidue(
                    this.iResFirstPressed
                )
                this.controller.zoomToSelection()
            } else {
                this.controller.selectAdditionalResidue(this.iResFirstPressed)
            }
        } else {
            this.controller.clearSelectedResidues()
            this.controller.clickBackground()
        }
        console.log('clear press')
        this.iAtomFirstPressed = null
        this.iResFirstPressed = null

        this.getPointer(event)
        this.updateHover()
    }

    mousedown (event) {
        this.focus()

        if (this.isGesture) {
            return
        }

        event.preventDefault()

        this.getPointer(event)
        this.updateHover()
        this.iAtomFirstPressed = this.iAtomHover
        this.iResFirstPressed = this.soup.getAtomProxy(
            this.iAtomFirstPressed
        ).iRes

        if (this.iAtomFirstPressed === this.soupView.getICenteredAtom()) {
            this.isDraggingCentralAtom = this.iAtomFirstPressed !== null
        }

        let now = new Date().getTime()
        let elapsedTime = this.timePressed ? now - this.timePressed : 0

        if (!this.isClickInitiated) {
            this.iAtomPreClick = this.iAtomHover
            this.isClickInitiated = true
        } else if (elapsedTime < 600) {
            this.doubleclick(event)
            this.isClickInitiated = false
        }

        this.getPointer(event)
        this.savePointer()
        this.timePressed = new Date().getTime()
        this.pointerPressedAndInDiv = true
    }

    mousemove (event) {
        event.preventDefault()
        if (this.isGesture) {
            return
        }

        this.getPointer(event)

        this.updateHover()

        if (this.isDraggingCentralAtom) {
            let pos = this.soup.getAtomProxy(this.soupView.getICenteredAtom())
                .pos
            let v = this.getPosXY(pos)
            this.lineElement.move(
                this.mouseX + this.x(),
                this.mouseY + this.y(),
                v.x,
                v.y
            )
        } else {
            let rightMouse = event.button === 2 || event.which === 3

            if (this.pointerPressedAndInDiv) {
                let zoomRatio = 1.0
                let zRotationAngle = 0
                let yRotationAngle = 0
                let xRotationAngle = 0

                let diffX = this.mouseX - this.saveMouseX
                let diffY = this.mouseY - this.saveMouseY

                // cancel any down/up motion
                this.isClickInitiated = false
                console.log('mousemove cancel click due to move')

                if (rightMouse || event.metaKey) {
                    zRotationAngle = this.mouseT - this.saveMouseT
                    if (this.mouseR > 0.0) {
                        zoomRatio = this.saveMouseR / this.mouseR
                    }
                } else if (event.ctrlKey) {
                    zRotationAngle = this.mouseT - this.saveMouseT
                } else if (event.shiftKey) {
                    let wheel = diffY / 100
                    zoomRatio = Math.pow(
                        1 + Math.abs(wheel) / 2,
                        wheel > 0 ? 1 : -1
                    )
                } else {
                    yRotationAngle = v3.degToRad(diffX)
                    xRotationAngle = v3.degToRad(diffY)
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

    mouseout (event) {
        this.hover.hide()
        this.pointerPressedAndInDiv = false
    }

    mouseup (event) {
        this.getPointer(event)

        event.preventDefault()

        if (this.isDraggingCentralAtom) {
            if (this.iAtomHover === this.iAtomFirstPressed) {
                this.click(event)
            }
            if (this.iAtomHover !== null) {
                let iAtomCentre = this.soupView.getICenteredAtom()
                if (this.iAtomHover !== iAtomCentre) {
                    this.controller.makeDistance(this.iAtomHover, iAtomCentre)
                }
            }
            this.lineElement.hide()
            this.isDraggingCentralAtom = false
        } else if (this.isClickInitiated) {
            this.click(event)
        }

        if (util.exists(event.touches)) {
            this.hover.hide()
        }

        this.pointerPressedAndInDiv = false
    }

    mousewheel (event) {
        console.log('SoupWidget.mousewheel', this.isMouseWheel)
        if (!this.isMouseWheel) {
            return
        }

        if (this.isGesture) {
            return
        }

        event.preventDefault()

        let wheel
        if (util.exists(event.wheelDelta)) {
            wheel = event.wheelDelta / 480
        } else {
            // for Firefox
            wheel = -event.detail / 24
        }

        // converted from pinch-zoom on chrome
        if (event.ctrlKey) {
            wheel /= 2
            wheel *= -1
        }

        let zoom = Math.pow(1 + Math.abs(wheel) / 2, wheel > 0 ? 1 : -1)

        this.controller.adjustCamera(0, 0, 0, zoom)
    }

    gesturestart (event) {
        event.preventDefault()
        this.isGesture = true
        this.lastPinchRotation = 0
        this.lastScale = event.scale * event.scale
    }

    gesturechange (event) {
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

    gestureend (event) {
        event.preventDefault()
        this.isGesture = false
        this.iAtomFirstPressed = null
        this.iResFirstPressed = null
        if (this.isClickInitiated !== null) {
            clearTimeout(this.isClickInitiated)
            this.isClickInitiated = null
        }
        this.pointerPressedAndInDiv = false
    }
}

export { SoupWidget }
