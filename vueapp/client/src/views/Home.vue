<template>
    <v-container fluid style="margin: 0; padding: 0">
        <v-row no-gutters>
            <v-col lg="4" md="6" sm="6">
                <v-card class="pa-3">
                    <v-row no-gutters style="width: 8em;">
                        <v-col cols="8" align-self="center">
                            <v-text-field
                                style="width: 5em;"
                                v-model="pdbId"
                                label="PdbId"
                                v-on:keyup.enter="loadFromPdbId()"
                            ></v-text-field>
                        </v-col>

                        <v-col cols="4" align="right" align-self="center">
                            <v-btn
                                class="px-2"
                                v-bind:loading="isDownloading"
                                icon
                                small
                                @click="loadFromPdbId()"
                            >
                                <v-icon>fa-download</v-icon>
                            </v-btn>
                        </v-col>
                    </v-row>

                    <v-alert v-if="error" type="error" dismissible text>
                        {{ error }}
                    </v-alert>
                </v-card>

                <v-card
                    class="p-3"
                    style="height: calc(100vh - 48px - 94px); overflow: scroll"
                >
<!--                    <v-card>-->
<!--                        <v-card-title>-->
<!--                            Structures-->
<!--                        </v-card-title>-->
<!--                        <v-list>-->
<!--                            <v-list-item-->
<!--                                v-for="(structureId, i) in structureIds"-->
<!--                                :key="i + 's'"-->
<!--                            >-->
<!--                                <v-list-item-content>-->
<!--                                    {{ structureId }}-->
<!--                                </v-list-item-content>-->
<!--                                <v-list-item-action>-->
<!--                                    <v-btn-->
<!--                                        icon-->
<!--                                        small-->
<!--                                        class="ml-2"-->
<!--                                        @click="deleteProtein(i)"-->
<!--                                    >-->
<!--                                        <v-icon>fa-trash</v-icon>-->
<!--                                    </v-btn>-->
<!--                                </v-list-item-action>-->
<!--                            </v-list-item>-->
<!--                        </v-list>-->
<!--                    </v-card>-->

                    <v-card>
                        <v-card-title>
                            Files
                        </v-card-title>
                        <v-list>
                            <v-list-item
                                class="entry"
                                v-for="(file, j) in drawer.directories"
                                :key="j + 'f'"
                                @click="openDir(drawer.dirname, file)"
                            >
                                <v-icon class="mr-2">fa-folder</v-icon>
                                {{ file }}
                            </v-list-item>
                            <v-list-item
                                class="entry"
                                v-for="(file, k) in drawer.files"
                                :key="k + 'e'"
                                @click="openFileReplace(file)"
                            >
                                <v-list-item-content>
                                    <v-list-item-title>{{
                                        file.name
                                    }}</v-list-item-title>
                                    <v-list-item-subtitle>
                                        {{ file.title }}
                                    </v-list-item-subtitle>
                                </v-list-item-content>
                            </v-list-item>
                        </v-list>
                    </v-card>
                </v-card>
            </v-col>

            <v-col lg="8" md="6" sm="6">
                <v-row no-gutters>
                    <v-col cols="8">
                        <div id="jolecule" style="height: calc(100vh - 48px)"></div>
                    </v-col>
                    <v-col cols="4">
                        <div id="jolecule-views" style="height: calc(100vh - 48px); overflow: scroll"></div>
                    </v-col>
                </v-row>

            </v-col>

        </v-row>
    </v-container>
</template>

<style>
@import '../../../../dist/full-page-jolecule.css';
@import '../../../../dist/select2.css';
</style>

<script>
import axios from 'axios'
import $ from 'jquery'
import { initFullPageJolecule } from '../../../../src/main'
import * as rpc from '../modules/rpc'
import path from 'path'
import _ from 'lodash'

axios.defaults.withCredentials = true

function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(time)
        }, time)
    })
}

