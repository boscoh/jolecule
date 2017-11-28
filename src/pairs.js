
/**
 * Finds pairs of vertices that have been coarsely grouped together
 * using spatial hashes of boxes of div^3. All vertices in neighboring
 * boxes are considered close pairs.
 *
 * @param {Array<THREE.Vector3>} vertices - list of positions
 * @returns {Array} - array of pairs of positions
 */
function getClosePairs(vertices) {
  const padding = 0.05
  const div = 5.0
  const inv_div = 1.0 / div
  let maxima = [0.0, 0.0, 0.0]
  let minima = [0.0, 0.0, 0.0]
  let spans = [0.0, 0.0, 0.0]
  let sizes = [0, 0, 0]

  for (let i_dim = 0; i_dim < 3; i_dim++) {
    for (let i = 0; i < vertices.length; i += 1) {
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
    let result = []
    for (let j = 0; j < 3; j++) {
      result.push(Math.round((v[j] - minima[j]) * inv_div))
    }
    return result
  }

  function space_to_hash (s) {
    return s[0] * sizes[1] * sizes[2] + s[1] * sizes[2] + s[2]
  }

  let cells = {}
  let spaces = []
  for (let i = 0; i < vertices.length; i++) {
    let vertex = vertices[i]
    let space = vertex_to_space(vertex)
    spaces.push(space)
    let space_hash = space_to_hash(space)
    if (!(space_hash in cells)) {
      cells[space_hash] = []
    }
    cells[space_hash].push(i)
  }

  function neighbourhood_in_dim (space, i_dim) {
    const start = Math.max(0, space[i_dim] - 1)
    const end = Math.min(sizes[i_dim], space[i_dim] + 2)
    let result = []
    for (let i = start; i < end; i++) {
      result.push(i)
    }
    return result
  }

  function space_neighbourhood (space) {
    let result = []
    const neighbourhood0 = neighbourhood_in_dim(space, 0)
    const neighbourhood1 = neighbourhood_in_dim(space, 1)
    const neighbourhood2 = neighbourhood_in_dim(space, 2)
    for (let s0 = 0; s0 < neighbourhood0.length; s0++) {
      for (let s1 = 0; s1 < neighbourhood1.length; s1++) {
        for (let s2 = 0; s2 < neighbourhood2.length; s2++) {
          result.push([neighbourhood0[s0],
            neighbourhood1[s1],
            neighbourhood2[s2]])
        }
      }
    }
    return result
  }

  let pairs = []
  for (let i = 0; i < vertices.length; i++) {
    let neighbourhood = space_neighbourhood(spaces[i])
    for (let j_neigh = 0; j_neigh < neighbourhood.length; j_neigh++) {
      let hash = space_to_hash(neighbourhood[j_neigh])
      if (hash in cells) {
        let cell = cells[hash]
        for (let j_cell = 0; j_cell < cell.length; j_cell++) {
          let j = cell[j_cell]
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