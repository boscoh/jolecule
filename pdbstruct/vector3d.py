#vector3d.py

import math
import random


RAD2DEG = 180.0 / math.pi
DEG2RAD = math.pi / 180.0
SMALL = 1E-6


def is_near_zero(a):
  return a < SMALL


class Vector3d:

  def __init__(self, x=0.0, y=0.0, z=0.0):
    self.x = x
    self.y = y
    self.z = z

  def __add__(self, rhs):
    return Vector3d(rhs.x + self.x, rhs.y + self.y, rhs.z + self.z)

  def __sub__(self, rhs):
    return Vector3d(self.x - rhs.x, self.y - rhs.y, self.z - rhs.z)

  def __neg__(self):
    return Vector3d(-self.x, -self.y, -self.z)

  def __pos__(self):
    return Vector3d(self.x, self.y, self.z)

  def __eq__(self, rhs):
    return (is_near_zero(self.x - rhs.x) and \
            is_near_zero(self.y - rhs.y) and \
            is_near_zero(self.z - rhs.z))

  def __ne__(self, rhs):
    return not (x == rhs)

  def __str__(self):
    return "(% .2f, % .2f, % .2f)" % (self.x, self.y, self.z)

  def __repr__(self):
    return "Vector3d(%f, %f, %f)" % (self.x, self.y, self.z)

  def set(self, x, y, z):
    self.x = x
    self.y = y
    self.z = z

  def copy(self):
    return Vector3d(self.x, self.y, self.z)

  def length_sq(self):
    return self.x*self.x + self.y*self.y + self.z*self.z

  def length(self):
    return math.sqrt(self.x*self.x + self.y*self.y + self.z*self.z)

  def scale(self, scale):
    self.x *= scale
    self.y *= scale
    self.z *= scale

  def normalize(self):
    self.scale(1.0 / self.length())

  def scaled_vec(self, scale):
    v = self.copy()
    v.scale(scale)
    return v

  def normal_vec(self):
    return self.scaled_vec(1.0 / self.length())

  def parallel_vec(self, axis):
    axis_len = axis.length()
    if is_near_zero(axis_len):
      result = self
    else:
      result = axis.scaled_vec(dot(self, axis) 
               / axis.length() / axis.length())
    return result

  def perpendicular_vec(self, axis):
    return self - self.parallel_vec(axis)

  def transform(self, matrix):
    x = matrix.elem00 * self.x + \
        matrix.elem10 * self.y + \
        matrix.elem20 * self.z + \
        matrix.elem30
    y = matrix.elem01 * self.x + \
        matrix.elem11 * self.y + \
        matrix.elem21 * self.z + \
        matrix.elem31
    z = matrix.elem02 * self.x + \
        matrix.elem12 * self.y + \
        matrix.elem22 * self.z + \
        matrix.elem32
    self.x, self.y, self.z = x, y, z


def normalize_angle(angle):
  while abs(angle) > math.pi:
    if angle > math.pi:
      angle -= math.pi*2
    if angle < -math.pi:
      angle += 2*math.pi
  if is_near_zero(abs(angle + math.pi)):
    angle = math.pi
  return angle


def angle_diff(angle1, angle2):
  norm_angle1 = normalize_angle(angle1)
  norm_angle2 = normalize_angle(angle2)
  return normalize_angle(norm_angle1 - norm_angle2)


def dot(a, b):
  return a.x*b.x + a.y*b.y + a.z*b.z


def CrossProductVec(a, b):
  return Vector3d(a.y*b.z - a.z*b.y,
                  a.z*b.x - a.x*b.z,
                  a.x*b.y - a.y*b.x)


def pos_distance(p1, p2):
  return math.sqrt(pos_distance_sq(p2, p1))


def pos_distance_sq(p1, p2):
  x = p1.x - p2.x
  y = p1.y - p2.y
  z = p1.z - p2.z
  return x*x + y*y + z*z;


