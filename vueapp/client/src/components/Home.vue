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
                Load
              </md-button>
            </div>
            <md-spinner
              :md-size="25"
              md-indeterminate
              v-if="isLoading"/>
            {{pdbText}}
          </md-layout>
        </md-whiteframe>
      </md-layout>

      <md-layout md-flex="66">
        <md-whiteframe>
          <h3 class="md-title">Live graphs</h3>

          <div
            v-for="(param, i) of sliders"
            :key="i"
            style="height: 2em">
            <md-layout
              md-row
              md-vertical-align="center">
              {{param.key}} = {{param.value.toFixed(1)}}
              <div style="flex: 1">
                <vue-slider
                  ref="slider"
                  tooltip="none"
                  :interval="param.interval"
                  @callback="changeGraph()"
                  :max="param.max"
                  v-model="param.value"/>
              </div>
            </md-layout>
          </div>

          <div style="margin-top: 1em">
            <md-button
              class="md-raised"
              @click="randomizeGraph()">
              random
            </md-button>
          </div>

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

import rpc from '../modules/rpc'
import vueSlider from 'vue-slider-component'
import config from '../config'
import ChartWidget from '../modules/chart-widget'
import Model from '../modules/model'
import {initEmbedJolecule} from '../../../../src/main'

export default {
  name: 'experiments',
  components: {vueSlider},
  data () {
    return {
      text: '',
      pdbId: '',
      error: '',
      pointerX: 0,
      pointerY: 0,
      uploadFiles: [],
      sliders: [
        {
          key: 'alpha',
          value: 1,
          max: 10,
          interval: 0.1
        },
        {
          key: 'beta',
          value: 1,
          max: 7,
          interval: 0.1
        },
        {
          key: 'gamma',
          value: 0.5,
          max: 10,
          interval: 0.1
        }
      ],
      pdbText: '',
      isLoading: false
    }
  },
  async mounted () {
    let params = {}
    for (let slider of this.sliders) {
      params[slider.key] = slider.value
    }

    this.model = new Model(params)
    this.model.initializeVars = () => { this.model.vars.y = 0 }
    this.model.update = function (i) {
      this.vars.y =
        this.params.alpha * Math.sin(this.params.beta * i + this.params.gamma)
    }

    this.chartWidget = new ChartWidget('#charts')
    this.randomizeGraph()

    this.joleculeWidget = initEmbedJolecule({
      divTag: '#jolecule',
      isGrid: true,
      isEditable: true,
      backgroundColor: 0xCCCCCC
    })

    const dataServer0 = require('../../../dataservers/1mbo-data-server')
    await this.joleculeWidget.asyncAddDataServer(dataServer0)

    // const dataServer0 = require('../../../dataservers/1a0a-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer0)
    // const dataServer1 = require('../../../dataservers/1a0a-Ar-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer1)
    // const dataServer2 = require('../../../dataservers/1a0a-Kr-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer2)
    // const dataServer3 = require('../../../dataservers/1a0a-Xe-data-server')
    // await this.joleculeWidget.asyncAddDataServer(dataServer3)

    // this.pdbId = '1ssx'
    // this.loadFromPdbId()
  },
  methods: {
    async loadFromPdbId () {
      let dataServer0 = this.makeDataServer(this.pdbId)
      this.isLoading = true
      await this.joleculeWidget.asyncAddDataServer(dataServer0)
    },
    makeDataServer (pdbId) {
      let _this = this
      return {
        pdb_id: pdbId,
        get_protein_data: function (parsePdb) {
          let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
          console.log('remoteDataServer.get_protein_data', url)
          $.get(url, (pdbText) => {
            parsePdb({pdb_id: pdbId, pdb_text: pdbText})
            _this.isLoading = false
          }).fail(() => {
            _this.isLoading = false
            _this.pdbText = 'Error: failed to load'
          })
        },
        get_views: function (processViews) { processViews({}) },
        save_views: function (views, success) { success() },
        delete_protein_view: function (viewId, success) { success() }
      }
    },
    selectFiles (filelist) {
      this.filelist = filelist
    },
    async upload () {
      this.uploadFiles = []
      if (this.filelist) {
        this.error = ''
        let response = await rpc.rpcUpload('publicUploadFiles', this.filelist)
        if (response.result) {
          this.uploadFiles = _.map(response.result.files, f => config.apiUrl + f)
        } else {
          this.error = response.error.message
        }
      } else {
        this.error = 'No files selected'
      }
    },
    changeGraph () {
      for (let slider of this.sliders) {
        this.model.params[slider.key] = slider.value
      }
      let nStep = 100
      let xValues = _.range(0, nStep)
      this.model.resetSoln()
      this.model.integrate(nStep)
      let yValues = this.model.soln.y
      this.chartWidget.setTitle('title')
      this.chartWidget.setXLabel('xLabel')
      this.chartWidget.setYLabel('yLabel')
      this.chartWidget.addDataset('sample')
      this.chartWidget.updateDataset(0, xValues, yValues)
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
