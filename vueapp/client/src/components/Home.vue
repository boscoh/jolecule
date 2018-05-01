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
          <div
            style="
              border: 1px solid #EEE;
              width: 100%;
              height: 100px"
            id="webgl">
          </div>
        </md-whiteframe>
      </md-layout>

      <md-layout md-flex="33">
        <md-whiteframe
          style="width: 500px">
          <h3 class="md-title">
            Canvas 2d Graphics
          f</h3>
          <div
            id="rect"
            style="width: 200px; height: 200px">
          </div>
          {{ pointerX }} - {{ pointerY }}
        </md-whiteframe>
      </md-layout>

      <md-layout md-flex="33">
        <md-whiteframe
          style="width: 500px">
          <h3 class="md-title">File Download</h3>
          <div>
            <md-button
              md-flex=true
              class="md-raised"
              @click="getReadme()">
              Download Readme.md
            </md-button>
          </div>
        </md-whiteframe>
      </md-layout>

      <md-layout md-flex="33">
        <md-whiteframe
          style="overflow: auto">
          <h3 class="md-title">File Upload</h3>

          <div>
            <md-layout
              md-row
              md-vertical-align="center">
              <md-input-container style="">
                <md-file
                  id="file-input"
                  multiple
                  @selected="selectFiles">
                </md-file>
                <label
                  for="file-input"
                  class="button">
                  Upload files
                </label>
              </md-input-container>

              <div>
                <md-button
                  md-flex=true
                  class="md-raised"
                  @click="upload()">
                  Upload
                </md-button>
              </div>
            </md-layout>
          </div>

          <ul v-if="uploadFiles">
            <li v-for="(file, i) in uploadFiles" :key="i">
              <a :href="file">{{file}}</a>
            </li>
          </ul>

          <div v-if="error" style="color: red">
            {{ error }}
          </div>

        </md-whiteframe>
      </md-layout>

      <md-layout md-flex="33">
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
  @import '../assets/jolecule.css';
</style>

<script>
import _ from 'lodash'

import rpc from '../modules/rpc'
import vueSlider from 'vue-slider-component'
import config from '../config'
import ChartWidget from '../modules/chart-widget'
import CanvasWidget from '../modules/canvas-widget'
import Model from '../modules/model'
import webglstarterkit from '../modules/webgl-widget'
import * as THREE from 'three'
import {initEmbedJolecule} from '../../../../src/main'

function getRandomColor () {
  let letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)]
  }
  return color
}

export default {
  name: 'experiments',
  components: {vueSlider},
  data () {
    return {
      text: '',
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
      ]
    }
  },
  async mounted () {
    let params = {}
    for (let slider of this.sliders) {
      params[slider.key] = slider.value
    }

    this.model = new Model(params)
    this.model.initializeVars = function () {
      this.vars.y = 0
    }
    this.model.update = function (iStep) {
      this.vars.y =
        this.params.alpha *
        Math.sin(this.params.beta * iStep + this.params.gamma)
    }

    this.chartWidget = new ChartWidget('#charts')
    this.chartWidget.setTitle('title')
    this.chartWidget.setXLabel('xLabel')
    this.chartWidget.setYLabel('yLabel')
    this.chartWidget.addDataset('sample')
    this.randomizeGraph()

    this.canvasWidget = new CanvasWidget('#rect')
    this.canvasWidget.drawWidth = this.canvasWidget.width()
    this.canvasWidget.drawHeight = this.canvasWidget.height()
    this.canvasWidget.mousemove = e => {
      this.canvasWidget.getPointer(event)
      this.canvasWidget.drawWidth = this.canvasWidget.pointerX
      this.canvasWidget.drawHeight = this.canvasWidget.pointerY
      this.pointerX = this.canvasWidget.pointerX.toFixed(0)
      this.pointerY = this.canvasWidget.pointerY.toFixed(0)
      this.drawCanvas()
    }
    this.drawCanvas()

    this.webglWidget = new webglstarterkit.WebglWidget('#webgl', '#FFFFFF')
    let geometry = new THREE.BoxGeometry(50, 32, 32)
    let material = new THREE.MeshPhongMaterial({
      color: 0x156289,
      emissive: 0x072534,
      side: THREE.DoubleSide,
      flatShading: true
    })
    this.webglWidget.scene.add(new THREE.Mesh(geometry, material))
    this.webglWidget.moveCameraToShowAll()
    this.webglWidget.update = () => {
      this.webglWidget.rotateCameraAroundScene(0.005, 0.01, 0)
    }
    this.webglWidget.draw()

    this.joleculeWidget = initEmbedJolecule({
      divTag: '#jolecule',
      isGrid: true,
      isEditable: true,
      backgroundColor: 0xCCCCCC})
    const dataServer0 = require('../data/data-server0.js')
    await this.joleculeWidget.asyncAddDataServer(dataServer0)

    let response = await rpc.rpcRun('publicGetText')
    if (response.result) {
      this.text = response.result.text
    } else {
      this.error = response.error.message
    }
  },
  methods: {
    async getReadme () {
      let response = await rpc.rpcDownload('publicDownloadGetReadme')
      if (response.error) {
        this.error = response.error.message
      }
    },
    drawCanvas () {
      for (let i = 0; i < 10; i += 1) {
        let x1 = Math.random() * this.canvasWidget.drawWidth
        let y1 = Math.random() * this.canvasWidget.drawHeight
        let x2 = Math.random() * (this.canvasWidget.drawWidth - x1)
        let y2 = Math.random() * (this.canvasWidget.drawHeight - y1)
        this.canvasWidget.fillRect(x1, y1, (x2 - x1), (y2 - y1), getRandomColor())
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
