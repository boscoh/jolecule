<template lang="pug">
.d-flex.flex-row(style="height: calc(100vh);")
  .overflow-auto(style="width: 250px; border-right: 1px solid #999;")
    .header Download PDB
    .ms-3
      input.view-text(type='text' v-model='pdbId' style='width: 90px')
      .d-inline.ps-2.jolecule-small-button(
        @click='loadFromPdbId()'
        style='width: 2em'
      ) FETCH
      br(clear='all')
      span {{ error }}
    .header
      | Local files
    .view-card.view-text.pointer(v-for='(file, j) in drawer.directories' :key="j + 'f'" @click='openDir(drawer.dirname, file)')
      i.fa.fa-folder
      | {{ file }}
    .view-card.view-text.pointer(v-for='(file, k) in drawer.files' :key="k + 'e'" @click='openFileReplace(file)')
      | [
      span(style='text-transform: uppercase') {{ file.name }}
      | ]
      | {{ file.title }}
  #jolecule-container
  .d-flex.flex-column(style="border-left: 2px solid #aaa;")
    .header
      | Views
      .mt-2
        .d-inline.jolecule-small-button(@click='createView') Save
    .ps-2.pe-2.overflow-scroll(style="width: 300px;")
      .view-card(
        :class="{'active-border': view.isSelect}"
        v-for='(view, i) in views' :key='i'
      )
        template(v-if="view.isEdit")
          textarea.view-text.view-textarea(v-model="view.editText" rows="6")
          .mt-2.d-flex.flex-row
            .jolecule-small-button(@click='saveEditText(view.id)') save
            .jolecule-small-button.ms-2(@click='editOffView(view.id)') discard
        template(v-else)
          .view-text.pointer(@click='setTargetByViewId(view.id)')
            span {{ view.head }}{{ " " }}
            span(v-html='view.text')
          span.jolecule-author {{view.creator}}
          .mt-2.d-flex.flex-row.justify-content-between
            .d-flex.flex-row
              .jolecule-small-button(@click='editView(view.id)') edit
              .jolecule-small-button.ms-2(@click='swapUp(view.id)') &uarr;
              .jolecule-small-button.ms-2(@click='swapDown(view.id)') &darr;
            .jolecule-small-button.ms-2(@click='deleteView(view.id)') x
</template>

<style>
body {
  overflow: hidden;
  background-color: #ccc;
}
.header {
  padding-top: 12px;
  padding-left: 20px;
  padding-bottom: 12px;
  text-align: left;
  font-size: 14px;
  letter-spacing: 0.2em;
  color: #999;
  font-family: Helvetica, sans-serif;
  text-transform: uppercase;
}
.active-border {
  border: 1px solid red !important;
}
#jolecule-container {
  min-height: 0;
  min-width: 0;
  flex: 1;
  display: flex;
  margin: 0;
  padding: 0;
}
.view-card {
  padding: 7px;
  box-sizing: border-box;
  margin: 0px 20px 5px 5px;
  border-radius: 3px;
  border: 1px solid #bbb;
  background-color: #bbb;
}
.pointer {
  cursor: pointer
}
.view-text {
  font-size: 12px;
  font-family: Helvetica, sans-serif;
  letter-spacing: 0.1em;
  line-height: 1.5em;
  background-color: #bbb;
  color: #333;
}
.view-textarea {
  width: 100%;
  padding: 5px;
}
</style>

<script>
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import _ from 'lodash'
import { initEmbedJolecule, makePdbDataServer } from '../../../../src/main'
import * as rpc from '../modules/rpc'
import defaultDataServer from '../modules/1mbo-data-server.es6.js'

function delay (time) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(time)
    }, time)
  })
}

function baseName (str) {
  var base = new String(str).substring(str.lastIndexOf('/') + 1)
  if (base.lastIndexOf('.') !== -1)
    base = base.substring(0, base.lastIndexOf('.'))
  return base
}

