<template>
    <v-container fluid>
        <v-row>
            <v-col lg="8" md="6" sm="6">
                <div id="jolecule" style="height: calc(100vh - 110px)"></div>
            </v-col>

            <v-col lg="4" md="6" sm="6">
                <v-row class="p3" style="width: 8em;">
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

                <v-card
                    class="p-3"
                    style="height: calc(100vh - 200px); overflow: scroll"
                >
                    <v-card>
                        <v-card-title>
                            Structures
                        </v-card-title>
                        <v-list>
                            <v-list-item
                                v-for="(structureId, i) in structureIds"
                                :key="i"
                            >
                                <v-list-item-content>
                                    {{ structureId }}
                                </v-list-item-content>
                                <v-list-item-action>
                                    <v-btn
                                        icon
                                        small
                                        class="ml-2"
                                        @click="deleteProtein(i)"
                                    >
                                        <v-icon>fa-trash</v-icon>
                                    </v-btn>
                                </v-list-item-action>
                            </v-list-item>
                        </v-list>
                    </v-card>

                    <v-card>
                        <v-card-title>
                            Files
                        </v-card-title>
                        <v-list>
                            <v-list-item
                                class="entry"
                                v-for="(file, j) in drawer.directories"
                                :key="j"
                                @click="openDir(drawer.dirname, file)"
                            >
                                <v-icon class="mr-2">fa-folder</v-icon>
                                {{ file }}
                            </v-list-item>
                            <v-list-item
                                class="entry"
                                v-for="(file, k) in drawer.files"
                                :key="k"
                                @click="openFile(file)"
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
        </v-row>
    </v-container>
</template>

<style>
@import '../../../../dist/jolecule.css';
@import '../../../../dist/select2.css';
</style>

<script>
import $ from 'jquery'
import { initEmbedJolecule } from '../../../../src/main'
import rpc from '../modules/rpc'
import path from 'path'

function delay(time) {
    return new Promise(function(resolve) {
        setTimeout(function() {
            resolve(time)
        }, time)
    })
}

export default {
    name: 'experiments',
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
        this.joleculeWidget = initEmbedJolecule({
            divTag: '#jolecule',
            viewId: 'view:45c4gq',
            isGrid: true,
            isEditable: true,
            isPlayable: true,
            isEternalRotate: true,
            isSequenceBar: true,
            backgroundColor: 0x000000,
        })

        let res = await rpc.rpcRun('publicGetInit')
        let dataServer7 = require('../../../dataservers/1mbo-data-server')
        if (res.result) {
            const result = res.result
            if (result.initFile) {
                dataServer7 = this.makeServerPdbDataServer(result.initFile)
            }
            if (result.initDir) {
                res = await rpc.rpcRun('publicGetFiles', res.result.initDir)
                if (res.result) {
                    this.drawer = res.result
                }
            }
        }
        await this.joleculeWidget.asyncAddDataServer(dataServer7)

        this.structureIds = this.joleculeWidget.soupWidget.soup.structureIds
    },
    methods: {
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
            this.loadFromDataServer(this.makeRcsbDataServer(this.pdbId))
        },
        makeRcsbDataServer(pdbId) {
            this.isDownloading = true
            this.error = ''
            let _this = this
            return {
                pdbId: pdbId,
                getProteinData: function(parsePdb) {
                    let url = `https://files.rcsb.org/download/${pdbId}.pdb1`
                    $.get(url, pdbText => {
                        parsePdb({ pdbId: pdbId, pdbText: pdbText })
                        _this.isDownloading = false
                    }).fail(() => {
                        _this.isDownloading = false
                        _this.error = 'Error: failed to load'
                    })
                },
                getViews: function(processViews) {
                    processViews({})
                },
                saveViews: function(views, success) {
                    success()
                },
                deleteView: function(viewId, success) {
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
                getProteinData: function(parsePdb) {
                    rpc.rpcRun('publicGetProteinText', pdb)
                        .then(res => {
                            let pdbText = res.result.pdbText
                            parsePdb({ pdbId: pdbId, pdbText: pdbText })
                            _this.isDownloading = false
                        })
                        .catch(() => {
                            _this.isDownloading = false
                            _this.error = 'Error: failed to load'
                        })
                },
                getViews: function(processViews) {
                    processViews({})
                },
                saveViews: function(views, success) {
                    success()
                },
                deleteView: function(viewId, success) {
                    success()
                },
            }
        },
        openFile(file) {
            this.loadFromDataServer(this.makeServerPdbDataServer(file.filename))
        },
        async openDir(topDir, dir) {
            console.log('openDir', topDir, dir)
            let res = await rpc.rpcRun('publicGetFiles', path.join(topDir, dir))
            if (res.result) {
                this.drawer = res.result
            }
        },
    },
}
</script>
