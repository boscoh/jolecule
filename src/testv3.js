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
 * @returns {Vector} - random vector in the unit circle
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

function consoleLogMethods(myObject) {
    var myPrototype = Object.getPrototypeOf(myObject);
    for (let name of Object.getOwnPropertyNames(myPrototype)) {
        let method = myObject[name];
        console.log(method, name);
    }
}

// make vectors
var v = get_random_vector();
var w = v.clone(v);
assert(v3.isEqual(v, w));

// vector subtractiions and additions
var b = get_random_vector();
var c = v3.sum(v, b);
var d = v3.diff(c, b);
assert(v3.isEqual(v, d));

// test orthogonal rotations
var x = v3.create(get_random_real(), 0, 0);
var y = v3.create(0, get_random_real(), 0);
var z = v3.create(0, 0, get_random_real());
var rotation = v3.rotation(y, radians(90));
var ry_x = x.clone();
ry_x.applyMatrix4(rotation);
ry_x.multiplyScalar(-1);
assert(v3.isEqual(z, ry_x));

// test cross product
var cross_x_y = v3.crossProduct(x, y);
assert(v3.isEqual(
    v3.normalized(cross_x_y),
    v3.normalized(z)));
var cross_y_x = v3.crossProduct(x, y);
var neg_z = z.clone();
neg_z.multiplyScalar(-1)
assert(v3.isEqual(
    v3.normalized(cross_x_y), neg_z));

// test translation
var x = v3.create(get_random_real(), 0, 0);
var y = v3.create(0, get_random_real(), 0);
var translation = v3.translation(y);
var x_and_y = x.clone();
x_and_y.applyMatrix4(translation);
var x_plus_y = v3.sum(x, y);
assert(v3.isEqual(x_plus_y, x_and_y));

// test rotation
var x = get_random_vector();
var rotation = v3.rotation(get_random_vector(), Math.random());
var y = x.clone();
y.applyMatrix4(rotation);
assert(v3.isNearZero(x.length() - y.length()));

// test matrix combination
var matrices = [rotation, translation, rotation, translation];
var n = matrices.length;
var combined_matrix = new v3.Matrix4();
var x = get_random_vector();
var y = x.clone();
for (var matrix of matrices) {
    x.applyMatrix4(matrix);
    combined_matrix = v3.matrixProduct(
        matrix, combined_matrix);
}
y.applyMatrix4(combined_matrix);
assert(v3.isEqual(x, y));
