/**
 */

import _ from 'lodash'

class Model {
  constructor (params) {
    this.params = _.assign({}, params)
    this.vars = {}
    this.soln = {}
    this.lastVars = {}
    this.initializeVars()
  }

  /**
   * To be overriden
   */
  initializeVars () {
    // set vars[key] values
  }

  /**
   * To be overriden
   */
  update (iStep) {
    // update this.vars[key], access this.lastVars[key]
  }

  resetSoln () {
    for (let solnValues of _.values(this.soln)) {
      solnValues.length = 0
    }
  }

  integrate (nStep) {
    for (let iStep = 0; iStep < nStep; iStep += 1) {
      for (let key of _.keys(this.vars)) {
        if (key in this.soln) {
          this.lastVars[key] = _.last(this.soln[key])
        } else if (key in this.vars) {
          this.lastVars[key] = this.vars[key]
        } else {
          this.lastVars[key] = 0
        }
      }
      this.update(iStep)
      for (let key of _.keys(this.vars)) {
        if (!(key in this.soln)) {
          this.soln[key] = []
        }
        this.soln[key].push(this.vars[key])
      }
    }
  }
}

export default Model
