/**
 * Custom geometry and mesh generators based on the
 * THREE.js library.
 *
 * In particular, there is a Ribbon class which is an
 * extrusion where the normal and tangents are specified.
 *
 */

import * as THREE from 'three'
import v3 from './v3'
import _ from 'lodash'

function CatmullRom (t, p0, p1, p2, p3) {
  let v0 = (p2 - p0) * 0.5
  let v1 = (p3 - p1) * 0.5
  let t2 = t * t
  let t3 = t * t2
  return (2 * p1 - 2 * p2 + v0 + v1) * t3 +
    (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
    v0 * t +
    p1
}

/**
 * Interpolation function for a Catmul-Rom spline
 * in 3D space, where the 4 guide-points are given
 * and an interpolation parameter is given.
 *
 * @param {Number} t - interpolation from [0, 1]
 * @param {THREE.Vector3} p1
 * @param {THREE.Vector3} p2
 * @param {THREE.Vector3} p3
 * @param {THREE.Vector3} p4
 * @returns {THREE.Vector3} the interpolated point
 */
function catmulRomSpline (t, p1, p2, p3, p4) {
  return v3.create(
    CatmullRom(t, p1.x, p2.x, p3.x, p4.x),
    CatmullRom(t, p1.y, p2.y, p3.y, p4.y),
    CatmullRom(t, p1.z, p2.z, p3.z, p4.z)
  )
}

/**
 * Create a path for extrusion where the direction of the
 * normal and binormal is defined, as well as the tangent.
 *
 * In particular, the path provides a slice() function
 * that produces a sub-portion of the path.
 */
class PathAndFrenetFrames {
  constructor () {
    this.points = []
    this.normals = []
    this.tangents = []
    this.binormals = []

    this.colors = []
    this.indexColors = []
    this.segmentTypes = []
    this.refIndices = []
  }

  slice (i, j) {
    let subPath = new PathAndFrenetFrames()
    subPath.points = this.points.slice(i, j)
    subPath.normals = this.normals.slice(i, j)
    subPath.tangents = this.tangents.slice(i, j)
    subPath.binormals = this.binormals.slice(i, j)
    return subPath
  }
}

/**
 * Creates a new path out of a slice of the oldPath, with
 * n number of segments between two points, using a Catmul-Rom
 * spline based on the two points, and the two surrounding
 * points. At the ends, the external points are projected
 * from the end using the tangent at the ends.
 *
 * @param {PathAndFrenetFrames} oldPath
 * @param {Number} n
 * @param {Number} iOldPoint
 * @param {Number} jOldPoint
 * @returns {PathAndFrenetFrames}
 */
function expandPath (oldPath, n, iOldPoint, jOldPoint) {
  let newPath = new PathAndFrenetFrames()

  newPath.points.push(oldPath.points[iOldPoint])

  for (let i = iOldPoint; i < jOldPoint - 1; i += 1) {
    let jStart = 1
    let jEnd = n + 1

    for (let j = jStart; j < jEnd; j += 1) {
      let t = j / n

      let prevOldPoint, nextOldPoint

      if (i > 0) {
        prevOldPoint = oldPath.points[i - 1]
      } else {
        prevOldPoint = oldPath.points[i].clone()
          .sub(oldPath.tangents[i])
      }

      if (i < oldPath.points.length - 2) {
        nextOldPoint = oldPath.points[i + 2]
      } else {
        nextOldPoint = oldPath.points[i + 1].clone()
          .add(oldPath.tangents[i])
      }

      newPath.points.push(
        catmulRomSpline(
          t,
          prevOldPoint,
          oldPath.points[i],
          oldPath.points[i + 1],
          nextOldPoint
        )
      )
    }
  }

  newPath.normals.push(oldPath.normals[iOldPoint])
  for (let i = iOldPoint; i < jOldPoint - 1; i += 1) {
    for (let j = 1; j < n + 1; j += 1) {
      let t = j / n

      let prevOldNormal, nextOldNormal

      if (i > 0) {
        prevOldNormal = oldPath.normals[i - 1]
      } else {
        prevOldNormal = oldPath.normals[i]
      }

      if (i < oldPath.normals.length - 2) {
        nextOldNormal = oldPath.normals[i + 2]
      } else {
        nextOldNormal = oldPath.normals[i + 1]
      }

      newPath.normals.push(
        catmulRomSpline(
          t,
          prevOldNormal,
          oldPath.normals[i],
          oldPath.normals[i + 1],
          nextOldNormal
        )
          .normalize()
      )
    }
  }

  for (let i = 0; i < newPath.points.length; i += 1) {
    if (i === 0) {
      newPath.tangents.push(
        oldPath.tangents[0])
    } else if (i === newPath.points.length - 1) {
      newPath.tangents.push(
        oldPath.tangents[jOldPoint - 1])
    } else {
      newPath.tangents.push(
        newPath.points[i + 1].clone()
          .sub(newPath.points[i - 1])
          .normalize())
    }
  }

  for (let i = 0; i < newPath.points.length; i += 1) {
    newPath.binormals.push(
      v3.create()
        .crossVectors(
          newPath.tangents[i], newPath.normals[i])
    )
  }

  return newPath
}

/**
 * Trace is an object designed to be built up progressively
 * by adding to this.indices, this.points and this.normals.
 *
 * Once built, it can be expanded into a more detailed
 * trace, which is used to generate geometric pieces of
 * an extrusion where the normals and tangents are
 * controlled.
 */
class Trace extends PathAndFrenetFrames {
  constructor () {
    super()
    this.indices = []
    this.detail = 2
  }

  getReference (i) {
    let iRef = this.indices[i]
    return this.referenceObjects[iRef]
  }

  /**
   * Calculates tangents as an average on neighbouring points
   * so that we get a smooth path.
   */
  calcTangents () {
    let iStart = 0
    let iEnd = this.points.length
    let iLast = iEnd - 1
    if ((iEnd - iStart) > 2) {
      // project out first tangent from main chain
      this.tangents[iStart] = this.points[iStart + 1].clone()
        .sub(this.points[iStart])
        .normalize()

      // calculate tangents as averages of neighbouring residues
      for (let i = iStart + 1; i < iLast; i += 1) {
        this.tangents[i] = this.points[i + 1].clone()
          .sub(this.points[i - 1])
          .normalize()
      }

      // project out last tangent from main chain
      this.tangents[iLast] = this.points[iLast].clone()
        .sub(this.points[iLast - 1])
        .normalize()
    } else {
      // for short 2 point traces
      let tangent = this.points[iLast].clone()
        .sub(this.points[iStart])
        .normalize()

      this.tangents[iStart] = tangent
      this.tangents[iLast] = tangent
    }
  }

  /**
   * If normal[i] is not null,
   * it will use the normal, otherwise it will generate own
   * normal from the path curvature
   */
  calcNormals () {
    let iStart = 0
    let iEnd = this.points.length
    let iLast = iEnd - 1
    if ((iEnd - iStart) > 2) {
      for (let i = iStart + 1; i < iLast; i += 1) {
        if (this.normals[i] !== null) {
          // normal already provided, normalize properly against tangent
          this.normals[i] = perpVector(this.tangents[i], this.normals[i])
          this.normals[i].normalize()
        } else {
          // generate a normal from curvature
          let diff = this.points[i].clone().sub(this.points[i - 1])
          this.normals[i] = v3.create()
            .crossVectors(diff, this.tangents[i]).normalize()

          // smooth out auto-generated normal if flipped 180deg from prev
          let prevNormal = this.normals[i - 1]
          if (prevNormal !== null) {
            if (this.normals[i].dot(prevNormal) < 0) {
              this.normals[i].negate()
            }
          }
        }
      }

      this.normals[iStart] = this.normals[iStart + 1]
      this.normals[iLast] = this.normals[iLast - 1]
    } else {
      for (let i = iStart; i <= iLast; i += 1) {
        if (this.normals[i] !== null) {
          this.normals[i] = perpVector(this.tangents[i], this.normals[i])
          this.normals[i].normalize()
        } else {
          let randomDir = this.points[i]
          this.normals[i] = v3.create()
            .crossVectors(randomDir, this.tangents[i])
            .normalize()
        }
      }
    }
  }

  calcBinormals () {
    let iStart = 0
    let iEnd = this.points.length
    for (let i = iStart; i < iEnd; i += 1) {
      this.binormals[i] = v3.create()
        .crossVectors(this.tangents[i], this.normals[i])
    }
  }

  expand () {
    this.detailedPath = expandPath(
      this, 2 * this.detail, 0, this.points.length)
  }

  /**
   * A path is generated with 2*detail. If a
   * residue is not at the end of a piece,
   * will be extended to detail beyond that is
   * half-way between the residue and the neighboring
   * residue in a different piece.
   */
  getSegmentGeometry (iRes, face, isRound, isFront, isBack, color) {
    let path = this.detailedPath

    // works out start on expanded path, including overhang
    let iPathStart = (iRes * 2 * this.detail) - this.detail
    if (iPathStart < 0) {
      iPathStart = 0
    }

    // works out end of expanded path, including overhang
    let iPathEnd = ((iRes + 1) * 2 * this.detail) - this.detail + 1
    if (iPathEnd >= path.points.length) {
      iPathEnd = path.points.length - 1
    }

    let segmentPath = path.slice(iPathStart, iPathEnd)

    let geom = new RibbonGeometry(
      face, segmentPath, isRound, isFront, isBack)

    setGeometryVerticesColor(geom, color)

    return geom
  }

  getGeometry (face, isRound, isFront, isBack, color) {
    let path = this.detailedPath
    let iResStart = 0
    let iResEnd = this.points.length

    // works out start on expanded path, including overhang
    let iPathStart = (iResStart * 2 * this.detail) - this.detail
    if (iPathStart < 0) {
      iPathStart = 0
    }

    // works out end of expanded path, including overhang
    let iPathEnd = ((iResEnd) * 2 * this.detail) - this.detail + 1
    if (iPathEnd >= path.points.length) {
      iPathEnd = path.points.length - 1
    }

    let segmentPath = path.slice(iPathStart, iPathEnd)

    let geom = new BufferRibbonGeometry(
      this, segmentPath, isRound, isFront, isBack, color)

    return geom
  }
}

/**
 * Extrusion along a path that aligns a 2D shape as cross-section, with
 * orientation along the normal for the cross-section.
 *
 * Accepts a cross-section shape, which is a collection of 2D points around
 * the origin, and a path, which contains points, normals and binormals
 * and builds a oriented extrusion out of it.
 *
 * If round is set, then the vertex normals are set to orient along the
 * normal/binormal axis from the origin, otherwise, face normals are defined
 * perpedicular to the face.
 *
 * For a segment between two path points and a repetition of the cross-section,
 * two triangles are defined.
 */
class RibbonGeometry extends THREE.Geometry {
  /**
   * @param {THREE.Shape} shape - collection of 2D points for cross section
   * @param {PathAndFrenetFrames} path - collection of points, normals, and binormals
   * @param {boolean} round - normals are draw from centre, otherwise perp to edge
   * @param {boolean} front - draw front cross-section
   * @param {boolean} back - draw back cross-section
   */
  constructor (shape, path, round, front, back) {
    super()

    this.type = 'RibbonGeometry'

    this.parameters = {
      shape: shape,
      path: path,
      round: round
    }

    if (path.points.length < 2) {
      return
    }

    let shapePoints = shape.extractPoints(4).shape
    let nVertex = shapePoints.length

    if (_.isUndefined(round)) {
      round = false
    }

    let shapeEdgeNormals = []

    if (!round) {
      for (let j = 0; j < nVertex; j += 1) {
        let i = j - 1
        if (i === -1) {
          i = nVertex - 1
        }
        let v0 = shapePoints[i]
        let v1 = shapePoints[j]
        let x = -(v1.y - v0.y)
        let y = v1.x - v0.x
        shapeEdgeNormals.push(new THREE.Vector2(x, y))
      }
    }

    for (let iPoint = 0; iPoint < path.points.length; iPoint += 1) {
      let point = path.points[iPoint]
      let normal = path.normals[iPoint]
      let binormal = path.binormals[iPoint]

      for (let iShapePoint = 0; iShapePoint < nVertex; iShapePoint += 1) {
        let shapePoint = shapePoints[iShapePoint]

        let x = normal.clone().multiplyScalar(shapePoint.x)
        let y = binormal.clone().multiplyScalar(shapePoint.y)

        let vertex = point.clone().add(x).add(y)

        this.vertices.push(vertex)
      }

      let topOffset = this.vertices.length - 2 * nVertex
      if (topOffset < 0) {
        continue
      }

      if (round) {
        // Smoothed normals to give a rounded look
        for (let j = 0; j < nVertex; j += 1) {
          let i
          if (j === 0) {
            i = nVertex - 1
          } else {
            i = j - 1
          }
          let k = topOffset + i
          let l = topOffset + j

          let x, y

          x = path.normals[iPoint - 1].clone()
            .multiplyScalar(shapePoints[i].x)
          y = path.binormals[iPoint - 1].clone()
            .multiplyScalar(shapePoints[i].y)
          let normal00 = x.add(y)

          x = path.normals[iPoint - 1].clone()
            .multiplyScalar(shapePoints[j].x)
          y = path.binormals[iPoint - 1].clone()
            .multiplyScalar(shapePoints[j].y)
          let normal01 = x.add(y)

          x = path.normals[iPoint].clone()
            .multiplyScalar(shapePoints[j].x)
          y = path.binormals[iPoint].clone()
            .multiplyScalar(shapePoints[j].y)
          let normal11 = x.add(y)

          x = path.normals[iPoint].clone()
            .multiplyScalar(shapePoints[i].x)
          y = path.binormals[iPoint].clone()
            .multiplyScalar(shapePoints[i].y)
          let normal10 = x.add(y)

          let face = new THREE.Face3(k, k + nVertex, l + nVertex)
          face.vertexNormals = [normal00, normal10, normal11]
          this.faces.push(face)

          face = new THREE.Face3(k, l + nVertex, l)
          face.vertexNormals = [normal00, normal11, normal01]
          this.faces.push(face)
        }
      } else {
        // Continuous normals but keep faces distinct
        // along ribbon
        for (let j = 0; j < nVertex; j += 1) {
          let i
          if (j === 0) {
            i = nVertex - 1
          } else {
            i = j - 1
          }
          let k = topOffset + i
          let l = topOffset + j

          let x, y

          x = path.normals[iPoint - 1].clone()
            .multiplyScalar(shapeEdgeNormals[j].x)
          y = path.binormals[iPoint - 1].clone()
            .multiplyScalar(shapeEdgeNormals[j].y)
          let normal0 = x.add(y)

          x = path.normals[iPoint].clone()
            .multiplyScalar(shapeEdgeNormals[j].x)
          y = path.binormals[iPoint].clone()
            .multiplyScalar(shapeEdgeNormals[j].y)
          let normal1 = x.add(y)

          let face = new THREE.Face3(k, k + nVertex, l +
            nVertex)
          face.vertexNormals = [normal0, normal1, normal1]
          this.faces.push(face)

          face = new THREE.Face3(k, l + nVertex, l)
          face.vertexNormals = [normal0, normal1, normal0]
          this.faces.push(face)
        }
      }
    }

    if (front) {
      // Draw front face
      let normal = threePointNormal([
        this.vertices[0],
        this.vertices[1],
        this.vertices[2]
      ])
      for (let i = 0; i < nVertex - 2; i += 1) {
        let face = new THREE.Face3(i, i + 1, nVertex - 1)
        face.normal.copy(normal)
        this.faces.push(face)
      }
    }

    if (back) {
      // draw back face
      let offset = this.vertices.length - 1 - nVertex

      let normal = threePointNormal([
        this.vertices[offset],
        this.vertices[offset + nVertex - 1],
        this.vertices[offset + 1]
      ])

      for (let i = 0; i < nVertex - 2; i += 1) {
        let face = new THREE.Face3(
          offset + i, offset + nVertex - 1, offset + i + 1)
        face.normal.copy(normal)
        this.faces.push(face)
      }
    }
  }
}

/**
 * Extrusion along a path that aligns a 2D shape as cross-section, with
 * orientation along the normal for the cross-section.
 *
 * Accepts a cross-section shape, which is a collection of 2D points around
 * the origin, and a path, which contains points, normals and binormals
 * and builds a oriented extrusion out of it.
 *
 * If round is set, then the vertex normals are set to orient along the
 * normal/binormal axis from the origin, otherwise, face normals are defined
 * perpedicular to the face.
 *
 * For a segment between two path points and a repetition of the cross-section,
 * two triangles are defined.
 */
class BufferRibbonGeometry extends THREE.BufferGeometry {
  /**
   * @param {THREE.Shape} shape - collection of 2D points for cross section
   * @param {PathAndFrenetFrames} path - collection of points, normals, and binormals
   * @param {boolean} round - normals are draw from centre, otherwise perp to edge
   * @param {boolean} front - draw front cross-section
   * @param {boolean} back - draw back cross-section
   */
  constructor (traces, shape, front, back, isIndexColor = false) {
    super()

    this.type = 'BufferRibbonGeometry'

    this.parameters = {
      shape,
      traces,
      front,
      back,
      isIndexColor
    }

    this.shapePoints = shape.extractPoints(4).shape
    this.nShape = this.shapePoints.length

    this.nVertex = 0
    this.nFace = 0

    this.countVertexAndFacesOfPath(front, back)


    this.setAttributes()

    for (let iPath of _.range(this.paths.length)) {
      this.setPath(iPath, front, back)
    }
  }

  setPath (iPath, front, back) {
    let path = this.paths[iPath]
    let trace = this.parameters.traces[iPath]

    let iVertexOffsetOfPathPoint = []

    let iTraceStart = 0
    let iTraceEnd = trace.points.length

    function getWidth (iTracePoint) {
      return trace.segmentTypes[iTracePoint] === 'C' ? 0.5 : 8
    }

    for (let iTracePoint = iTraceStart; iTracePoint < iTraceEnd; iTracePoint += 1) {
      // iPathStart, iPathEnd on the expanded path for a given tracePoint
      // assumes an overhang between neighbouring pieces to allow for disjoint
      // coloring
      let iPathStart = (iTracePoint * 2 * trace.detail) - trace.detail
      if (iPathStart < 0) {
        iPathStart = 0
      }

      // works out end of expanded path, including overhang
      let iPathEnd = ((iTracePoint + 1) * 2 * trace.detail) - trace.detail + 1
      if (iPathEnd >= path.points.length) {
        iPathEnd = path.points.length
      }

      for (let iPathPoint = iPathStart; iPathPoint < iPathEnd; iPathPoint += 1) {
        iVertexOffsetOfPathPoint[iPathPoint] = this.vertexCount

        let color
        if (this.parameters.isIndexColor) {
          color = trace.indexColors[iTracePoint]
        } else {
          color = trace.colors[iTracePoint].clone()
        }

        let width = getWidth(iTracePoint)

        let height = 1.0

        if ((iPathPoint === iPathStart) && (iPathPoint > 0)) {
          if ((trace.segmentTypes[iTracePoint - 1] === 'C') &&
              (trace.segmentTypes[iTracePoint] !== 'C')) {
            width = getWidth(iTracePoint - 1)
          }
        }
        if ((iPathPoint === (iPathEnd - 1)) && (iTracePoint < trace.points.length - 1)) {
          let iNextTracePoint = iTracePoint + 1
          if ((trace.segmentTypes[iNextTracePoint] === 'C') &&
              (trace.segmentTypes[iTracePoint] !== 'C')) {
            width = getWidth(iNextTracePoint)
          }
        }

        let point = path.points[iPathPoint]
        let normal = path.normals[iPathPoint]
        let binormal = path.binormals[iPathPoint]

        let shapePoints = _.cloneDeep(this.shapePoints)
        for (let shapePoint of shapePoints) {
          shapePoint.x = shapePoint.x * width
          shapePoint.y = shapePoint.y * height
        }

        for (let shapePoint of shapePoints) {
          let x = normal.clone().multiplyScalar(shapePoint.x)
          let y = binormal.clone().multiplyScalar(shapePoint.y)
          this.pushVertex(point.clone().add(x).add(y), color)
        }

        if (iPathPoint === 0) {
          continue
        }

        let iVertexOffset = iVertexOffsetOfPathPoint[iPathPoint - 1]

        // Smoothed normals to give a rounded look
        for (let iShapePoint = 0; iShapePoint < this.nShape; iShapePoint += 1) {
          let iLastShapePoint
          if (iShapePoint === 0) {
            iLastShapePoint = this.nShape - 1
          } else {
            iLastShapePoint = iShapePoint - 1
          }

          let iVertex00 = iVertexOffset + iLastShapePoint
          let iVertex01 = iVertexOffset + iShapePoint
          let iVertex10 = iVertex00 + this.nShape
          let iVertex11 = iVertex01 + this.nShape

          this.pushFace(iVertex00, iVertex10, iVertex11)
          this.pushFace(iVertex01, iVertex00, iVertex11)
        }
      }
    }

    // need to calculate own normals to be smoother
    this.computeVertexNormals()
  }

  setAttributes () {
    let positions = new Float32Array(this.nVertex * 3)
    let normals = new Float32Array(this.nVertex * 3)
    let indices = new Int32Array(this.nFace * 3)
    let colors = new Float32Array(this.nVertex * 3)

    this.addAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    this.addAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    this.addAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    this.setIndex(new THREE.Uint32BufferAttribute(indices, 1))

    this.positions = this.attributes.position.array
    this.normals = this.attributes.normal.array
    this.indices = this.index.array
    this.colors = this.attributes.color.array

    this.positionCount = 0
    this.indexCount = 0
    this.vertexCount = 0
  }

  pushVertex (vertex, color) {
    this.positions[this.positionCount] = vertex.x
    this.positions[this.positionCount + 1] = vertex.y
    this.positions[this.positionCount + 2] = vertex.z

    this.colors[this.positionCount] = color.r
    this.colors[this.positionCount + 1] = color.g
    this.colors[this.positionCount + 2] = color.b

    this.positionCount += 3
    this.vertexCount += 1
  }

  pushFace (i, j, k) {
    this.indices[this.indexCount] = i
    this.indices[this.indexCount + 1] = j
    this.indices[this.indexCount + 2] = k

    this.indexCount += 3
  }

  pushFaceAndNormals (i, j, k, normalI, normalJ, normalK) {
    this.pushFace(i, j, k)

    this.normals[i * 3] = normalI.x
    this.normals[i * 3 + 1] = normalI.y
    this.normals[i * 3 + 2] = normalI.z

    this.normals[j * 3] = normalJ.x
    this.normals[j * 3 + 1] = normalJ.y
    this.normals[j * 3 + 2] = normalJ.z

    this.normals[k * 3] = normalK.x
    this.normals[k * 3 + 1] = normalK.y
    this.normals[k * 3 + 2] = normalK.z
  }

  getVertex (iVertex) {
    return v3.create(
      this.positions[iVertex * 3],
      this.positions[iVertex * 3 + 1],
      this.positions[iVertex * 3 + 2])
  }

  countVertexAndFacesOfPath (front, back) {
    this.nVertex = 0
    this.nFace = 0

    this.paths = []
    for (let trace of this.parameters.traces) {
      let path = trace.detailedPath
      this.paths.push(path)

      let nPath = path.points.length
      this.nVertex += (nPath + trace.points.length - 1) * this.nShape

      let nTrace = trace.points.length
      this.nFace += ((nTrace - 1) * 2 * this.nShape * (2 * trace.detail + 1))
    }
  }
}

/**
 * Creates a unit-based block arrow pointing in the -Z direction.
 * It can be reorientated using a lookAt() call
 */
class BlockArrowGeometry extends THREE.ExtrudeGeometry {
  constructor () {
    let shape = new THREE.Shape([
      new THREE.Vector2(-0.4, -0.5),
      new THREE.Vector2(0.0, +0.5),
      new THREE.Vector2(+0.4, -0.5)
    ])

    let path = new THREE.CatmullRomCurve3([
      v3.create(0, -0.3, 0),
      v3.create(0, 0.3, 0)
    ])

    super(
      shape,
      {
        steps: 2,
        bevelEnabled: false,
        extrudePath: path
      }
    )

    this.type = 'BlockArrowGeometry'

    this.applyMatrix(
      new THREE.Matrix4()
        .makeRotationFromEuler(
          new THREE.Euler(0, Math.PI / 2, 0)))
  }
}

/**
 * Creates a cylinder that is orientated along
 * the z-direction. Use lookAt to reorientate
 */
class UnitCylinderGeometry extends THREE.CylinderGeometry {
  constructor () {
    super(1, 1, 1, 4, 1, false)

    this.type = 'UnitCylinderGeometry'

    this.applyMatrix(
      new THREE.Matrix4()
        .makeRotationFromEuler(
          new THREE.Euler(Math.PI / 2, Math.PI, 0)))
  }
}

/**
 * Takes a bunch of points and treats it as defining
 * a polygon, and raises it to a certain thickness.
 */
class RaisedShapeGeometry extends THREE.Geometry {
  constructor (vertices, thickness) {
    super()

    this.type = 'RaisedShapeGeometry'

    this.parameters = {
      vertices: vertices,
      thickness: thickness
    }

    let normal = threePointNormal(vertices.slice(0, 3))

    let displacement = normal.clone()
      .multiplyScalar(thickness / 2)

    let nVertex = vertices.length
    let iLast = nVertex - 1
    let offset = nVertex

    for (let i = 0; i < vertices.length; i += 1) {
      this.vertices.push(
        vertices[i].clone().add(displacement))
    }
    for (let i = 0; i < vertices.length; i += 1) {
      this.vertices.push(
        vertices[i].clone().sub(displacement))
    }

    for (let i = 0; i < nVertex - 2; i += 1) {
      let face = new THREE.Face3(i, i + 1, iLast)
      this.faces.push(face)
    }

    for (let i = 0; i < nVertex - 2; i += 1) {
      let face = new THREE.Face3(
        offset + i, offset + iLast, offset + i + 1)
      this.faces.push(face)
    }

    for (let i = 0; i < nVertex; i += 1) {
      let j
      if (i === nVertex - 1) {
        j = 0
      } else {
        j = i + 1
      }

      this.faces.push(new THREE.Face3(i, i + offset, j + offset))
      this.faces.push(new THREE.Face3(i, j + offset, j))
    }

    this.computeFaceNormals()
  }
}

/**
 * Convenience function to set the visibility of a THREE
 * Object3D collection of meshes and other objects
 *
 * @param {THREE.Object3D} obj
 * @param {boolean} visibility
 */
function setVisible (obj, visibility) {
  if (_.isUndefined(obj)) {
    return
  }
  obj.traverse(function (c) {
    c.visible = visibility
  })
}

/**
 * A generic cleaner for a THREE.Object3D collection,
 * where a custom 'dontDelete' field is used to
 * avoid deletion, and all other children are
 * disposed of correctly to reclaim memory
 *
 * @param {THREE.Object3D} obj
 */
function clearObject3D (obj) {
  let iLast = obj.children.length - 1
  for (let i = iLast; i >= 0; i -= 1) {
    let child = obj.children[i]
    if (!_.isUndefined(child.dontDelete)) {
      continue
    }
    if (!_.isUndefined(child.geometry)) {
      child.geometry.dispose()
    }
    if (!_.isUndefined(child.material)) {
      child.material.dispose()
    }
    obj.remove(child)
  }
}

function perpVector (ref, vec) {
  let vecAlongRef = ref.clone()
    .multiplyScalar(vec.dot(ref))

  return vec.clone().sub(vecAlongRef)
}

function threePointNormal (vertices) {
  let cb = new THREE.Vector3()
  let ab = new THREE.Vector3()

  cb.subVectors(vertices[2], vertices[1])
  ab.subVectors(vertices[0], vertices[1])
  cb.cross(ab)

  cb.normalize()

  return cb
}

function getUnitVectorRotation (reference, target) {
  return new THREE.Quaternion()
    .setFromUnitVectors(reference, target)
}

function fraction (reference, target, t) {
  return t * (target - reference) + reference
}

function getFractionRotation (rotation, t) {
  let identity = new THREE.Quaternion()
  return identity.slerp(rotation, t)
}

function setGeometryVerticesColor (geom, color) {
  for (let i = 0; i < geom.faces.length; i += 1) {
    let face = geom.faces[i]
    face.vertexColors[0] = color
    face.vertexColors[1] = color
    face.vertexColors[2] = color
  }
}

function mergeUnitGeom (totalGeom, unitGeom, color, matrix) {
  setGeometryVerticesColor(unitGeom, color)
  totalGeom.merge(unitGeom, matrix)
}

/**
 * Calculates the transform matrix for a SphereGeometry
 * to a given position and radius
 *
 * @param {THREE.Vector3} pos
 * @param {Number} radius
 * @returns {THREE.Matrix4}
 */
function getSphereMatrix (pos, radius) {
  let obj = new THREE.Object3D()
  obj.matrix.identity()
  obj.position.copy(pos)
  obj.scale.set(radius, radius, radius)
  obj.updateMatrix()
  return obj.matrix
}

/**
 * Calculates the transform matrix for a UnitCylinderGeometry
 * to orientate along the axis between the 'from' and 'to' vector
 *
 * @param {THREE.Vector3} from
 * @param {THREE.Vector3} to
 * @param {Number} radius
 * @returns {THREE.Matrix4}
 */
function getCylinderMatrix (from, to, radius) {
  let obj = new THREE.Object3D()
  obj.scale.set(radius, radius, from.distanceTo(to))
  obj.position.copy(from).add(to).multiplyScalar(0.5)
  obj.lookAt(to)
  obj.updateMatrix()
  return obj.matrix
}

function applyMatrix4toVector3array (matrix, vec3Array, iStart, iEnd) {
  let elems = matrix.elements
  for (let i = iStart; i < iEnd; i += 3) {
    let x = vec3Array[i]
    let y = vec3Array[i + 1]
    let z = vec3Array[i + 2]
    vec3Array[i] = elems[0] * x + elems[4] * y + elems[8] * z + elems[12]
    vec3Array[i + 1] = elems[1] * x + elems[5] * y + elems[9] * z + elems[13]
    vec3Array[i + 2] = elems[2] * x + elems[6] * y + elems[10] * z + elems[14]
  }
}

function applyRotationOfMatrix4toVector3array (matrix, vec3Array, iStart, iEnd) {
  let elems = matrix.elements
  for (let i = iStart; i < iEnd; i += 3) {
    let x = vec3Array[i]
    let y = vec3Array[i + 1]
    let z = vec3Array[i + 2]
    vec3Array[i] = elems[0] * x + elems[4] * y + elems[8] * z
    vec3Array[i + 1] = elems[1] * x + elems[5] * y + elems[9] * z
    vec3Array[i + 2] = elems[2] * x + elems[6] * y + elems[10] * z
  }
}

function expandFloatArray (refArray, nCopy) {
  let nElem = refArray.length
  let targetArray = new Float32Array(nElem * nCopy)
  for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
    let iStart = iCopy * nElem
    for (let i = 0; i < nElem; i += 1) {
      targetArray[iStart + i] = refArray[i]
    }
  }
  return targetArray
}

