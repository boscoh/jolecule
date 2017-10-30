import THREE from 'three'

var TV3 = THREE.Vector3
var TCo = THREE.Color


function exists (x) {
  return typeof x !== 'undefined'
}


function catmulRomSpline (t, p1, p2, p3, p4) {

  return new TV3(
    THREE.CurveUtils.interpolate(p1.x, p2.x, p3.x, p4.x, t),
    THREE.CurveUtils.interpolate(p1.y, p2.y, p3.y, p4.y, t),
    THREE.CurveUtils.interpolate(p1.z, p2.z, p3.z, p4.z, t)
  )

}


/**
 * Create a path for extrusion where the direction of the
 * normal and binormal is defined, as well as the tangent.
 *
 * In particular, the path provides a slice() function
 * that produces a sub-portion of the path.
 *
 * @constructor
 *
 */
function PathAndFrenetFrames () {
  this.points = []
  this.normals = []
  this.tangents = []
  this.binormals = []

  this.getSpacedPoints = function(steps) {
    return this.points
  }

  this.slice = function(i, j) {
    var subPath = new PathAndFrenetFrames()
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
 * @param oldPath
 * @param n
 * @param iOldPoint
 * @param jOldPoint
 * @returns {PathAndFrenetFrames}
 */
function expandPath (oldPath, n, iOldPoint, jOldPoint) {

  if (typeof iOldPoint == 'undefined') {
    iOldPoint = 0
  }

  if (typeof jOldPoint == 'undefined') {
    jOldPoint = oldPath.points.length
  }

  var newPath = new PathAndFrenetFrames()

  newPath.points.push(oldPath.points[iOldPoint])

  for (var i = iOldPoint; i < jOldPoint - 1; i += 1) {

    var j_start = 1
    var j_end = n + 1

    for (var j = j_start; j < j_end; j += 1) {

      var t = 1.0 * j / n

      var prevOldPoint, nextOldPoint

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
  for (var i = iOldPoint; i < jOldPoint - 1; i += 1) {

    for (var j = 1; j < n + 1; j += 1) {

      var t = 1.0 * j / n

      var prevOldNormal, nextOldNormal

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

  for (var i = 0; i < newPath.points.length; i += 1) {
    if (i == 0) {
      newPath.tangents.push(
        oldPath.tangents[0])
    } else if (i == newPath.points.length - 1) {
      newPath.tangents.push(
        oldPath.tangents[jOldPoint - 1])
    } else {
      newPath.tangents.push(
        newPath.points[i + 1].clone()
          .sub(newPath.points[i - 1])
          .normalize())
    }
  }

  for (var i = 0; i < newPath.points.length; i += 1) {
    newPath.binormals.push(
      new TV3()
        .crossVectors(
          newPath.tangents[i], newPath.normals[i])
    )
  }

  return newPath
}


function BlockArrowGeometry () {

  // Block arrow that points in the -Z direction
  // So can be reorientated using a lookAt() call

  var shape = new THREE.Shape([
    new THREE.Vector2(-0.4, -0.5),
    new THREE.Vector2(0.0, +0.5),
    new THREE.Vector2(+0.4, -0.5)
  ])

  var path = new THREE.CatmullRomCurve3(
    [new TV3(0, -0.3, 0),
      new TV3(0, 0.3, 0)
    ])

  THREE.ExtrudeGeometry.call(
    this,
    shape,
    {
      steps: 2,
      bevelEnabled: false,
      extrudePath: path,
    }
  )

  this.type = 'BlockArrowGeometry'

  this.applyMatrix(
    new THREE.Matrix4()
      .makeRotationFromEuler(
        new THREE.Euler(0, Math.PI / 2, 0)))

}

BlockArrowGeometry.prototype = Object.create(THREE.ExtrudeGeometry.prototype)
BlockArrowGeometry.prototype.constructor = BlockArrowGeometry


function UnitCylinderGeometry () {

  // rotate cylinder to point in z-direction,
  // allows lookAt to orientate along cylinder

  THREE.CylinderGeometry.call(this, 1, 1, 1, 4, 1, false)

  this.type = 'UnitCylinderGeometry'

  this.applyMatrix(
    new THREE.Matrix4()
      .makeRotationFromEuler(
        new THREE.Euler(Math.PI / 2, Math.PI, 0)))

}

UnitCylinderGeometry.prototype = Object.create(THREE.CylinderGeometry.prototype)
UnitCylinderGeometry.prototype.constructor = UnitCylinderGeometry


var setVisible = function(obj, b) {

  if (!exists(obj)) {
    return
  }

  obj.traverse(function(c) {
    c.visible = b
  })

}


function perpVector (ref, vec) {

  var vec_along_ref = ref.clone()
    .multiplyScalar(vec.dot(ref))

  return vec.clone().sub(vec_along_ref)

}


function threePointNormal (vertices) {

  var cb = new THREE.Vector3()
  var ab = new THREE.Vector3()

  cb.subVectors(vertices[2], vertices[1])
  ab.subVectors(vertices[0], vertices[1])
  cb.cross(ab)

  cb.normalize()

  return cb
}


function RaisedShapeGeometry (vertices, thickness) {

  THREE.Geometry.call(this)

  this.type = 'RaisedShapeGeometry'

  this.parameters = {
    vertices: vertices,
    thickness: thickness
  }

  nVertex = vertices.length

  var normal = threePointNormal(vertices.slice(0, 3))

  var displacement = normal.clone()
    .multiplyScalar(+thickness / 2)

  var nVertex = vertices.length
  var iLast = nVertex - 1
  var offset = nVertex

  for (var i = 0; i < vertices.length; i += 1) {
    this.vertices.push(vertices[i].clone()
      .add(displacement))
  }
  for (var i = 0; i < vertices.length; i += 1) {
    this.vertices.push(vertices[i].clone()
      .sub(displacement))
  }

  for (var i = 0; i < nVertex - 2; i += 1) {
    this.faces.push(new THREE.Face3(i, i + 1, iLast))
  }

  for (var i = 0; i < nVertex - 2; i += 1) {
    this.faces.push(new THREE.Face3(
      offset + i, offset + iLast, offset + i + 1))
  }

  for (var i = 0; i < nVertex; i += 1) {
    var j
    if (i == nVertex - 1) {
      j = 0
    } else {
      j = i + 1
    }
    this.faces.push(new THREE.Face3(i, i + offset, j + offset))
    this.faces.push(new THREE.Face3(i, j + offset, j))
  }

}

RaisedShapeGeometry.prototype = Object.create(THREE.Geometry.prototype)
RaisedShapeGeometry.prototype.constructor = RaisedShapeGeometry


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
 * For a segment between two path points and a repitition of the cross-section,
 * two triangles are defined.
 *
 * @param {THREE.Shape} shape - collection of 2D points for cross section
 * @param {THREE.FrenetFrame} path - collection of points, normals, and binormals
 * @param {boolean} round - boolean
 */
function RibbonGeometry (shape, path, round, front, back) {

  THREE.Geometry.call(this)

  this.type = 'RibbonGeometry'

  this.parameters = {
    shape: shape,
    path: path,
    round: round
  }

  if (path.points.length < 2) {
    return
  }

  var shapePoints = shape.extractPoints(4)
    .shape
  var nVertex = shapePoints.length

  if (!exists(round)) {
    round = false
  }

  if (!round) {

    var shapeEdgeNormals = []
    for (var j = 0; j < nVertex; j += 1) {
      var i = j - 1
      if (i == -1) {
        i = nVertex - 1
      }
      var v0 = shapePoints[i]
      var v1 = shapePoints[j]
      var x = -( v1.y - v0.y )
      var y = v1.x - v0.x
      shapeEdgeNormals.push(new THREE.Vector2(x, y))
    }

  }

  for (var iPoint = 0; iPoint < path.points.length; iPoint += 1) {

    var point = path.points[iPoint]
    var normal = path.normals[iPoint]
    var binormal = path.binormals[iPoint]

    for (var iShapePoint = 0; iShapePoint < nVertex; iShapePoint +=
      1) {

      var shapePoint = shapePoints[iShapePoint]

      var x = normal.clone()
        .multiplyScalar(shapePoint.x)
      var y = binormal.clone()
        .multiplyScalar(shapePoint.y)

      var vertex = point.clone()
        .add(x)
        .add(y)

      this.vertices.push(vertex)

    }

    var topOffset = this.vertices.length - 2 * nVertex
    if (topOffset < 0) {
      continue
    }

    if (round) {
      // Smoothed normals to give a rounded look
      for (var j = 0; j < nVertex; j += 1) {
        if (j == 0) {
          i = nVertex - 1
        } else {
          i = j - 1
        }
        var k = topOffset + i
        var l = topOffset + j

        var x = path.normals[iPoint - 1].clone()
          .multiplyScalar(shapePoints[j].x)
        var y = path.binormals[iPoint - 1].clone()
          .multiplyScalar(shapePoints[j].y)
        var normal01 = x.add(y)

        var x = path.normals[iPoint].clone()
          .multiplyScalar(shapePoints[j].x)
        var y = path.binormals[iPoint].clone()
          .multiplyScalar(shapePoints[j].y)
        var normal11 = x.add(y)

        var x = path.normals[iPoint - 1].clone()
          .multiplyScalar(shapePoints[i].x)
        var y = path.binormals[iPoint - 1].clone()
          .multiplyScalar(shapePoints[i].y)
        var normal00 = x.add(y)

        var x = path.normals[iPoint].clone()
          .multiplyScalar(shapePoints[i].x)
        var y = path.binormals[iPoint].clone()
          .multiplyScalar(shapePoints[i].y)
        var normal10 = x.add(y)

        var face = new THREE.Face3(k, k + nVertex, l +
          nVertex)
        face.vertexNormals = [normal00, normal10, normal11]
        this.faces.push(face)

        var face = new THREE.Face3(k, l + nVertex, l)
        face.vertexNormals = [normal00, normal11, normal01]
        this.faces.push(face)
      }

    } else {
      // Continuous normals but keep faces distinct
      // along ribbon
      for (var j = 0; j < nVertex; j += 1) {
        if (j == 0) {
          i = nVertex - 1
        } else {
          i = j - 1
        }
        var k = topOffset + i
        var l = topOffset + j

        var x = path.normals[iPoint - 1].clone()
          .multiplyScalar(shapeEdgeNormals[j].x)
        var y = path.binormals[iPoint - 1].clone()
          .multiplyScalar(shapeEdgeNormals[j].y)
        var normal0 = x.add(y)

        var x = path.normals[iPoint].clone()
          .multiplyScalar(shapeEdgeNormals[j].x)
        var y = path.binormals[iPoint].clone()
          .multiplyScalar(shapeEdgeNormals[j].y)
        var normal1 = x.add(y)

        var face = new THREE.Face3(k, k + nVertex, l +
          nVertex)
        face.vertexNormals = [normal0, normal1, normal1]
        this.faces.push(face)

        var face = new THREE.Face3(k, l + nVertex, l)
        face.vertexNormals = [normal0, normal1, normal0]
        this.faces.push(face)
      }
    }
  }

  if (front) {
    // Draw front face
    normal = threePointNormal([
      this.vertices[0],
      this.vertices[1],
      this.vertices[2]
    ])
    for (var i = 0; i < nVertex - 2; i += 1) {
      var face = new THREE.Face3(i, i + 1, nVertex - 1)
      face.normal.copy(normal)
      this.faces.push(face)
    }
  }

  if (back) {
    // draw back face
    var offset = this.vertices.length - 1 - nVertex

    normal = threePointNormal([
      this.vertices[offset],
      this.vertices[offset + nVertex - 1],
      this.vertices[offset + 1]
    ])

    for (var i = 0; i < nVertex - 2; i += 1) {
      face = new THREE.Face3(
        offset + i, offset + nVertex - 1, offset + i + 1)
      face.normal.copy(normal)
      this.faces.push(face)
    }
  }

}

RibbonGeometry.prototype = Object.create(THREE.Geometry.prototype)
RibbonGeometry.prototype.constructor = RibbonGeometry


function getUnitVectorRotation (reference, target) {

  return new THREE.Quaternion()
    .setFromUnitVectors(reference, target)

}


function getFractionRotation (rotation, t) {

  var identity = new THREE.Quaternion()
  return identity.slerp(rotation, t)

}


function setGeometryVerticesColor (geom, color) {

  for (var i = 0; i < geom.faces.length; i += 1) {
    var face = geom.faces[i]
    face.vertexColors[0] = color
    face.vertexColors[1] = color
    face.vertexColors[2] = color
  }

}


function clearObject3D (obj) {
  // clearing obj does not clear scene
  var iLast = obj.children.length - 1
  for (var i = iLast; i >= 0; i -= 1) {
    var child = obj.children[i]
    if (!_.isUndefined(child.dontDelete)) {
      return
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


export {
  PathAndFrenetFrames,
  BlockArrowGeometry,
  UnitCylinderGeometry,
  setVisible,
  expandPath,
  perpVector,
  RaisedShapeGeometry,
  RibbonGeometry,
  getUnitVectorRotation,
  getFractionRotation,
  setGeometryVerticesColor,
  clearObject3D
}


// function drawExtrusion( shape, pathAndFrenetFrames, color ) {

//     var steps = pathAndFrenetFrames.points.length - 1;
//     var frames = pathAndFrenetFrames;

//     var geometry = new THREE.ExtrudeGeometry(
//             shape, {
//                 // curveSegments: 4,
//                 steps: steps,
//                 bevelEnabled: false,
//                 extrudePath: pathAndFrenetFrames,
//                 frames: pathAndFrenetFrames
//             }
//         )
//         // geometry.mergeVertices();
//     geometry.computeFaceNormals();
//     geometry.computeVertexNormals();

//     var material = new THREE.MeshLambertMaterial( {
//         color: color
//     } );

//     return new THREE.Mesh( geometry, material );
// }