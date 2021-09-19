<template lang="pug">
.d-flex.flex-row(style="height: calc(100vh);")
  #file-column.p-2.d-flex.flex-column
    .header PDB
    .d-flex.flex-row.flex-wrap.align-items-center
      .input-group.input-group-sm(style='width: 90px')
        input.form-control.m-0.view-text(
          type='text'
          v-model='pdbId'
          @focus="lockKeyboard()"
          @blur="unlockKeyboard()"
          v-on:keyup.enter="loadFromPdbId()"
        )
      .jolecule-small-button.m-0(@click='loadFromPdbId()')
        | fetch
    .mt-2.d-flex.flex-row.flex-wrap.align-items-center(style="font-size: 12px")
      .form-check
        input.form-check-input(type="radio" v-model="format" v-bind:value="'pdb'")
        label.form-check-label pdb
      .ms-2.form-check
        input.form-check-input(type="radio" v-model="format" v-bind:value="'cif'")
        label.form-check-label cif
    span(v-if="error") {{ error }}
    .header Files
    .template(v-if="lastPdbFile")
      .mt-2.d-flex.flex-row.flex-wrap.align-items-center(style="font-size: 12px")
        .jolecule-small-button.m-0.text-start(@click='makeWebApp') Build {{ lastPdbFile.name }}-webapp
    .overflow-auto.pe-3.mt-2
      .view-card.view-text.pointer(v-for='(file, j) in drawer.directories' :key="j + 'f'" @click='openDir(drawer.dirname, file)')
        i.fa.fa-folder
        =" "
        | {{ file }}
      .d-flex.flex-row.flex-nowrap(v-for='(file, k) in drawer.files' :key="k + 'e'" )
        .view-card.view-text.pointer(@click='openFileReplace(file)')
          span(style='text-transform: uppercase') {{ file.name }}
          span.file-title {{ " - " + file.title }}
  #jolecule-container
  #view-column.p-2.d-flex.flex-column
    .header Views
    div
      .d-inline.jolecule-small-button(@click='createView') save
    .mt-2.overflow-scroll.pe-3
      .view-card(
        :class="{'active-border': view.isSelect}"
        v-for='(view, i) in views'
        :key='i'
      )
        template(v-if="view.isEdit")
          textarea.view-text.p-2.w-100(
            v-model="view.editText"
            rows="6"
            @focus="lockKeyboard()"
            @blur="unlockKeyboard()"
          )
          .mt-2.d-flex.flex-row
            .jolecule-small-button(@click='saveEditText(view.id)') save
            .jolecule-small-button(@click='editOffView(view.id)') discard
        template(v-else)
          .view-text.pointer(@click='setTargetByViewId(view.id)')
            span {{ view.head }}{{ " " }}
            span(v-html='view.text')
          span.jolecule-author {{view.creator}}
          .mt-2.d-flex.flex-row.justify-content-between(v-if="i > 0")
            .d-flex.flex-row
              .jolecule-small-button( @click='editView(view.id)') edit
              .jolecule-small-button(v-if="i > 1" @click='swapUp(view.id)') &uarr;
              .jolecule-small-button(v-if="i < views.length - 1" @click='swapDown(view.id)') &darr;
            .jolecule-small-button(@click='deleteView(view.id)') x
</template>

<style>
body {
  overflow: hidden;
  background-color: #ccc;
}
.header {
  padding-top: 12px;
  text-align: left;
  font-family: Helvetica, sans-serif;
  font-size: 14px;
  letter-spacing: 0.12em;
  color: #999;
  text-transform: uppercase;
}
.active-border {
  border: 1px solid red !important;
}
#jolecule-container {
  min-height: 0;
  min-width: 0;
  flex: 1;
  margin: 0;
  padding: 0;
}
.view-card {
  padding: 7px;
  box-sizing: border-box;
  margin-bottom: 3px;
  border-radius: 3px;
  border: 1px solid #bbb;
  background-color: #bbb;
  overflow: hidden;
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
#file-column {
  width: 250px;
  border-right: 1px solid #AAA;
}
#view-column {
  border-left: 2px solid #aaa;
  width: 300px;
}
@media (max-width: 778px) {
  .file-title {
    display: none
  }
  #file-column {
    width: 120px;
  }
  #view-column {
    display: none !important;
  }
}
@media (max-width: 992px) {
  .file-title {
    display: none
  }
  #file-column {
    width: 120px;
  }
  #view-column {
    width: 200px;
  }
}

</style>

<script>
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap'
import _ from 'lodash'
import { initEmbedJolecule, makePdbDataServer, AquariaAlignment } from '../../../../src/main'
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
  name: 'Jolecule',
  data () {
    return {
      pdbId: '',
      error: '',
      isDownloading: false,
      drawer: {},
      views: [],
      format: 'pdb'
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
      isPlayable: true,
      isLegend: true,
      isToolbarOnTop: true,
      lastPdbFile: {},
    })
    // triggers this.update when a state changes in the widget
    this.jolecule.soupWidget.addObserver(this)
    this.controller = this.jolecule.soupWidget.controller
    this.soupView = this.jolecule.soupView

    let dataServer = defaultDataServer
    let res = await rpc.remote.getInit()
    if (res.result) {
      const result = res.result
      if (result.initDir) {
        res = await rpc.remote.getFiles(res.result.initDir)
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
      let res = await rpc.remote.getFiles(`${topDir}/${dir}`)
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
      document.title = `Jolecule - ${dataServer.pdbId}`
      await this.jolecule.asyncAddDataServer(dataServer)
      let res = await rpc.remote.getAlignment(dataServer.pdbId)
      if (res.result) {
        this.alignment = new AquariaAlignment()
        this.alignment.reload(res.result, this.jolecule)
        this.alignment.selectNewChain = function (seqId, pdbId, chain) {
          console.log('alignment.selectNewChain', seqId, pdbId, chain)
        }
      }
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
          isLoadViews: false,
          format: this.format
        })
      )
    },
    makeLocalPdbDataServer (pdb) {
      this.lastPdbFile = {
        filename: pdb,
        name: _.last(pdb.split('/'))
      }
      return {
        pdbId: baseName(pdb),
        version: 2,
        format: pdb.endsWith('cif') ? 'cif' : 'pdb',
        async asyncGetData () {
          let res = await rpc.remote.getProteinText(pdb)
          return res.result ? res.result.pdbText : ''
        },
        async asyncGetViews () {
          let res = await rpc.remote.getViewDicts(pdb)
          return res.result ? res.result.views : ''
        },
        async asyncSaveViews (views) {
          await rpc.remote.saveViewDicts(pdb, views)
        },
        async asyncDeleteView (viewId) {
          await rpc.remote.deleteView(pdb, viewId)
        }
      }
    },
    async makeWebApp() {
      await rpc.remote.makeWebApp([this.lastPdbFile.filename])
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
      window.keyboardLock = true
    },
    editOffView (viewId) {
      let view = _.find(this.views, { id: viewId })
      view.isEdit = false
      window.keyboardLock = false
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
    lockKeyboard() {
      window.keyboardLock = true
    },
    unlockKeyboard() {
      window.keyboardLock = false
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
