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

      <md-layout md-flex="33">
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

      <md-layout md-flex="66">
        <md-whiteframe>
          <md-layout>
            <div
              id="charts"
              style="flex: 1; height: 200px">
            </div>
          </md-layout>
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
import _ from 'lodash'
import $ from 'jquery'
import ChartWidget from '../modules/chart-widget'
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
    this.chartWidget = new ChartWidget('#charts')

    this.joleculeWidget = initEmbedJolecule({
      divTag: '#jolecule',
      isGrid: true,
      isEditable: true,
      isPlayable: true,
      isSequenceBar: true,
      backgroundColor: 0x000000
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

    this.changeGraph()
  },
  methods: {
    async deleteProtein (i) {
      console.log('deleteProtein', i, this.joleculeWidget.display.soup.structureIds)
      this.joleculeWidget.display.deleteStructure(i)
      this.joleculeWidget.controller.zoomOut()
      this.changeGraph()
    },
    async toggleWater () {
      this.joleculeWidget.controller.toggleShowOption('water')
    },
    async loadFromPdbId () {
      await util.delay(100)
      this.error = ''
      this.isDownloading = true
      let dataServer0 = this.makeDataServer(this.pdbId)
      await this.joleculeWidget.asyncAddDataServer(dataServer0)
      this.joleculeWidget.controller.zoomOut()
      this.changeGraph()
    },
    makeDataServer (pdbId) {
      let _this = this
      return {
        pdb_id: pdbId,
        get_protein_data: function (parsePdb) {
          let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
          console.log('makeDataServer', url)
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
    },
    changeGraph () {
      let soup = this.joleculeWidget.soup
      let atom = soup.getAtomProxy()
      let n = soup.getAtomCount()
      let bfactors = []
      for (let i = 0; i < n; i += 1) {
        atom.load(i)
        if (atom.resType === 'XXX') {
          bfactors.push(-atom.bfactor)
        }
      }
      let max = _.max(bfactors)
      let min = _.min(bfactors)
      let nBox = 20
      let d = (max - min) / nBox
      let bins = []
      let xvals = []
      for (let i = 0; i < nBox; i += 1) {
        bins[i] = 0
        xvals[i] = i * d + min
        // console.log(i, xvals[i])
      }
      for (let b of bfactors) {
        let i = parseInt((b - min) / d)
        bins[i] += 1
      }
      this.chartWidget.setTitle('')
      this.chartWidget.setXLabel('energy')
      this.chartWidget.setYLabel('count')
      this.chartWidget.addDataset('sample')
      this.chartWidget.updateDataset(0, _.range(1, n + 1), bfactors)
      this.chartWidget.updateDataset(0, xvals, bins)

      this.structureIds = _.clone(soup.structureIds)
    },
    randomizeGraph () {
      for (let slider of this.sliders) {
        slider.value = Math.random() * slider.max
      }
      this.changeGraph()
    }
  }
}
</script>
