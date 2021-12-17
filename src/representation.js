import * as data from './data'
import * as THREE from 'three'
import * as util from './util'
import _ from 'lodash'
import * as glgeom from './glgeom'

/*******************************************************
 * Representations of the Protein as THREE.JS meshes
 *******************************************************
 */

let pickingMaterial = new THREE.MeshBasicMaterial({
    vertexColors: THREE.VertexColors,
})

let phongMaterial = new THREE.MeshPhongMaterial({
    vertexColors: THREE.VertexColors,
})

let transparentMaterial = new THREE.MeshPhongMaterial({
    opacity: 0.15,
    premultipliedAlpha: true,
    vertexColors: THREE.VertexColors,
    transparent: true,
})

function getIndexColor (i) {
    return new THREE.Color().setHex(i + 1)
}

function transferObjects (fromObj, toObj) {
    for (let child of _.values(fromObj.children)) {
        toObj.add(child)
    }
}

/**
 * constructs THREE.js geometries from protein object:
 *  1. a displayGeom
 *  2. a pickingGeom
 */

class Representation {
    constructor (soup) {
        this.soup = soup
        this.displayObj = new THREE.Object3D()
        this.displayMaterial = phongMaterial
        this.pickingMaterial = pickingMaterial
        this.pickingObj = new THREE.Object3D()
        this.isTransparent = false
    }

    setTransparent (isTransparent) {
        this.isTransparent = isTransparent
        if (this.isTransparent) {
            this.displayMaterial = transparentMaterial
        } else {
            this.displayMaterial = phongMaterial
        }
    }

    build () {}
}

class ArrowRepresentation extends Representation {
    constructor (soup, isTransparent = false, selectedTraces = []) {
        super(soup)
        this.selectedTraces = _.cloneDeep(selectedTraces)
        this.setTransparent(isTransparent)
        this.traces = []
        this.build()
    }

