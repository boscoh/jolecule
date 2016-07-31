
import THREE from "three";

function consoleLogMethods(myObject) {
  var myPrototype = Object.getPrototypeOf(myObject);
  for (let name of Object.getOwnPropertyNames(myPrototype)) {
    let method = myObject[name];
    console.log(method, name);
  }
}

var SMALL = 1E-6;

class Vector extends THREE.Vector3 {

  // length() already defined
  // clone() already defined

  toString() {
    return '(' +
      this.x + ',' +
      this.y + ',' +
      this.z + ')';
  }

  transform(m) {
    this.applyMatrix4(m);
  }

  scale(s) {
    this.x *= s;
    this.y *= s;
    this.z *= s;
  }

  clone() {
    return new Vector(this.x, this.y, this.z);
  }
}

function is_near_zero(a) {
  return Math.abs(a) < SMALL;
}

function create(x, y, z) {
  return new Vector(x, y, z);
}

function scaled(v, s) {
  var w = create(v.x, v.y, v.z);
  w.scale(s);
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
  if (is_near_zero(axis_len)) {
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

function cross_product(a, b) {
  return new Vector().crossVectors(a, b);
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
  if (is_near_zero(a_len * b_len)) {
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
  var cross = cross_product(ref_perp, v_perp);
  if (dot_product(cross, axis) > 0) {
    a = -a;
  }
  return a;
}

function mid_point(p, q) {
  var s = sum(p, q);
  return scaled(s, 0.5);
}


function random() {
  return create(
    Math.random(), Math.random(), Math.random());
}


function is_equal(v, w) {
  if (!is_near_zero(v.x-w.x)) {
    return false;
  } else if (!is_near_zero(v.y-w.y)) {
    return false;
  } else if (!is_near_zero(v.y-w.y)) {
    return false;
  }
  return true;
}

function is_aligned(v, w) {
  return is_near_zero(angle(v, w));
}

var Matrix = THREE.Matrix4;

function matrix_product(lhs, rhs) {
  var c = new Matrix();
  c.multiplyMatrices(lhs, rhs);
  return c;
}

function rotation(axis, theta) {
  var a = axis.clone().normalize();
  return new Matrix().makeRotationAxis(a, theta);
}

function translation(p) {
  var c = new Matrix();
  return c.makeTranslation(p.x, p.y, p.z);
}

function transformed(v, m) {
  var w = v.clone();
  w.transform(m);
  return w;
}

var v3 = {
  SMALL,
  is_near_zero,
  Vector,
  create,
  scaled,
  normalized,
  diff,
  sum,
  parallel,
  perpendicular,
  cross_product,
  dot_product,
  distance,
  angle,
  dihedral,
  mid_point,
  random,
  is_equal,
  is_aligned,
  Matrix,
  matrix_product,
  rotation,
  translation,
  transformed
};

export default v3;
