/**
 * Finds pairs of vertices that have been coarsely grouped together
 * using spatial hashes of boxes of div^3. All vertices in neighboring
 * boxes are considered close pairs.
 *
 * Vertex - [x, y, z] in real coordinates
 *
 * Space - [i, j, k] integer indices in grid space
 *
 * Spacehash - hash integer hash of a space
 *
 * SpaceHashes are spaces converted to a single integer
 *
 * @param {Array<THREE.Vector3>} vertices - list of positions
 * @returns {Array} - array of pairs of positions
 */
class SpaceHash {
  constructor (vertices) {
    console.log('SpaceHash assigning vertices to cells')

    this.vertices = vertices
    this.padding = 0.05
    this.div = 5.0
    this.invDiv = 1.0 / this.div
    this.maxima = [0.0, 0.0, 0.0]
    this.minima = [0.0, 0.0, 0.0]
    this.spans = [0.0, 0.0, 0.0]
    this.sizes = [0, 0, 0]

    for (let iDim = 0; iDim < 3; iDim++) {
      for (let iVertex = 0; iVertex < this.vertices.length; iVertex += 1) {
        if (this.minima[iDim] > this.vertices[iVertex][iDim]) {
          this.minima[iDim] = this.vertices[iVertex][iDim]
        }
        if (this.maxima[iDim] < this.vertices[iVertex][iDim]) {
          this.maxima[iDim] = this.vertices[iVertex][iDim]
        }
      }
      this.minima[iDim] -= this.padding
      this.maxima[iDim] += this.padding
      this.spans[iDim] = this.maxima[iDim] - this.minima[iDim]
      this.sizes[iDim] = Math.ceil(this.spans[iDim] * this.invDiv)
    }

    this.cells = {}
    this.spaces = []
    for (let iVertex = 0; iVertex < this.vertices.length; iVertex++) {
      let vertex = this.vertices[iVertex]
      let space = this.getSpaceFromVertex(vertex)
      this.spaces.push(space)
      let hash = this.getHashFromSpace(space)
      if (!(hash in this.cells)) {
        this.cells[hash] = []
      }
      this.cells[hash].push(iVertex)
    }
  }

  getSpaceFromVertex (vertex) {
    let result = []
    for (let iDim = 0; iDim < 3; iDim++) {
      result.push(Math.round((vertex[iDim] - this.minima[iDim]) * this.invDiv))
    }
    return result
  }

  getHashFromSpace (s) {
    return s[0] * this.sizes[1] * this.sizes[2] + s[1] * this.sizes[2] + s[2]
  }

  pushCellOfSpace (pairs, vertex, iVertex) {
    let spaceCenter = this.getSpaceFromVertex(vertex)

    let space0start = Math.max(0, spaceCenter[0] - 1)
    let space0end = Math.min(this.sizes[0], spaceCenter[0] + 2)
    let space1start = Math.max(0, spaceCenter[1] - 1)
    let space1end = Math.min(this.sizes[1], spaceCenter[1] + 2)
    let space2start = Math.max(0, spaceCenter[2] - 1)
    let space2end = Math.min(this.sizes[2], spaceCenter[2] + 2)

    for (let space0 = space0start; space0 < space0end; space0++) {
      for (let space1 = space1start; space1 < space1end; space1++) {
        for (let space2 = space2start; space2 < space2end; space2++) {
          let hash = this.getHashFromSpace([space0, space1, space2])
          if (hash in this.cells) {
            let cell = this.cells[hash]
            for (let jVertexInCell = 0; jVertexInCell < cell.length; jVertexInCell++) {
              let jVertex = cell[jVertexInCell]
              pairs.push([iVertex, jVertex])
            }
          }
        }
      }
    }
  }

  getClosePairs () {
    console.log('SpatialHash.getClosePairs')
    let pairs = []
    for (let iVertex = 0; iVertex < this.vertices.length; iVertex++) {
      this.pushCellOfSpace(pairs, this.vertices[iVertex], iVertex)
    }
    return pairs
  }

  getVerticesNearPoint (vertex, iVertex) {
    console.log('SpatialHash.getClosePairs')
    let pairs = []
    this.pushCellOfSpace(pairs, vertex, iVertex)
    return pairs
  }
}

export { SpaceHash }
