/**
 * @file Store - an array-based space-efficient typed datastore, to be used
 * as a Flyweight, with an associated Proxy
 *
 * adapted from NGL @author Alexander Rose <alexander.rose@weirdbyte.de>
 */

function getTypedArray (arrayType, arraySize) {
  switch (arrayType) {
    case 'int8':
      return new Int8Array(arraySize)
    case 'int16':
      return new Int16Array(arraySize)
    case 'int32':
      return new Int32Array(arraySize)
    case 'uint8':
      return new Uint8Array(arraySize)
    case 'uint16':
      return new Uint16Array(arraySize)
    case 'uint32':
      return new Uint32Array(arraySize)
    case 'float32':
      return new Float32Array(arraySize)
    default:
      throw new Error('arrayType unknown: ' + arrayType)
  }
}

/**
 * Store - an array-based space-efficient typed datastore, to be used
 * as a Flyweight, with an associated Proxy
 */
class Store {
  /**
   * @param fields - list of typed fields in the store
   * @param {Integer} size - initial size of the datastore
   */
  constructor (fields, size) {
    // actual size allocated
    this.length = 0

    // size to use, updated by this.growIfFull
    this.count = 0

    this._fields = fields

    if (Number.isInteger(size)) {
      this._init(size)
    } else {
      this._init(0)
    }
  }

  /**
   * Initialize the store
   * @param {Integer} size - size to initialize
   */
  _init (size) {
    this.length = size
    this.count = 0

    for (let field of this._fields) {
      this._initField(...field)
    }
  }

  /**
   * Initialize a field
   * @param  {String} name - field name
   * @param  {Integer} size - element size
   * @param  {String} type - data type, one of int8, int16, int32,
   *                         uint8, uint16, uint32, float32
   */
  _initField (name, size, type) {
    this[ name ] = getTypedArray(type, this.length * size)
  }

  /**
   * Add a field
   * @param  {String} name - field name
   * @param  {Integer} size - element size
   * @param  {String} type - data type, one of int8, int16, int32,
   *                         uint8, uint16, uint32, float32
   */
  addField (name, size, type) {
    this._fields.push([name, size, type])
    this._initField(name, size, type)
  }

  /**
   * Resize the store to the new size
   * @param  {Integer} size - new size
   */
  resize (size) {
    // Log.time( "Store.resize" );

    this.length = Math.round(size || 0)
    this.count = Math.min(this.count, this.length)

    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[ i ][ 0 ]
      const itemSize = this._fields[ i ][ 1 ]
      const arraySize = this.length * itemSize
      const tmpArray = new this[ name ].constructor(arraySize)

      if (this[ name ].length > arraySize) {
        tmpArray.set(this[ name ].subarray(0, arraySize))
      } else {
        tmpArray.set(this[ name ])
      }
      this[ name ] = tmpArray
    }

    // Log.timeEnd( "Store.resize" );
  }

  /**
   * Resize the store to 1.5 times its current size if full, or to 256 if empty
   */
  growIfFull () {
    if (this.count >= this.length) {
      const size = Math.round(this.length * 1.5)
      this.resize(Math.max(256, size))
    }
  }

  /**
   * Increase the store by 1, and resize if necessary
   */
  increment () {
    this.count += 1
    this.growIfFull()
  }

  /**
   * Copy data from one store to another
   * @param  {Store} other - store to copy from
   * @param  {Integer} thisOffset - offset to start copying to
   * @param  {Integer} otherOffset - offset to start copying from
   * @param  {Integer} length - number of entries to copy
   */
  copyFrom (other, thisOffset, otherOffset, length) {
    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[ i ][ 0 ]
      const itemSize = this._fields[ i ][ 1 ]
      const thisField = this[ name ]
      const otherField = other[ name ]

      for (let j = 0; j < length; ++j) {
        const thisIndex = itemSize * (thisOffset + j)
        const otherIndex = itemSize * (otherOffset + j)
        for (let k = 0; k < itemSize; ++k) {
          thisField[ thisIndex + k ] = otherField[ otherIndex + k ]
        }
      }
    }
  }

  /**
   * Copy data within this store
   * @param  {Integer} offsetTarget - offset to start copying to
   * @param  {Integer} offsetSource - offset to start copying from
   * @param  {Integer} length - number of entries to copy
   */
  copyWithin (offsetTarget, offsetSource, length) {
    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[ i ][ 0 ]
      const itemSize = this._fields[ i ][ 1 ]
      const thisField = this[ name ]

      for (let j = 0; j < length; ++j) {
        const targetIndex = itemSize * (offsetTarget + j)
        const sourceIndex = itemSize * (offsetSource + j)
        for (let k = 0; k < itemSize; ++k) {
          thisField[ targetIndex + k ] = thisField[ sourceIndex + k ]
        }
      }
    }
  }

  /**
   * Sort entries in the store given the compare function
   * @param  {Function} compareFunction - function to sort by (i, j) -> Integer
   *            the return value is - if item[i] is smaller than item[j]
   */
  sort (compareFunction) {
    const thisStore = this
    const tmpStore = new this.constructor(this._fields, 1)

    function swap (index1, index2) {
      if (index1 === index2) return
      tmpStore.copyFrom(thisStore, 0, index1, 1)
      thisStore.copyWithin(index1, index2, 1)
      thisStore.copyFrom(tmpStore, index2, 0, 1)
    }

    function quicksort (left, right) {
      if (left < right) {
        let pivot = Math.floor((left + right) / 2)
        let leftNew = left
        let rightNew = right
        do {
          while (compareFunction(leftNew, pivot) < 0) {
            leftNew += 1
          }
          while (compareFunction(rightNew, pivot) > 0) {
            rightNew -= 1
          }
          if (leftNew <= rightNew) {
            if (leftNew === pivot) {
              pivot = rightNew
            } else if (rightNew === pivot) {
              pivot = leftNew
            }
            swap(leftNew, rightNew)
            leftNew += 1
            rightNew -= 1
          }
        } while (leftNew <= rightNew)
        quicksort(left, rightNew)
        quicksort(leftNew, right)
      }
    }

    quicksort(0, this.count - 1)
  }

  /**
   * Empty the store, but keep the allocated memory
   */
  clear () {
    this.count = 0
  }

  /**
   * Dispose of the store entries and fields
   */
  dispose () {
    delete this.length
    delete this.count

    for (let i = 0, il = this._fields.length; i < il; ++i) {
      const name = this._fields[ i ][ 0 ]
      delete this[ name ]
    }
  }
}

export default Store