export default {
  name: 'Home',
  data () {
    return {
      pdbId: '',
      error: '',
      isDownloading: false,
      drawer: {},
      views: []
    }
  },
  async mounted () {
    document.oncontextmenu = _.noop
    document.onkeydown = e => {
      this.onkeydown(e)
    }

    this.jolecule = initEmbedJolecule({
      divTag: '#jolecule-container',
      backgroundColor: 0x000000,
      viewId: '',
      viewHeight: 170,
      isViewTextShown: false,
      isSequenceBar: true,
      isEditable: true,
      isGrid: true,
      bCutoff: 0.5,
      isPlayable: true
    })
    // triggers this.update when a state changes in the widget
    this.jolecule.soupWidget.addObserver(this)
    this.controller = this.jolecule.soupWidget.controller
    this.soupView = this.jolecule.soupView

    let dataServer = defaultDataServer
    let res = await rpc.remote.publicGetInit()
    if (res.result) {
      const result = res.result
      if (result.initDir) {
        res = await rpc.remote.publicGetFiles(res.result.initDir)
        if (res.result) {
          this.drawer = res.result
        }
      }
      if (result.initFile) {
        dataServer = this.makeLocalPdbDataServer(
          `${result.initDir}/${result.initFile}`
        )
      }
    }

    await this.loadFromDataServer(dataServer)
  },
  methods: {
    openFileReplace (file) {
      this.jolecule.clear()
      this.loadFromDataServer(this.makeLocalPdbDataServer(file.filename))
    },
    async openDir (topDir, dir) {
      let res = await rpc.remote.publicGetFiles(`${topDir}/${dir}`)
      if (res.result) {
        this.drawer = res.result
      }
    },
    async deleteProtein (i) {
      this.jolecule.soupWidget.deleteStructure(i)
      this.controller.zoomOut()
    },
    async loadFromDataServer (dataServer) {
      this.dataServer = dataServer
      await this.jolecule.asyncAddDataServer(dataServer)
      this.update()
      this.controller.zoomOut()
    },
    async loadFromPdbId () {
      await delay(100)
      this.jolecule.clear()
      this.loadFromDataServer(
        makePdbDataServer({
          pdbId: this.pdbId,
          isDisableSaveViews: true,
          isLoadViews: false
        })
      )
    },
    makeLocalPdbDataServer (pdb) {
      return {
        pdbId: baseName(pdb),
        version: 2,
        format: pdb.endsWith('cif') ? 'cif' : 'pdb',
        async asyncGetData () {
          let res = await rpc.remote.publicGetProteinText(pdb)
          return res.result ? res.result.pdbText : ''
        },
        async asyncGetViews () {
          let res = await rpc.remote.publicGetViewDicts(pdb)
          return res.result ? res.result.views : ''
        },
        async asyncSaveViews (views) {
          await rpc.remote.publicSaveViewDicts(pdb, views)
        },
        async asyncDeleteView (viewId) {
          await rpc.remote.publicDeleteView(pdb, viewId)
        }
      }
    },
    // Called when Jolecule is updated
    update () {
      let soupViews = this.soupView.savedViews
      let iLast = this.soupView.iLastViewSelected
      let n = soupViews.length
      this.views.length = 0
      let selectViewId = null
      for (let i = 0; i < n; i += 1) {
        let soupView = soupViews[i]
        let isSelect = iLast === i
        if (isSelect) {
          selectViewId = soupView.id
        }
        this.views.push({
          isSelect,
          isEdit: false,
          id: soupView.id,
          head: `${soupView.order + 1}/${n}`,
          text: soupView.text,
          creator: soupView.creator
        })
      }
      console.log('Jolecule.update', iLast, selectViewId)
    },
    async createView () {
      this.controller.saveCurrentView()
      await this.saveViews()
      this.update()
    },
    async editView (viewId) {
      let view = _.find(this.views, { id: viewId })
      view.editText = view.text
      view.isEdit = true
    },
    editOffView (viewId) {
      let view = _.find(this.views, { id: viewId })
      view.isEdit = false
    },
    async saveEditText (viewId) {
      let view = _.find(this.views, { id: viewId })
      let soupView = this.soupView.savedViewsByViewId[viewId]
      soupView.text = view.editText
      await this.saveViews()
      this.update()
    },
    async saveViews () {
      let views = this.controller.getViewDicts()
      if (this.dataServer.version === 2) {
        await this.dataServer.asyncSaveViews(views)
      } else {
        return new Promise(resolve => {
          this.dataServer.saveViews(views, resolve)
        })
      }
    },
    async swapViews (i, j) {
      this.controller.swapViews(i, j)
      await this.saveViews()
      this.update()
    },
    async swapDown (viewId) {
      let i = this.soupView.getIViewFromViewId(viewId)
      if (i <= this.soupView.savedViews.length - 2) {
        this.swapViews(i, i + 1)
        this.setTargetByViewId (viewId)
      }
    },
    async swapUp (viewId) {
      let i = this.soupView.getIViewFromViewId(viewId)
      if (i >= 2) {
        this.swapViews(i - 1, i)
        this.setTargetByViewId (viewId)
      }
    },
    setTargetByViewId (viewId) {
      console.log('Jolecule.setTargetByViewId', viewId)
      this.controller.setTargetViewByViewId(viewId)
      this.update()
    },
    gotoPrevView () {
      this.controller.setTargetToPrevView()
      this.update()
    },
    gotoNextView () {
      this.controller.setTargetToNextView()
      this.update()
    },
    async deleteView (viewId) {
      if (this.dataServer.version === 2) {
        await this.dataServer.asyncDeleteView(viewId)
      } else {
        await new Promise(resolve => this.dataServer.deleteView(viewId, resolve))
      }
      this.controller.deleteView(viewId)
      this.update()
    },
    getViewId(i) {
      return this.soupView.savedViews[i].id
    },
    onkeydown (event) {
      if (!window.keyboardLock) {
        let c = String.fromCharCode(event.keyCode).toUpperCase()
        if (c === 'V') {
          this.createView()
        } else if (c === 'K' || event.keyCode === 37) {
          this.controller.setTargetToPrevResidue()
        } else if (c === 'J' || event.keyCode === 39) {
          this.controller.setTargetToNextResidue()
        } else if (event.keyCode === 38) {
          this.gotoPrevView()
        } else if (c === ' ' || event.keyCode === 40) {
          this.gotoNextView()
        } else if (c === 'S') {
          this.controller.toggleShowOption('sphere')
        } else if (c === 'B') {
          this.controller.toggleShowOption('backbone')
        } else if (c === 'R') {
          this.controller.toggleShowOption('ribbon')
        } else if (c === 'L') {
          this.controller.toggleShowOption('ligands')
        } else if (c === 'W') {
          this.controller.toggleShowOption('water')
        } else if (c === 'T') {
          this.controller.toggleShowOption('transparent')
        } else if (c === 'E') {
          let iView = this.soupView.iLastViewSelected
          if (iView > 0) {
            this.editView(this.getViewId(iView))
          }
        } else if (c === 'N') {
          this.controller.toggleResidueNeighbors()
        } else if (c === 'C') {
          this.controller.toggleSelectedSidechains()
        } else if (c === 'X') {
          let iAtom = this.soupView.getICenteredAtom()
          if (iAtom >= 0) {
            let atom = this.soupView.soup.getAtomProxy(iAtom)
            this.controller.selectResidue(atom.iRes)
          }
        } else if (c === 'A') {
          if (event.metaKey) {
            this.controller.selectAllSidechains(true)
            event.preventDefault()
          } else {
            this.soupWidget.atomLabelDialog()
          }
        } else if (event.keyCode === 27) {
          this.controller.clear()
        } else if (c === 'Z' || event.keyCode === 13) {
          this.controller.zoomToSelection()
        } else {
          let i = parseInt(c) - 1
          if ((i || i === 0) && i < this.soupView.savedViews.length) {
            this.setTargetByViewId(this.getViewId(i))
          }
        }
      }
    }
  }
}
</script>