function applyColorToVector3array (color, vec3Array, iStart, iEnd) {
  for (let i = iStart; i < iEnd; i += 3) {
    vec3Array[i] = color.r
    vec3Array[i + 1] = color.g
    vec3Array[i + 2] = color.b
  }
}

function expandIndices (refArray, nCopy, nIndexInCopy) {
  let nElem = refArray.length
  let targetArray = new Uint32Array(nElem * nCopy)
  for (let iCopy = 0; iCopy < nCopy; iCopy += 1) {
    let iStart = iCopy * nElem
    let indexOffset = iCopy * nIndexInCopy
    for (let i = 0; i < nElem; i += 1) {
      targetArray[iStart + i] = refArray[i] + indexOffset
    }
  }
  return targetArray
}

/**
 * CopyBufferGeometry is designed to replicate multiple copies of
 * an existing BufferGeometry in one single assignment - thus
 * efficiently creating a large dataset
 */
class CopyBufferGeometry extends THREE.BufferGeometry {
  constructor (copyBufferGeometry, nCopy) {
    super()

    this.type = 'CopyBufferGeometry'
    this.parameters = {
      nCopy: nCopy
    }

    this.refBufferGeometry = copyBufferGeometry

    let positions = expandFloatArray(copyBufferGeometry.attributes.position.array, nCopy)
    this.addAttribute(
      'position', new THREE.Float32BufferAttribute(positions, 3))

    let normals = expandFloatArray(copyBufferGeometry.attributes.normal.array, nCopy)
    this.addAttribute(
      'normal', new THREE.Float32BufferAttribute(normals, 3))

    let uvs = expandFloatArray(copyBufferGeometry.attributes.uv.array, nCopy)
    this.addAttribute(
      'uv', new THREE.Float32BufferAttribute(uvs, 2))

    let nVertexInCopy = copyBufferGeometry.attributes.position.count

    if ('index' in copyBufferGeometry) {
      if (copyBufferGeometry.index) {
        let indices = expandIndices(copyBufferGeometry.index.array, nCopy, nVertexInCopy)
        this.setIndex(new THREE.Uint32BufferAttribute(indices, 1))
      }
    }

    let colors = new Float32Array(nVertexInCopy * 3 * nCopy)
    this.addAttribute(
      'color', new THREE.Float32BufferAttribute(colors, 3))
  }

