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
      return {
        pdbId: pdbId,
        version: 2,
        format: 'pdb',
        async asyncGetData() {
          let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
          try {
            let response = await fetch(url, {method: 'get', mode: 'cors'})
            return await response.text()
          } catch {
            return ''
          }
        },
        asyncGetViews: async () => [],
        asyncSaveViews: async views => null,
        asyncDeleteView: async (viewId) => null,
      }
    },
    makeServerPdbDataServer (pdb) {
      return {
        pdbId: baseName(pdb),
        version: 2,
        format: 'pdb',
        async asyncGetData() {
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
    }
  }
}
</script>
