

/**
 * 
 * v3.js - is a simple function based wrapper library around the vector
 * portion of THREE.js. THREE.Vector3 are created and manipulated using
 * factory functions, which was the original approach used in a deprecated
 * vector library. This was replaced with the fully-featured vector library
 * in THREE.js
 * 
 **/

import THREE from "three";


var SMALL = 1E-6;


function isNearZero(a) {
  return Math.abs(a) < SMALL;
}


function create(x, y, z) {
  return new THREE.Vector3(x, y, z);
}


function clone( v ) {
  return v.clone();
}


function scaled(v, s) {
  var w = create(v.x, v.y, v.z);
  w.multiplyScalar(s);
  return w;
}


function normalized(v) {
  return scaled(v, 1.0/v.length());
}


function diff(b, a) {
  return create(b.x-a.x, b.y-a.y, b.z-a.z);
}


function sum(a, b) {
  return create(b.x+a.x, b.y+a.y, b.z+a.z);
}


function parallel(v, axis) {
  var axis_len = axis.length();
  var result;
  if (isNearZero(axis_len)) {
    result = create(v.x, v.y, v.z);
  } else {
    var scale = dot_product(v, axis)/axis_len/axis_len;
    result = scaled(axis, scale);
  }
  return result;
}


function perpendicular(v, axis) {
  return diff(v, parallel(v, axis));
}

function crossProduct(a, b) {
  return new THREE.Vector3().crossVectors(a, b);
}

function dot_product(a, b) {
  return a.x*b.x + a.y*b.y + a.z*b.z;
}

function distance(p1, p2) {
  return diff(p1, p2).length();
}


function angle(a, b) {
  var a_len = a.length();
  var b_len = b.length();
  if (isNearZero(a_len * b_len)) {
    return 0.0;
  }
  var c = dot_product(a, b) / a_len / b_len;
  if (c >=  1.0) {
    return 0.0;
  }
  if (c < -1.0) {
    return Math.PI;
  }
  return Math.acos(c);
}


function dihedral(ref, axis, v) {
  // + values: right-hand screw rotation of v
  //           around axis relative to ref
  var ref_perp = perpendicular(ref, axis);
  var v_perp = perpendicular(v, axis);
  var a = angle(ref_perp, v_perp);
  var cross = crossProduct(ref_perp, v_perp);
  if (dot_product(cross, axis) > 0) {
    a = -a;
  }
  return a;
}

function midPoint(p, q) {
  var s = sum(p, q);
  return scaled(s, 0.5);
}


function random() {
  return create(
    Math.random(), Math.random(), Math.random());
}


function isEqual(v, w) {
  if (!isNearZero(v.x-w.x)) {
    return false;
  } else if (!isNearZero(v.y-w.y)) {
    return false;
  } else if (!isNearZero(v.y-w.y)) {
    return false;
  }
  return true;
}

function is_aligned(v, w) {
  return isNearZero(angle(v, w));
}

var Matrix4 = THREE.Matrix4;

function matrixProduct(lhs, rhs) {
  var c = new Matrix4();
  c.multiplyMatrices(lhs, rhs);
  return c;
}

function rotation(axis, theta) {
  var a = axis.clone().normalize();
  return new Matrix4().makeRotationAxis(a, theta);
}

function translation(p) {
  var c = new Matrix4();
  return c.makeTranslation(p.x, p.y, p.z);
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
  dot_product,
  distance,
  angle,
  dihedral,
  midPoint,
  random,
  isEqual,
  is_aligned,
  Matrix4,
  matrixProduct,
  rotation,
  translation,
};