  applyMatrixToCopy (matrix, iCopy) {
    let nElemRef = this.refBufferGeometry.attributes.position.array.length
    let positions = this.attributes.position.array
    let normals = this.attributes.normal.array
    let iElemStart = iCopy * nElemRef
    let iElemEnd = iElemStart + nElemRef
    applyMatrix4toVector3array(matrix, positions, iElemStart, iElemEnd)
    applyRotationOfMatrix4toVector3array(matrix, normals, iElemStart, iElemEnd)
  }

  applyColorToCopy (color, iCopy) {
    let nElemRef = this.refBufferGeometry.attributes.position.array.length
    let colors = this.attributes.color.array
    let iElemStart = iCopy * nElemRef
    let iElemEnd = iElemStart + nElemRef
    applyColorToVector3array(color, colors, iElemStart, iElemEnd)
  }
}

export {
  BlockArrowGeometry,
  UnitCylinderGeometry,
  setVisible,
  RaisedShapeGeometry,
  RibbonGeometry,
  BufferRibbonGeometry,
  getUnitVectorRotation,
  getFractionRotation,
  fraction,
  setGeometryVerticesColor,
  clearObject3D,
  Trace,
  mergeUnitGeom,
  getSphereMatrix,
  getCylinderMatrix,
  CopyBufferGeometry,
  applyMatrix4toVector3array,
  applyRotationOfMatrix4toVector3array,
  applyColorToVector3array
}
