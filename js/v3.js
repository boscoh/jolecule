// vector library

var v3 = {

  SMALL: 1E-6,
  
  is_near_zero: function (a) {
    return Math.abs(a) < v3.SMALL;
  },


  Vector: function (x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;

    this.length = function() {
      return Math.sqrt(
           this.x*this.x + this.y*this.y + this.z*this.z);
    }

    this.transform = function(matrix) {
      var x = 
          matrix.elem00 * this.x + 
          matrix.elem10 * this.y + 
          matrix.elem20 * this.z + 
          matrix.elem30;
      var y = 
          matrix.elem01 * this.x + 
          matrix.elem11 * this.y + 
          matrix.elem21 * this.z + 
          matrix.elem31;
      var z = 
          matrix.elem02 * this.x + 
          matrix.elem12 * this.y + 
          matrix.elem22 * this.z + 
          matrix.elem32;
      this.x = x;
      this.y = y;
      this.z = z;    
    }

    this.scale = function(s) {
      this.x *= s;
      this.y *= s;
      this.z *= s;
    }

    this.toString = function () {
      return '(' + 
          this.x + ',' + 
          this.y + ',' + 
          this.z + ')';
    }

    this.clone = function () {
      return new v3.Vector(this.x, this.y, this.z);
    }
  },
 
  
  create: function(x, y, z) {
    return new v3.Vector(x, y, z);
  },


  scaled: function(v, s) {
    w = v3.create(v.x, v.y, v.z);
    w.scale(s);
    return w;
  },

  
  normalized: function(v) {
    return v3.scaled(v, 1.0/v.length());
  },


  diff: function(b, a) {
    return v3.create(b.x-a.x, b.y-a.y, b.z-a.z);
  },


  sum: function(a, b) {
    return v3.create(b.x+a.x, b.y+a.y, b.z+a.z);
  },


  parallel: function(v, axis) {
    var axis_len = axis.length();
    var result;
    if (v3.is_near_zero(axis_len)) {
      result = v3.create(v.x, v.y, v.z);
    } else {
      var scale = v3.dot_product(v, axis)/axis_len/axis_len;
      result = v3.scaled(axis, scale);
    }
    return result;
  },


  perpendicular: function(v, axis) {
    return v3.diff(v, v3.parallel(v, axis));
  },


  cross_product: function(a, b) {
    return v3.create(
        a.y*b.z - a.z*b.y,
        a.z*b.x - a.x*b.z,
        a.x*b.y - a.y*b.x);
  },


  dot_product: function(a, b) {
    return a.x*b.x + a.y*b.y + a.z*b.z;
  },


  distance: function(p1, p2) { 
    return v3.diff(p1, p2).length(); 
  },


  angle: function(a, b) {
    var a_len = a.length();
    var b_len = b.length();
    if (v3.is_near_zero(a_len * b_len)) {
      return 0.0;
    }
    var c = v3.dot_product(a, b) / a_len / b_len;
    if (c >=  1.0) { 
      return 0.0;
    }
    if (c < -1.0) {
      return Math.PI;
    }
    return Math.acos(c);
  },


  dihedral: function(ref, axis, v) {
    // + values: right-hand screw rotation of v 
    //           around axis relative to ref
    ref_perp = v3.perpendicular(ref, axis);
    v_perp = v3.perpendicular(v, axis);
    a = v3.angle(ref_perp, v_perp);
    cross = v3.cross_product(ref_perp, v_perp);
    if (v3.dot_product(cross, axis) > 0) {
      a = -a;
    }
    return a;
  },


  mid_point: function(p, q) {
    var s = v3.sum(p, q);
    return v3.scaled(s, 0.5);
  },


  random: function() {
    return v3.create(
        Math.random(), Math.random(), Math.random());
  },
  
  
  is_equal: function(v, w) {
    if (!v3.is_near_zero(v.x-w.x)) {
      return false;
    } else if (!v3.is_near_zero(v.y-w.y)) {
      return false;
    } else if (!v3.is_near_zero(v.y-w.y)) {
      return false;
    }
    return true;
  },


  is_aligned: function(v, w) {
    return v3.is_near_zero(v3.angle(v, w));
  },


  Matrix: function() {
    this.elem00 = 1.0;
    this.elem01 = 0.0;
    this.elem02 = 0.0;
    this.elem03 = 0.0;

    this.elem10 = 0.0;
    this.elem11 = 1.0;
    this.elem12 = 0.0;
    this.elem13 = 0.0;

    this.elem20 = 0.0;
    this.elem21 = 0.0;
    this.elem22 = 1.0;
    this.elem23 = 0.0;

    this.elem30 = 0.0;
    this.elem31 = 0.0;
    this.elem32 = 0.0;
    this.elem33 = 1.0;

    this.set_elem = function(i, j, val) {
      if (j==0) {
        if (i==0) { this.elem00 = val; }
        if (i==1) { this.elem10 = val; }
        if (i==2) { this.elem20 = val; }
        if (i==3) { this.elem30 = val; }
      }
      if (j==1) {
        if (i==0) { this.elem01 = val; }
        if (i==1) { this.elem11 = val; }
        if (i==2) { this.elem21 = val; }
        if (i==3) { this.elem31 = val; }
      }
      if (j==2) {
        if (i==0) { this.elem02 = val; }
        if (i==1) { this.elem12 = val; }
        if (i==2) { this.elem22 = val; }
        if (i==3) { this.elem32 = val; }
      }
      if (j==3) {
        if (i==0) { this.elem03 = val; }
        if (i==1) { this.elem13 = val; }
        if (i==2) { this.elem23 = val; }
        if (i==3) { this.elem33 = val; }
      }
    }

    this.elem = function(i, j) {
      if (j==0) {
        if (i==0) { return this.elem00; }
        if (i==1) { return this.elem10; }
        if (i==2) { return this.elem20; }
        if (i==3) { return this.elem30; }
      }
      if (j==1) {
        if (i==0) { return this.elem01; }
        if (i==1) { return this.elem11; }
        if (i==2) { return this.elem21; }
        if (i==3) { return this.elem31; }
      }
      if (j==2) {
        if (i==0) { return this.elem02; }
        if (i==1) { return this.elem12; }
        if (i==2) { return this.elem22; }
        if (i==3) { return this.elem32; }
      }
      if (j==3) {
        if (i==0) { return this.elem03; }
        if (i==1) { return this.elem13; }
        if (i==2) { return this.elem23; }
        if (i==3) { return this.elem33; }
      }
    }
  },


  matrix_product: function(lhs, rhs) {
    c = new v3.Matrix();
    for (var i=0; i<3; i+=1) {
      for (var j=0; j<3; j+=1) {
        val = 0.0;
        for (var k=0; k<3; k+=1) {
           val += lhs.elem(k,i) * rhs.elem(j,k);
        }
        c.set_elem(j, i, val);
      }
      // c(3,i) is the translation vector
      val = lhs.elem(3, i);
      for (var k=0; k<3; k+=1) {
        val += lhs.elem(k,i) * rhs.elem(3,k);
      }
      c.set_elem(3, i, val);
    }
    return c;
  },


  rotation: function(axis, theta) {
    v = v3.normalized(axis);

    c = Math.cos(theta);
    s = Math.sin(theta);
    t = 1.0 - c;

    m = new v3.Matrix();

    m.elem00 = t * v.x * v.x  +        c;
    m.elem01 = t * v.x * v.y  +  v.z * s;
    m.elem02 = t * v.x * v.z  -  v.y * s;

    m.elem10 = t * v.y * v.x  -  v.z * s;
    m.elem11 = t * v.y * v.y  +        c;
    m.elem12 = t * v.y * v.z  +  v.x * s;

    m.elem20 = t * v.z * v.x  +  v.y * s;
    m.elem21 = t * v.z * v.y  -  v.x * s;
    m.elem22 = t * v.z * v.z  +        c;

    return m;
  },


  translation: function(p) {
    //""" matrix to translate a vector"""
    var m = new v3.Matrix();
    m.elem30 = p.x;
    m.elem31 = p.y;
    m.elem32 = p.z;
    return m;
  },


  transformed: function(v, m) {
    var w = v3.create(v.x, v.y, v.z);
    w.transform(m);
    return w;
  },
}