    build () {
        this.traces = this.soup.traces
        if (this.selectedTraces.length > 0) {
            let newTraces = []
            for (let [i, trace] of this.traces.entries()) {
                if (_.includes(this.selectedTraces, i)) {
                    newTraces.push(trace)
                }
            }
            this.traces = newTraces
        }

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

        this.displayObj.add(
            new THREE.Mesh(this.displayGeom, this.displayMaterial)
        )
        this.pickingObj.add(
            new THREE.Mesh(this.pickingGeom, this.pickingMaterial)
        )
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

class RibbonRepresentation extends Representation {
    constructor (soup, isTransparent = false, selectedTraces = []) {
        super(soup)
        this.selectedTraces = _.cloneDeep(selectedTraces)
        this.traces = []
        this.setTransparent(isTransparent)
        this.build()
    }

    build () {
        this.traces = this.soup.traces
        if (this.selectedTraces.length > 0) {
            let newTraces = []
            for (let [i, trace] of this.traces.entries()) {
                if (_.includes(this.selectedTraces, i)) {
                    newTraces.push(trace)
                }
            }
            this.traces = newTraces
        }
        this.displayGeom = new glgeom.BufferRibbonGeometry(
            this.traces,
            data.coilFace,
            false
        )
        this.pickingGeom = new glgeom.BufferRibbonGeometry(
            this.traces,
            data.coilFace,
            true
        )
        glgeom.clearObject3D(this.displayObj)
        glgeom.clearObject3D(this.pickingObj)
        let displayMesh = new THREE.Mesh(this.displayGeom, this.displayMaterial)
        let pickingMesh = new THREE.Mesh(this.pickingGeom, this.pickingMaterial)
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

class NucleotideRepresentation extends Representation {
    constructor (soup, isTransparent = false, selectedTraces = null) {
        super(soup)
        this.selectedTraces = _.cloneDeep(selectedTraces)
        this.setTransparent(isTransparent)
        this.traces = []
        this.build()
    }

    build () {
        glgeom.clearObject3D(this.displayObj)
        glgeom.clearObject3D(this.pickingObj)

        this.displayObj.name = 'NucleotideRepresentation'

        let residue = this.soup.getResidueProxy()
        let atom = this.soup.getAtomProxy()

        function getVecFromAtomType (a) {
            let iAtom = residue.getIAtom(a)
            if (iAtom === null) {
                return null
            }
            return atom.load(iAtom).pos.clone()
        }

        let verticesList = []
        this.nucleotideColorList = []
        let indexColorList = []

        this.traces = this.soup.traces
        if (this.selectedTraces.length > 0) {
            let newTraces = []
            for (let [i, trace] of this.traces.entries()) {
                if (_.includes(this.selectedTraces, i)) {
                    newTraces.push(trace)
                }
            }
            this.traces = newTraces
        }

        for (let trace of this.traces) {
            for (let iRes of trace.indices) {
                // for (let iRes of _.range(this.soup.getResidueCount())) {
                residue.iRes = iRes
                if (residue.ss === 'D' && residue.isPolymer) {
                    let atomTypes = data.getNucleotideBaseAtomTypes(
                        residue.resType
                    )
                    let vertices = _.map(atomTypes, getVecFromAtomType)
                    if (_.some(vertices, v => v === null)) {
                        continue
                    }
                    verticesList.push(vertices)
                    indexColorList.push(getIndexColor(residue.iAtom))
                    this.nucleotideColorList.push(residue.activeColor)
                }
            }
        }

        this.nucleotideGeom = new glgeom.BufferRaisedShapesGeometry(
            verticesList,
            this.nucleotideColorList,
            0.2
        )
        let displayMesh = new THREE.Mesh(
            this.nucleotideGeom,
            this.displayMaterial
        )
        this.displayObj.add(displayMesh)

        let pickingGeom = new glgeom.BufferRaisedShapesGeometry(
            verticesList,
            indexColorList,
            0.2
        )
        let pickingMesh = new THREE.Mesh(pickingGeom, this.pickingMaterial)
        this.pickingObj.add(pickingMesh)

        this.nucleotideConnectList = []
        for (let trace of this.traces) {
            for (let iRes of trace.indices) {
                residue.iRes = iRes
                if (residue.ss === 'D' && residue.isPolymer) {
                    for (let bond of data.getNucleotideConnectorBondAtomTypes(
                        residue.resType
                    )) {
                        let iAtom1 = getVecFromAtomType(bond[0])
                        let iAtom2 = getVecFromAtomType(bond[1])
                        if (iAtom1 == null || iAtom2 == null) {
                            continue
                        }
                        this.nucleotideConnectList.push([iAtom1, iAtom2, iRes])
                    }
                }
            }
        }

        let nBond = this.nucleotideConnectList.length
        let cylinderBufferGeometry = glgeom.makeBufferZCylinderGeometry(0.4)
        this.nucleotideConnectorGeom = new glgeom.CopyBufferGeometry(
            cylinderBufferGeometry,
            nBond
        )
        for (let iBond = 0; iBond < nBond; iBond += 1) {
            let [p1, p2, iRes] = this.nucleotideConnectList[iBond]
            this.nucleotideConnectorGeom.applyMatrixToCopy(
                glgeom.getCylinderMatrix(p1, p2, 0.3),
                iBond
            )
        }
        for (let iBond = 0; iBond < nBond; iBond += 1) {
            let [p1, p2, iRes] = this.nucleotideConnectList[iBond]
            let color = residue.load(iRes).activeColor
            this.nucleotideConnectorGeom.applyColorToCopy(color, iBond)
        }
        let mesh = new THREE.Mesh(
            this.nucleotideConnectorGeom,
            this.displayMaterial
        )
        mesh.name = 'nucleotideConnector'
        this.displayObj.add(mesh)
    }

    recolor () {
        this.nucleotideColorList = []
        let residue = this.soup.getResidueProxy()
        for (let trace of this.traces) {
            for (let iRes of trace.indices) {
                residue.iRes = iRes
                if (residue.ss === 'D' && residue.isPolymer) {
                    this.nucleotideColorList.push(residue.activeColor)
                }
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

class CartoonRepresentation extends Representation {
    constructor (soup, isTransparent = false, selectedTraces = []) {
        super(soup)
        super.setTransparent(isTransparent)
        this.selectedTraces = _.cloneDeep(selectedTraces)
        this.build()
    }

    setTransparent (isTransparent) {
        super.setTransparent(isTransparent)
        this.ribbonRepr.setTransparent(isTransparent)
        this.arrowRepr.setTransparent(isTransparent)
        this.nucRepr.setTransparent(isTransparent)
    }

    build () {
        this.ribbonRepr = new RibbonRepresentation(
            this.soup,
            this.isTransparent,
            this.selectedTraces
        )
        this.arrowRepr = new ArrowRepresentation(
            this.soup,
            this.isTransparent,
            this.selectedTraces
        )
        this.nucRepr = new NucleotideRepresentation(
            this.soup,
            this.isTransparent,
            this.selectedTraces
        )

        glgeom.clearObject3D(this.displayObj)
        glgeom.clearObject3D(this.pickingObj)

        this.displayObj.name = 'CartoonRepr'
        transferObjects(this.ribbonRepr.displayObj, this.displayObj)
        transferObjects(this.arrowRepr.displayObj, this.displayObj)
        transferObjects(this.nucRepr.displayObj, this.displayObj)
        transferObjects(this.ribbonRepr.pickingObj, this.pickingObj)
        transferObjects(this.arrowRepr.pickingObj, this.pickingObj)
        transferObjects(this.nucRepr.pickingObj, this.pickingObj)
    }

    recolor () {
        this.ribbonRepr.recolor()
        this.arrowRepr.recolor()
        this.nucRepr.recolor()
    }
}

class AtomsRepresentation {
    constructor (soup, atomIndices, atomRadius, isElementRadius = false) {
        this.soup = soup
        this.displayObj = new THREE.Object3D()
        this.pickingObj = new THREE.Object3D()
        this.atomIndices = atomIndices
        this.atomRadius = atomRadius
        this.displayMaterial = phongMaterial
        this.pickingMaterial = pickingMaterial
        this.isElementRadius = isElementRadius
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
        this.displayGeom = new glgeom.CopyBufferGeometry(
            sphereBufferGeometry,
            nCopy
        )
        let pickingGeom = new glgeom.CopyBufferGeometry(
            sphereBufferGeometry,
            nCopy
        )

        let atom = this.soup.getAtomProxy()
        let radius = this.atomRadius
        for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
            let iAtom = this.atomIndices[iCopy]
            atom.iAtom = iAtom
            if (this.isElementRadius) {
                if (atom.elem === 'H') {
                    radius = 1.2
                } else {
                    radius = 1.7
                }
            }
            let matrix = glgeom.getSphereMatrix(atom.pos, radius)
            this.displayGeom.applyMatrixToCopy(matrix, iCopy)
            pickingGeom.applyMatrixToCopy(matrix, iCopy)
            this.displayGeom.applyColorToCopy(atom.color, iCopy)
            pickingGeom.applyColorToCopy(getIndexColor(iAtom), iCopy)
        }

        this.displayObj.add(
            new THREE.Mesh(this.displayGeom, this.displayMaterial)
        )
        this.pickingObj.add(new THREE.Mesh(pickingGeom, this.pickingMaterial))
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
        this.displayGeom.attributes.color.needsUpdate = true
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
                if (atom.bfactor > grid.bCutoff && grid.isElem[atom.elem]) {
                    this.atomIndices.push(atom.iAtom)
                }
            }
        }
        super.build()
    }
}

class SphereRepresentation extends AtomsRepresentation {
    constructor (soup) {
        super(soup, [], 1.7, true)
    }

    build () {
        let grid = this.soup.grid
        this.atomIndices = []
        let residue = this.soup.getResidueProxy()
        let atom = this.soup.getAtomProxy()
        for (let iRes of _.range(this.soup.getResidueCount())) {
            residue.iRes = iRes
            if (residue.isPolymer) {
                for (let iAtom of residue.getAtomIndices()) {
                    atom.iAtom = iAtom
                    this.atomIndices.push(iAtom)
                }
            }
        }
        this.isElementRadius = true
        super.build()
    }
}

class BondRepresentation {
    constructor (soup, bondIndices) {
        this.soup = soup
        this.bondIndices = bondIndices
        this.displayObj = new THREE.Object3D()
        this.pickingObj = new THREE.Object3D()
        this.displayMaterial = phongMaterial
        this.pickingMaterial = pickingMaterial
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

        let cylinderBufferGeometry = new THREE.CylinderBufferGeometry(
            1,
            1,
            1,
            4,
            1,
            false
        )
        cylinderBufferGeometry.applyMatrix(
            new THREE.Matrix4().makeRotationFromEuler(
                new THREE.Euler(Math.PI / 2, Math.PI, 0)
            )
        )

        this.displayGeom = new glgeom.CopyBufferGeometry(
            cylinderBufferGeometry,
            nCopy
        )

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
                let midpoint = p2
                    .clone()
                    .add(p1)
                    .multiplyScalar(0.5)
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

        let displayMesh = new THREE.Mesh(this.displayGeom, this.displayMaterial)
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
        this.displayGeom.attributes.color.needsUpdate = true
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

        this.atomRepr = new AtomsRepresentation(
            this.soup,
            atomIndices,
            this.radius
        )
        this.bondRepr = new BondRepresentation(this.soup, bondIndices)
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
            if (_.includes(data.solventResTypes, residue.resType)) {
                this.atomIndices.push(residue.iAtom)
            }
        }
        this.build()
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

        this.atomRepr = new AtomsRepresentation(
            this.soup,
            atomIndices,
            this.radius
        )
        this.bondRepr = new BondRepresentation(this.soup, bondIndices)

        transferObjects(this.atomRepr.displayObj, this.displayObj)
        transferObjects(this.bondRepr.displayObj, this.displayObj)
        transferObjects(this.atomRepr.pickingObj, this.pickingObj)
    }

    recolor () {
        this.atomRepr.recolor()
        this.bondRepr.recolor()
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

        this.atomRepr = new AtomsRepresentation(
            this.soup,
            atomIndices,
            this.radius
        )
        this.bondRepr = new BondRepresentation(this.soup, bondIndices)
        if (atomIndices.length > 0) {
            transferObjects(this.atomRepr.displayObj, this.displayObj)
            transferObjects(this.bondRepr.displayObj, this.displayObj)
            transferObjects(this.atomRepr.pickingObj, this.pickingObj)
        }
    }

    recolor () {
        this.atomRepr.recolor()
        this.bondRepr.recolor()
    }
}

export {
    ArrowRepresentation,
    RibbonRepresentation,
    CartoonRepresentation,
    AtomsRepresentation,
    GridRepresentation,
    SphereRepresentation,
    BondRepresentation,
    LigandRepresentation,
    WaterRepresentation,
    NucleotideRepresentation,
    SidechainRepresentation,
    BackboneRepresentation,
}
