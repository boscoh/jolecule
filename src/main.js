import { EmbedJolecule, defaultArgs } from './embed-widget.js'
import { FullPageWidget } from './full-page-widget.js'
import { AquariaAlignment } from './aquaria.js'
import widgets from './widgets'
import _ from 'lodash'

/**
 *
 * @param args = {
 *   divTag: '',
 *   viewHeight: 170,
 *   isViewTextShown: false,
 *   isEditable: true,
 *   animateState: 'none',
 *   onload: onload,
 *   isGrid: false
 * }
 * @returns {EmbedJolecule}
 */
function initEmbedJolecule (args) {
    return new EmbedJolecule(_.merge(defaultArgs, args))
}

/**
 * @param proteinDisplayTag
 * @param viewsDisplayTag
 * @param params
 */
function initFullPageJolecule (...args) {
    return new FullPageWidget(...args)
}

let defaultDataServerArgs = {
    pdbId: '',
    userId: '',
    isDisableSaveViews: true,
    saveViewsUrl: '',
    isLoadViews: false,
    biounit: 0,
    viewId: '',
}

/**
 * @param args = {
 *   pdbId: '', // Str - id of RCSB protein structure
 *   userId: '', // Str - id of user on http://jolecule.com; default: ''
 *   isDisableSaveViews: false, // Bool - prevents save/delete to server
 *   saveViewsUrl: '', // Str - base URL of views server (e.g. "http://jolecule.com")
 *   isLoadViews: 'none', // bool - if false: creates dummy view get methods
 *   biounit: 0, // int - biounit
 *   viewId: '', // Str - id of user on http://jolecule.com; default: ''
 *   format: 'pdb' // 'pdb' or 'pdb1' or 'cif'
 * }
 * @returns dataServer obj
 */
function makePdbDataServer (args) {
    args = _.merge(_.cloneDeep(defaultDataServerArgs), _.cloneDeep(args))
    console.log('makePdbDataServer', args)
    const format = _.get(args, 'format', 'pdb')
    return {
        pdbId: args.pdbId,
        version: 2,
        format,
        async asyncGetData () {
            let url
            if (args.pdbId.length === 4) {
                if (!args.biounit) {
                    // 0, null or undefined
                    if (format === 'cif') {
                        url = `https://files.rcsb.org/download/${
                            args.pdbId
                        }.cif`
                    } else if (format === 'pdb') {
                        url = `https://files.rcsb.org/download/${
                            args.pdbId
                        }.pdb`
                    }
                } else {
                    url = `https://files.rcsb.org/download/${args.pdbId}.pdb${
                        args.biounit
                    }`
                }
            } else {
                url = `${args.saveViewsUrl}/pdb/${args.pdbId}.txt`
            }
            console.log('makePdbDataServer.fetch', url)
            try {
                let response = await fetch(url, { method: 'get', mode: 'cors' })
                return await response.text()
            } catch (e) {
                return ''
            }
        },
        async asyncGetViews () {
            if (!args.isLoadViews) {
                return []
            }
            let url = `${args.saveViewsUrl}/pdb/${args.pdbId}.views.json`
            if (args.userId) {
                url += `?user_id=${args.userId}`
            }
            try {
                let response = await fetch(url, { method: 'get', mode: 'cors' })
                return await response.json()
            } catch (e) {
                return []
            }
        },
        async asyncSaveViews (views) {
            if (args.isDisableSaveViews) {
                return
            }
            try {
                let response = await fetch(`${args.saveViewsUrl}/save/views`, {
                    method: 'post',
                    mode: 'cors',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(views),
                })
                return response.status
            } catch (e) {
                return 400
            }
        },
        async asyncDeleteView (viewId) {
            if (args.isDisableSaveViews) {
                return
            }
            try {
                let response = await fetch(`${args.saveViewsUrl}/delete/view`, {
                    method: 'post',
                    mode: 'cors',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ pdbId: args.pdbId, viewId }),
                })
                return response.status
            } catch (e) {
                return 400
            }
        },
    }
}

/**
 * @param pdbId: Str - id of RCSB protein structure
 * @param userId: Str - optional user id from http://jolecule.com; default: ''
 * @param isDisableSaveViews: Bool - prevents save/delete to server
 * @param saveViewsUrl: Str - base URL of views server (e.g. "http://jolecule.com")
 * @param isLoadViews: bool - if false: creates dummy view get methods
 * @param biounit: int - indicates biological assembly in PDB
 * @param viewId: Str - id of view
 * @param format: Str - 'pdb' or 'cif'
 * @returns DataServer object
 */
function makeDataServer (
    pdbId,
    userId = null,
    isDisableSaveViews = false,
    saveViewsUrl = '',
    isLoadViews = true,
    biounit = 0,
    viewId = '',
    format = 'pdb'
) {
    return makePdbDataServer({
        pdbId,
        userId,
        isDisableSaveViews,
        saveViewsUrl,
        isLoadViews,
        biounit,
        viewId,
        format,
    })
}

export {
    initEmbedJolecule,
    initFullPageJolecule,
    makePdbDataServer,
    makeDataServer,
    AquariaAlignment,
    widgets
}
