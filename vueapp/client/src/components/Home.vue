<template>
  <div
    style="
      height: calc(100vh - 48px);
      overflow: auto">

    <md-layout
      style="
        width: calc(100vw);
        padding-left: 15px;
        padding-right: 15px;">

      <md-layout
        md-flex="100" >
        <md-whiteframe>
          <div
            id="jolecule"
            style="height: 500px">
          </div>
        </md-whiteframe>
      </md-layout>

      <md-layout md-flex="100">
        <md-whiteframe>
          <md-layout
            md-row
            md-vertical-align="center">
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
            <md-spinner
              :md-size="25"
              md-indeterminate
              v-if="isDownloading"/>
          </md-layout>
          <div>
            {{error}}
          </div>
          <div>
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
          </div>
        </md-whiteframe>
      </md-layout>

    </md-layout>

    <div style="height: 2em"></div>

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
</style>

<style>
  @import '../../../../dist/jolecule.css';
  @import '../../../../dist/select2.css';
</style>

<script>
import $ from 'jquery'
import {initEmbedJolecule} from '../../../../src/main'
import * as util from '../../../../src/util'

export default {
  name: 'experiments',
  data () {
    return {
      pdbId: '',
      error: '',
      structureIds: [],
      isDownloading: false
    }
  },
  async mounted () {
    this.joleculeWidget = initEmbedJolecule({
      divTag: '#jolecule',
      isGrid: true,
      isEditable: true,
      isPlayable: true,
      isSequenceBar: true,
      backgroundColor: 0xCCCCCC
    })

    const dataServer7 = require('../../../dataservers/1mbo-data-server')
    await this.joleculeWidget.asyncAddDataServer(dataServer7)

    // const dataServer8 = require('../../../dataservers/1u6b-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer8)

    // const dataServer0 = require('../../../dataservers/1be9-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer0)

    // const dataServer2 = require('../../../dataservers/1ubq-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer2)

    // const dataServer0 = require('../../../dataservers/1a0a-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer0)
    // const dataServer1 = require('../../../dataservers/1a0a-Ar-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer1)
    // const dataServer2 = require('../../../dataservers/1a0a-Kr-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer2)
    // const dataServer3 = require('../../../dataservers/1a0a-Xe-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer3)

    this.structureIds = this.joleculeWidget.display.soup.structureIds
  },
  methods: {
    async deleteProtein (i) {
      this.joleculeWidget.display.deleteStructure(i)
      this.joleculeWidget.controller.zoomOut()
    },
    async toggleOption (option) {
      this.joleculeWidget.controller.toggleShowOption(option)
    },
    async loadFromPdbId () {
      await util.delay(100)
      let dataServer = this.makeDataServer(this.pdbId)
      await this.joleculeWidget.asyncAddDataServer(dataServer)
      this.structureIds = this.joleculeWidget.display.soup.structureIds
      this.joleculeWidget.controller.zoomOut()
    },
    makeDataServer (pdbId) {
      this.isDownloading = true
      this.error = ''
      let _this = this
      return {
        pdb_id: pdbId,
        get_protein_data: function (parsePdb) {
          let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
          $.get(url, (pdbText) => {
            parsePdb({pdb_id: pdbId, pdb_text: pdbText})
            _this.isDownloading = false
          }).fail(() => {
            _this.isDownloading = false
            _this.error = 'Error: failed to load'
          })
        },
        get_views: function (processViews) { processViews({}) },
        save_views: function (views, success) { success() },
        delete_protein_view: function (viewId, success) { success() }
      }
    }
  }
}
</script>
