
/**
 *
 * v3.js - is a simple function based wrapper library around the vector
 * portion of THREE.js. THREE.Vector3 are created and manipulated using
 * factory functions, which was the original approach used in a deprecated
 * vector library. This was replaced with the fully-featured vector library
 * in THREE.js
 *
 */

import * as THREE from 'three'

const SMALL = 1E-6

function isNearZero (a) {
  return Math.abs(a) < SMALL
}

function create (x, y, z) {
  return new THREE.Vector3(x, y, z)
}

function clone (v) {
  return v.clone()
}

function scaled (v, s) {
  let w = create(v.x, v.y, v.z)
  w.multiplyScalar(s)
  return w
}

function normalized (v) {
  return scaled(v, 1.0 / v.length())
}

function diff (b, a) {
  return create(b.x - a.x, b.y - a.y, b.z - a.z)
}

function sum (a, b) {
  return create(b.x + a.x, b.y + a.y, b.z + a.z)
}

function parallel (v, axis) {
  let axisLen = axis.length()
  let result
  if (isNearZero(axisLen)) {
    result = create(v.x, v.y, v.z)
  } else {
    let scale = dotProduct(v, axis) / axisLen / axisLen
    result = scaled(axis, scale)
  }
  return result
}

function perpendicular (v, axis) {
  return diff(v, parallel(v, axis))
}

function crossProduct (a, b) {
  return new THREE.Vector3().crossVectors(a, b)
}

function dotProduct (a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function distance (p1, p2) {
  return diff(p1, p2).length()
}

function angle (a, b) {
  let aLen = a.length()
  let bLen = b.length()
  if (isNearZero(aLen * bLen)) {
    return 0.0
  }
  let c = dotProduct(a, b) / aLen / bLen
  if (c >= 1.0) {
    return 0.0
  }
  if (c < -1.0) {
    return Math.PI
  }
  return Math.acos(c)
}

function dihedral (ref, axis, v) {
  // + values: right-hand screw rotation of v
  //           around axis relative to ref
  let refPerp = perpendicular(ref, axis)
  let vPerp = perpendicular(v, axis)
  let a = angle(refPerp, vPerp)
  let cross = crossProduct(refPerp, vPerp)
  if (dotProduct(cross, axis) > 0) {
    a = -a
  }
  return a
}

function midPoint (p, q) {
  let s = sum(p, q)
  return scaled(s, 0.5)
}

function random () {
  return create(
    Math.random(), Math.random(), Math.random())
}

function isEqual (v, w) {
  if (!isNearZero(v.x - w.x)) {
    return false
  } else if (!isNearZero(v.y - w.y)) {
    return false
  } else if (!isNearZero(v.y - w.y)) {
    return false
  }
  return true
}

function isAligned (v, w) {
  return isNearZero(angle(v, w))
}

let Matrix4 = THREE.Matrix4

function matrixProduct (lhs, rhs) {
  let c = new Matrix4()
  c.multiplyMatrices(lhs, rhs)
  return c
}

function rotation (axis, theta) {
  let a = axis.clone().normalize()
  return new Matrix4().makeRotationAxis(a, theta)
}

function translation (p) {
  let c = new Matrix4()
  return c.makeTranslation(p.x, p.y, p.z)
}

function degToRad (deg) {
  return deg * Math.PI / 180.0
}

export default {
  SMALL,
  isNearZero,
  create,
  clone,
  scaled,
  normalized,
  diff,
  sum,
  parallel,
  perpendicular,
  crossProduct,
  dotProduct,
  distance,
  angle,
  dihedral,
  midPoint,
  random,
  isEqual,
  isAligned,
  Matrix4,
  matrixProduct,
  rotation,
  translation,
  degToRad
}
