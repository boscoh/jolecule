
/**
 * Finds pairs of vertices that have been coarsely grouped together
 * using spatial hashes of boxes of div^3. All vertices in neighboring
 * boxes are considered close pairs.
 *
 * @param {Array<Vector3D>} vertices - list of positions
 * @returns {Array} - array of tuples of positions
 */
function getClosePairs(vertices) {
  var padding = 0.05
  var div = 5.0
  var inv_div = 1.0 / div
  var maxima = [0.0, 0.0, 0.0]
  var minima = [0.0, 0.0, 0.0]
  var spans = [0.0, 0.0, 0.0]
  var sizes = [0, 0, 0]

  for (var i_dim = 0; i_dim < 3; i_dim++) {
    for (var i = 0; i < vertices.length; i += 1) {
      if (minima[i_dim] > vertices[i][i_dim]) {
        minima[i_dim] = vertices[i][i_dim]
      }
      if (maxima[i_dim] < vertices[i][i_dim]) {
        maxima[i_dim] = vertices[i][i_dim]
      }
    }
    minima[i_dim] -= padding
    maxima[i_dim] += padding
    spans[i_dim] = maxima[i_dim] - minima[i_dim]
    sizes[i_dim] = Math.ceil(spans[i_dim] * inv_div)
  }

  function vertex_to_space (v) {
    var result = []
    for (var j = 0; j < 3; j++) {
      result.push(Math.round((v[j] - minima[j]) * inv_div))
    }
    return result
  }

  function space_to_hash (s) {
    return s[0] * sizes[1] * sizes[2] + s[1] * sizes[2] + s[2]
  }

  var cells = {}
  var spaces = []
  for (var i = 0; i < vertices.length; i++) {
    var vertex = vertices[i]
    var space = vertex_to_space(vertex)
    spaces.push(space)
    var space_hash = space_to_hash(space)
    if (!(space_hash in cells)) {
      cells[space_hash] = []
    }
    cells[space_hash].push(i)
  }

  function neighbourhood_in_dim (space, i_dim) {
    var start = Math.max(0, space[i_dim] - 1)
    var end = Math.min(sizes[i_dim], space[i_dim] + 2)
    var result = []
    for (var i = start; i < end; i++) {
      result.push(i)
    }
    return result
  }

  function space_neighbourhood (space) {
    var result = []
    var neighbourhood0 = neighbourhood_in_dim(space, 0)
    var neighbourhood1 = neighbourhood_in_dim(space, 1)
    var neighbourhood2 = neighbourhood_in_dim(space, 2)
    for (var s0 = 0; s0 < neighbourhood0.length; s0++) {
      for (var s1 = 0; s1 < neighbourhood1.length; s1++) {
        for (var s2 = 0; s2 < neighbourhood2.length; s2++) {
          result.push([neighbourhood0[s0],
            neighbourhood1[s1],
            neighbourhood2[s2]])
        }
      }
    }
    return result
  }

  var pairs = []
  for (var i = 0; i < vertices.length; i++) {
    var neighbourhood = space_neighbourhood(spaces[i])
    for (var j_neigh = 0; j_neigh < neighbourhood.length; j_neigh++) {
      var hash = space_to_hash(neighbourhood[j_neigh])
      if (hash in cells) {
        var cell = cells[hash]
        for (var j_cell = 0; j_cell < cell.length; j_cell++) {
          var j = cell[j_cell]
          if (i < j) {
            pairs.push([i, j])
          }
        }
      }
    }
  }
  return pairs
}

export { getClosePairs }