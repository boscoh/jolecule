/**
 * testv3.py is a unit test for the vector library
 * interface used by jolecule. Created by boscoh on 1/07/2016.
 */

import v3 from "./v3";

function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}

/**
 * @returns {number} - from [-1.0, 1.0]
 */
function get_random_real() {
  return (Math.random() - 0.5) * 2.0;
}

/**
 * @returns {THREE.Vector3} - random vector in the unit circle
 */
function get_random_vector() {
  return v3.create(
    get_random_real(),
    get_random_real(),
    get_random_real());
}

function radians(degrees) {
  return degrees / 180.0 * Math.PI;
}

{
// make vectors
  let v = get_random_vector();
  let w = v.clone(v);
  assert(v3.isEqual(v, w));
}

{
// vector subtractiions and additions
  let b = get_random_vector();
  let c = v3.sum(v, b);
  let d = v3.diff(c, b);
  assert(v3.isEqual(v, d));
}

{
// test orthogonal rotations
  let x = v3.create(get_random_real(), 0, 0);
  let y = v3.create(0, get_random_real(), 0);
  let z = v3.create(0, 0, get_random_real());
  let rotation = v3.rotation(y, radians(90));
  let ry_x = x.clone();
  ry_x.applyMatrix4(rotation);
  ry_x.multiplyScalar(-1);
  assert(v3.isEqual(z, ry_x));
}

{
// test cross product
  let cross_x_y = v3.crossProduct(x, y);
  assert(v3.isEqual(
    v3.normalized(cross_x_y),
    v3.normalized(z)));
  let cross_y_x = v3.crossProduct(x, y);
  let neg_z = z.clone();
  neg_z.multiplyScalar(-1)
  assert(v3.isEqual(
    v3.normalized(cross_x_y), neg_z));
}

{
// test translation
  let x = v3.create(get_random_real(), 0, 0);
  let y = v3.create(0, get_random_real(), 0);
  let translation = v3.translation(y);
  let x_and_y = x.clone();
  x_and_y.applyMatrix4(translation);
  let x_plus_y = v3.sum(x, y);
  assert(v3.isEqual(x_plus_y, x_and_y));
}

{
// test rotation
  let x = get_random_vector();
  let rotation = v3.rotation(get_random_vector(), Math.random());
  let y = x.clone();
  y.applyMatrix4(rotation);
  assert(v3.isNearZero(x.length() - y.length()));
}

{
// test matrix combination
  let matrices = [rotation, translation, rotation, translation];
  let n = matrices.length;
  let combined_matrix = new v3.Matrix4();
  let x = get_random_vector();
  let y = x.clone();
  for (let matrix of matrices) {
    x.applyMatrix4(matrix);
    combined_matrix = v3.matrixProduct(
      matrix, combined_matrix);
  }
  y.applyMatrix4(combined_matrix);
  assert(v3.isEqual(x, y));
}