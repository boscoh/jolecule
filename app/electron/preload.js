const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electron', {
  rpc: async payload => await ipcRenderer.invoke('rpc', payload)
})