export default {
    data() {
        return {
            pdbId: '',
            error: '',
            structureIds: [],
            isDownloading: false,
            drawer: {},
        }
    },
    async mounted() {
        this.joleculeWidget = initFullPageJolecule(
            '#jolecule',
            '#jolecule-views',
            {
                divTag: '#jolecule',
                viewId: 'view:45c4gq',
                isGrid: true,
                isEditable: true,
                isPlayable: true,
                isEternalRotate: true,
                isSequenceBar: true,
                backgroundColor: 0x000000,
            }
        )

        let dataServer = require('../../../dataservers/1mbo-data-server')
        let res = await rpc.remote.publicGetInit()
        if (res.result) {
            const result = res.result
            if (result.initFile) {
                dataServer = this.makeServerPdbDataServer(result.initFile)
            }
            if (result.initDir) {
                res = await rpc.run('publicGetFiles', res.result.initDir)
                if (res.result) {
                    this.drawer = res.result
                }
            }
        }
        await this.joleculeWidget.asyncAddDataServer(dataServer)
        this.structureIds = this.joleculeWidget.soupWidget.soup.structureIds
    },
    methods: {
        openFile(file) {
            this.loadFromDataServer(this.makeServerPdbDataServer(file.filename))
        },
        openFileReplace(file) {
            this.joleculeWidget.clear()
            this.loadFromDataServer(this.makeServerPdbDataServer(file.filename))
        },
        async openDir(topDir, dir) {
            let res = await rpc.remote.publicGetFiles(path.join(topDir, dir))
            if (res.result) {
                this.drawer = res.result
            }
        },
        async deleteProtein(i) {
            this.joleculeWidget.soupWidget.deleteStructure(i)
            this.joleculeWidget.controller.zoomOut()
        },
        async toggleOption(option) {
            this.joleculeWidget.controller.toggleShowOption(option)
        },
        async loadFromDataServer(dataServer) {
            await this.joleculeWidget.asyncAddDataServer(dataServer)
            this.structureIds = this.joleculeWidget.soup.structureIds
            this.joleculeWidget.controller.zoomOut()
        },
        async loadFromPdbId() {
            await delay(100)
            this.joleculeWidget.clear()
            this.loadFromDataServer(this.makeRcsbDataServer(this.pdbId))
        },
        makeRcsbDataServer(pdbId) {
            this.isDownloading = true
            this.error = ''
            let _this = this
            return {
                pdbId: pdbId,
                async getProteinData(parsePdb) {
                    let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
                    try {
                        let response = await $.get(url)
                        parsePdb({ pdbId: pdbId, pdbText: response })
                        _this.isDownloading = false
                    } catch {
                        _this.isDownloading = false
                        _this.error = 'Error: failed to load'
                    }
                },
                getViews(processViews) {
                    processViews({})
                },
                saveViews(views, success) {
                    success()
                },
                deleteView(viewId, success) {
                    success()
                },
            }
        },
        makeServerPdbDataServer(pdb) {
            this.isDownloading = true
            this.error = ''
            let _this = this
            let pdbId = path.basename(pdb)
            return {
                pdbId: pdbId,
                async getProteinData(parsePdb) {
                    try {
                        let res = await rpc.remote.publicGetProteinText(pdb)
                        parsePdb({ pdbId: pdbId, pdbText: res.result.pdbText })
                        _this.isDownloading = false
                    } catch {
                        _this.isDownloading = false
                        _this.error = 'Error: failed to load'
                    }
                },
                async getViews(processViews) {
                    try {
                        let res = await rpc.remote.publicGetViewDicts(pdb)
                        processViews(res.result.views)
                        _this.isDownloading = false
                    } catch {
                        _this.isDownloading = false
                        _this.error = 'Error: failed to load'
                    }
                },
                async saveViews(views, success) {
                    let resp = await rpc.remote.publicSaveViewDicts(views)
                    if (_.get(resp, 'result.success')) {
                        success()
                    }
                },
                async deleteView(viewId, success) {
                    let resp = await rpc.remote.publicDeleteView(viewId)
                    if (_.get(resp, 'result.success')) {
                        success()
                    }
                },
            }
        },
    },
}
</script>
