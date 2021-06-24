<template>
  <div
    style="
        display: flex;
        align-items: stretch;
        height: calc(100vh);
        flex-direction: row;"
  >
    <div
      style="
          width: 250px;
          font-family: Helvetica, Arial, sans-serif;
          border-right: 1px solid #999;
          overflow: scroll"
    >
      <div class="jolecule-sub-header">
        Download PDB
      </div>

      <div style="padding-left: 20px">
        <input
          type="text"
          v-model="pdbId"
          style="width: 90px"
          class="jolecule-view-text"
        />
        <div
          class="jolecule-small-button"
          @click="loadFromPdbId()"
          style="display: inline; padding-left: 1em; width: 2em"
        >
          FETCH
        </div>
        <br clear="all" />
        <span>{{ error }}</span>
      </div>

      <div class="jolecule-sub-header">
        Local files
      </div>

      <div
        class="file-entry"
        v-for="(file, j) in drawer.directories"
        :key="j + 'f'"
        @click="openDir(drawer.dirname, file)"
      >
        <i class="fa fa-folder"></i>
        {{ file }}
      </div>

      <div
        class="file-entry"
        v-for="(file, k) in drawer.files"
        :key="k + 'e'"
        @click="openFileReplace(file)"
      >
        [<span style="text-transform: uppercase">{{ file.name }}</span
        >]
        {{ file.title }}
      </div>
    </div>

    <div id="jolecule-protein-container"></div>

    <div id="jolecule-views-container"></div>
  </div>
</template>

<style>
@import '../../../../dist/full-page-jolecule.css';
@import '../../../../dist/select2.css';
.file-entry {
  cursor: pointer;
  font-size: 12px;
  letter-spacing: 0.1em;
  line-height: 1.5em;
  padding: 7px;
  -moz-border-radius: 3px;
  border-radius: 3px;
  background-color: #bbb;
  color: #333;
  margin: 0px 20px 5px 15px;
}
</style>

<script>
import { initFullPageJolecule } from '../../../../src/main'
import * as rpc from '../modules/rpc'
import _ from 'lodash'
import defaultDataServer from '../modules/1mbo-data-server.es6.js'

function delay (time) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      resolve(time)
    }, time)
  })
}

function baseName(str)
{
  var base = new String(str).substring(str.lastIndexOf('/') + 1);
  if(base.lastIndexOf(".") != -1)
    base = base.substring(0, base.lastIndexOf("."));
  return base;
}

export default {
  name: 'Home',
  data () {
    return {
      pdbId: '',
      error: '',
      isDownloading: false,
      drawer: {}
    }
  },
  async mounted () {
    this.joleculeWidget = initFullPageJolecule(
      '#jolecule-protein-container',
      '#jolecule-views-container',
      {
        isEditable: true,
        isPlayable: true,
        isSequenceBar: true,
        backgroundColor: 0x000000
      }
    )

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
        dataServer = this.makeServerPdbDataServer(`${result.initDir}/${result.initFile}`)
      }
    }
    await this.joleculeWidget.asyncAddDataServer(dataServer)
  },
  methods: {
    openFile (file) {
      this.loadFromDataServer(this.makeServerPdbDataServer(file.filename))
    },
    openFileReplace (file) {
      this.joleculeWidget.clear()
      this.loadFromDataServer(this.makeServerPdbDataServer(file.filename))
    },
    async openDir (topDir, dir) {
      let res = await rpc.remote.publicGetFiles(`${topDir}/${dir}`)
      if (res.result) {
        this.drawer = res.result
      }
    },
    async deleteProtein (i) {
      this.joleculeWidget.soupWidget.deleteStructure(i)
      this.joleculeWidget.controller.zoomOut()
    },
    async toggleOption (option) {
      this.joleculeWidget.controller.toggleShowOption(option)
    },
    async loadFromDataServer (dataServer) {
      await this.joleculeWidget.asyncAddDataServer(dataServer)
      this.joleculeWidget.controller.zoomOut()
    },
    async loadFromPdbId () {
      await delay(100)
      this.joleculeWidget.clear()
      this.loadFromDataServer(this.makeRcsbDataServer(this.pdbId))
    },
    makeRcsbDataServer (pdbId) {
      this.isDownloading = true
      this.error = ''
      let _this = this
      return {
        pdbId: pdbId,
        async getProteinData (parsePdb) {
          let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
          try {
            let response = await fetch(url, {
              method: 'get',
              mode: 'cors',
              cache: 'no-cache',
            })
            let text = await response.text()
            parsePdb({ pdbId: pdbId, pdbText: text })
            _this.isDownloading = false
          } catch {
            _this.isDownloading = false
            _this.error = 'Error: failed to load'
          }
        },
        getViews (processViews) {
          processViews({})
        },
        saveViews (views, success) {
          success()
        },
        deleteView (viewId, success) {
          success()
        }
      }
    },
    makeServerPdbDataServer (pdb) {
      console.log('makeServerPdbDataServer', pdb)
      this.isDownloading = true
      this.error = ''
      let _this = this
      let pdbId = baseName(pdb)
      return {
        pdbId: pdbId,
        async getProteinData (parsePdb) {
          try {
            let res = await rpc.remote.publicGetProteinText(pdb)
            parsePdb({ pdbId: pdbId, pdbText: res.result.pdbText })
            _this.isDownloading = false
          } catch {
            _this.isDownloading = false
            _this.error = 'Error: failed to load'
          }
        },
        async getViews (processViews) {
          try {
            let res = await rpc.remote.publicGetViewDicts(pdb)
            processViews(res.result.views)
            _this.isDownloading = false
          } catch {
            _this.isDownloading = false
            _this.error = 'Error: failed to load'
          }
        },
        async saveViews (views, success) {
          let resp = await rpc.remote.publicSaveViewDicts(pdb, views)
          console.log('saveViews', resp)
          if (_.get(resp, 'result.success')) {
            success()
          }
        },
        async deleteView (viewId, success) {
          let resp = await rpc.remote.publicDeleteView(pdb, viewId)
          if (_.get(resp, 'result.success')) {
            success()
          }
        }
      }
    }
  }
}
</script>