def vec_angle(a, b):
  a_len = a.length()
  b_len = b.length()

  if a_len * b_len < 1E-6:
    return 0.0

  c = dot(a, b) / a_len / b_len

  if c >=  1.0:
    return 0.0
  elif c <= -1.0:
    return math.pi
  else:
    return math.acos(c)


def pos_angle(p1, p2, p3):
  return vec_angle(p1-p2, p3-p2)


def vec_dihedral(a, axis, c):
  ap = a.perpendicular_vec(axis)
  cp = c.perpendicular_vec(axis)

  angle = vec_angle(ap, cp)

  if dot(CrossProductVec(ap, cp), axis) > 0:
    angle = -angle

  return angle


def pos_dihedral(p1, p2, p3, p4):
  return vec_dihedral(p1-p2, p2-p3, p4-p3)


def RotatedPos(theta, anchor, center, pos):
  return Rotation(center - anchor, theta, center).transform_vec(pos)


def ProjectedPos(length, angle, dihedral, p1, p2, p3):
  norm = plane_normal(p1, p2, p3);
  axis = p3 - p2;

  vec_diff = axis.scaled_vec(-length);
  vec_diff = RotationAtOrigin(norm, -angle).transform_vec(vec_diff)
  vec_diff = RotationAtOrigin(axis, dihedral).transform_vec(vec_diff)

  return p3 + vec_diff


class Matrix3d:

  def __init__(self):
    self.elem00 = 1.0
    self.elem01 = 0.0
    self.elem02 = 0.0
    self.elem03 = 0.0

    self.elem10 = 0.0
    self.elem11 = 1.0
    self.elem12 = 0.0
    self.elem13 = 0.0

    self.elem20 = 0.0
    self.elem21 = 0.0
    self.elem22 = 1.0
    self.elem23 = 0.0

    self.elem30 = 0.0
    self.elem31 = 0.0
    self.elem32 = 0.0
    self.elem33 = 1.0

  def __str__(self):
    row1 = "  [% .2f, % .2f, % .2f ]\n" % \
              (self.elem00, self.elem01, self.elem02)
    row2 = "  [% .2f, % .2f, % .2f ]\n" % \
              (self.elem10, self.elem11, self.elem12)
    row3 = "  [% .2f, % .2f, % .2f ]\n" % \
              (self.elem20, self.elem21, self.elem22)
    row4 = "  [ ------------------ ]\n"
    row5 = "  [% .2f, % .2f, % .2f ]" % \
              (self.elem30, self.elem31, self.elem32)
    return row1 + row2 + row3 + row4 + row5

  def elem(self, i, j):
    if j==0:
      if i==0: return self.elem00
      if i==1: return self.elem10
      if i==2: return self.elem20
      if i==3: return self.elem30
    if j==1:
      if i==0: return self.elem01
      if i==1: return self.elem11
      if i==2: return self.elem21
      if i==3: return self.elem31
    if j==2:
      if i==0: return self.elem02
      if i==1: return self.elem12
      if i==2: return self.elem22
      if i==3: return self.elem32
    if j==3:
      if i==0: return self.elem03
      if i==1: return self.elem13
      if i==2: return self.elem23
      if i==3: return self.elem33

  def set_elem(self, i, j, val):
    if j==0:
      if i==0: self.elem00 = val
      if i==1: self.elem10 = val
      if i==2: self.elem20 = val
      if i==3: self.elem30 = val
    if j==1:
      if i==0: self.elem01 = val
      if i==1: self.elem11 = val
      if i==2: self.elem21 = val
      if i==3: self.elem31 = val
    if j==2:
      if i==0: self.elem02 = val
      if i==1: self.elem12 = val
      if i==2: self.elem22 = val
      if i==3: self.elem32 = val
    if j==3:
      if i==0: self.elem03 = val
      if i==1: self.elem13 = val
      if i==2: self.elem23 = val
      if i==3: self.elem33 = val

  def __eq__(self, rhs):
    for i in range(0, 3):
      for j in range(0, 3):
        if abs(self.elem(i,j) - rhs.elem(i,j)) > SMALL:
	      return False
    return True
	
  def __mul__(self, rhs):
    c = Matrix3d()
    for i in range(0, 3):
      for j in range(0, 3):
        val = 0.0
        for k in range(0, 3):
           val += self.elem(k,i) * rhs.elem(j,k)
        c.set_elem(j, i, val)
      # c(3,i) is the translation vector
      val = self.elem(3, i)
      for k in range(0,3):
        val += self.elem(k,i) * rhs.elem(3,k)
      c.set_elem(3, i, val)
    return c


  def transform_vec(self, v):
    # v'[i] = sum(over j) M[j][i] v[j]
    x = self.elem00 * v.x + \
        self.elem10 * v.y + \
        self.elem20 * v.z + \
        self.elem30
    y = self.elem01 * v.x + \
        self.elem11 * v.y + \
        self.elem21 * v.z + \
        self.elem31
    z = self.elem02 * v.x + \
        self.elem12 * v.y + \
        self.elem22 * v.z + \
        self.elem32
    return Vector3d(x, y, z)


