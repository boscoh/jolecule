<template>
  <div>
    <md-layout
      md-column
      style="
        width: calc(100vw);
        height: calc(100vh - 48px);
        padding-left: 15px;
        padding-right: 15px;">

      <div style="">
        <md-whiteframe style="height: calc(100vh - 80px)">
          <div
            id="jolecule"
            style="width: calc(100vw - 350px); height: 100%">
          </div>
          <!--<div-->
            <!--id="jolecule2"-->
            <!--style="width: calc(100vw - 350px); height: 50%">-->
          <!--</div>-->
        </md-whiteframe>
      </div>

      <div style="width: 260px; margin-left: 20px;">
        <md-whiteframe style="height: calc(100vh - 80px); overflow: scroll">
          <md-layout
            md-row
            md-vertical-align="center">

            <md-progress
              md-indeterminate
              v-if="isDownloading"/>

            <md-input-container
              style="width: 100px">
              <label>
                PDB Id
              </label>
              <md-input
                v-model="pdbId">
              </md-input>
            </md-input-container>

            <div>
              <md-button
                md-flex=true
                class="md-raised"
                @click="loadFromPdbId()">
                DownLoad
              </md-button>
            </div>

          </md-layout>

          <div>
            {{error}}
          </div>

          <md-layout
            md-vertical-align="center"
            md-direction="row"
            v-for="(structureId, i) in structureIds"
            :key="i">
            {{structureId}}
            <md-button
              md-flex=true
              class="md-fab md-mini"
              @click="deleteProtein(i)">
              <md-icon>delete</md-icon>
            </md-button>
          </md-layout>

          <div style="height: 1em;"></div>

          <div>
            <div
              class="entry"
              v-for="(file, j) in drawer.directories"
              :key="j"
              @click="openDir(drawer.dirname, file)">
              > {{file}}
            </div>
          </div>

          <div>
            <div
              class="entry"
              v-for="(file, k) in drawer.files"
              :key="k"
              @click="openFile(file)">
              {{file.name}}
                - {{file.title}}
            </div>
          </div>

        </md-whiteframe>
      </div>

    </md-layout>

  </div>

</template>

<!-- Add 'scoped' attribute to limit CSS to this component only -->
<style scoped>
  .md-whiteframe {
    margin-right: 1em;
    margin-top: 1em;
    width: 100%;
    padding: 1em;
  }
  .entry {
    border-top: 1px solid #AAA;
    line-hgieht: 1em;
    cursor: pointer;
    padding: 8px 0px;
  }
</style>

<style>
  @import '../../../../dist/jolecule.css';
  @import '../../../../dist/select2.css';
</style>

<script>
import $ from 'jquery'
import {initEmbedJolecule} from '../../../../src/main'
import * as util from '../../../../src/util'
import rpc from '../modules/rpc'
import path from 'path'
import _ from 'lodash'

export default {
  name: 'experiments',
  data () {
    return {
      pdbId: '',
      error: '',
      structureIds: [],
      isDownloading: false,
      drawer: {}
    }
  },
  async mounted () {
    this.joleculeWidget = initEmbedJolecule({
      divTag: '#jolecule',
      viewId: 'view:45c4gq',
      isGrid: true,
      isEditable: true,
      isPlayable: true,
      isEternalRotate: true,
      isSequenceBar: true,
      backgroundColor: 0x000000
    })

    // this.joleculeWidget2 = initEmbedJolecule({
    //   divTag: '#jolecule2',
    //   viewId: 'view:45c4gq',
    //   isGrid: true,
    //   isEditable: true,
    //   isPlayable: true,
    //   isSequenceBar: true,
    //   backgroundColor: 0x000000
    // })

    let res = await rpc.rpcRun('publicGetInit')
    if (_.get(res, 'result.initFile')) {
      const dataServer7 = require('../../../dataservers/1mbo-data-server')
      await this.joleculeWidget.asyncAddDataServer(dataServer7)
    } else {
      // const dataServer0 = require('../../../dataservers/1a0a-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer0)
      // const dataServer1 = require('../../../dataservers/1a0a-Ar-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer1)
      // const dataServer2 = require('../../../dataservers/1a0a-Kr-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer2)
      // const dataServer3 = require('../../../dataservers/1a0a-Xe-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer3)

      const dataServer7 = require('../../../dataservers/1mbo-data-server')
      await this.joleculeWidget.asyncAddDataServer(dataServer7)

      // await this.joleculeWidget2.asyncAddDataServer(dataServer7)

      // const dataServer8 = require('../../../dataservers/1u6b-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer8)
      //
      // const dataServer9 = require('../../../dataservers/1be9-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer9)
      //
      // const dataServer10 = require('../../../dataservers/1ubq-data-server')
      // await this.joleculeWidget.asyncAddDataServer(dataServer10)
    }

    if (_.get(res, 'result.initDir')) {
      res = await rpc.rpcRun('publicGetFiles', res.result.initDir)
      if (res.result) {
        this.drawer = res.result
      }
    }

    this.structureIds = this.joleculeWidget.soupWidget.soup.structureIds
  },
  methods: {
    async deleteProtein (i) {
      this.joleculeWidget.display.deleteStructure(i)
      this.joleculeWidget.controller.zoomOut()
    },
    async toggleOption (option) {
      this.joleculeWidget.controller.toggleShowOption(option)
    },
    async loadFromDataServer (dataServer) {
      await this.joleculeWidget.asyncAddDataServer(dataServer)
      this.structureIds = this.joleculeWidget.display.soup.structureIds
      this.joleculeWidget.controller.zoomOut()
    },
    async loadFromPdbId () {
      await util.delay(100)
      this.loadFromDataServer(this.makeRcsbDataServer(this.pdbId))
    },
    makeRcsbDataServer (pdbId) {
      this.isDownloading = true
      this.error = ''
      let _this = this
      return {
        pdbId: pdbId,
        getProteinData: function (parsePdb) {
          let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
          $.get(url, (pdbText) => {
            parsePdb({pdbId: pdbId, pdbText: pdbText})
            _this.isDownloading = false
          }).fail(() => {
            _this.isDownloading = false
            _this.error = 'Error: failed to load'
          })
        },
        getViews: function (processViews) { processViews({}) },
        saveViews: function (views, success) { success() },
        deleteView: function (viewId, success) { success() }
      }
    },
    makeServerPdbDataServer (pdb) {
      this.isDownloading = true
      this.error = ''
      let _this = this
      let pdbId = path.basename(pdb)
      return {
        pdbId: pdbId,
        getProteinData: function (parsePdb) {
          rpc.rpcRun('publicGetProteinText', pdb)
            .then(res => {
              let pdbText = res.result.pdbText
              parsePdb({pdbId: pdbId, pdbText: pdbText})
              _this.isDownloading = false
            })
            .catch(() => {
              _this.isDownloading = false
              _this.error = 'Error: failed to load'
            })
        },
        getViews: function (processViews) { processViews({}) },
        saveViews: function (views, success) { success() },
        deleteView: function (viewId, success) { success() }
      }
    },
    openFile (file) {
      this.loadFromDataServer(this.makeServerPdbDataServer(file.filename))
    },
    async openDir (topDir, dir) {
      console.log('openDir', topDir, dir)
      let res = await rpc.rpcRun('publicGetFiles', path.join(topDir, dir))
      if (res.result) {
        this.drawer = res.result
      }
    }
  }
}
</script>