def RotationAtOrigin(axis, theta):
  """ matrix to rotate a vector at origin"""
  v = axis.normal_vec()

  c = math.cos(float(theta))
  s = math.sin(float(theta))
  t = 1.0 - c

  m = Matrix3d()

  m.elem00 = t * v.x * v.x  +        c
  m.elem01 = t * v.x * v.y  +  v.z * s
  m.elem02 = t * v.x * v.z  -  v.y * s

  m.elem10 = t * v.y * v.x  -  v.z * s
  m.elem11 = t * v.y * v.y  +        c
  m.elem12 = t * v.y * v.z  +  v.x * s

  m.elem20 = t * v.z * v.x  +  v.y * s
  m.elem21 = t * v.z * v.y  -  v.x * s
  m.elem22 = t * v.z * v.z  +        c

  return m


def Translation(p):
  """ matrix to translate a vector"""
  m = Matrix3d()
  m.elem30 = p.x
  m.elem31 = p.y
  m.elem32 = p.z
  return m


def Rotation(axis, theta, center):
  """ matrix to rotate around an axis at center"""
  rot = RotationAtOrigin(axis, theta)
  trans = Translation(center - rot.transform_vec(center))
  return trans*rot


def Superposition3(ref1, ref2, ref3, mov1, mov2, mov3):

  mov_diff = mov2 - mov1
  ref_diff = ref2 - ref1

  m1 = Matrix3d()
  if math.fabs(vec_angle(mov_diff, ref_diff)) < SMALL:
    m1 = Translation(ref1-mov1)
  else:
    axis = CrossProductVec(mov_diff, ref_diff)
    torsion = vec_dihedral(ref_diff, axis, mov_diff)
    rot = RotationAtOrigin(axis, torsion)
    trans = Translation(ref2 - rot.transform_vec(mov2))
    m1 = trans*rot

  mov_diff = ref2 - m1.transform_vec(mov3)
  ref_diff = ref2 - ref3

  m = Matrix3d()
  if math.fabs(vec_angle(mov_diff, ref_diff)) < SMALL:
    m = m1
  else:
    axis = ref2 - ref1
    torsion = vec_dihedral(ref_diff, axis, mov_diff)
    m2 = RotationAtOrigin(axis, torsion)
    m3 = Translation(ref2 - m2.transform_vec(ref2))
    m = m3*m2*m1

  return m


def RandomVec():
  return Vector3d(random.uniform(-100, 100),
                  random.uniform(-100, 100),
                  random.uniform(-100, 100))


def RandomOriginRotation():
  axis = RandomVec()
  angle = random.uniform(-math.pi/2, math.pi/2)
  return RotationAtOrigin(axis, angle)


def RandomTransform():
  axis = RandomVec()
  angle = random.uniform(-math.pi/2, math.pi/2)
  center = RandomVec()
  return Rotation(axis, angle, center)


