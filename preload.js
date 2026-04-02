const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  printBarcodes: (htmlContent) =>
    ipcRenderer.send("trigger-print", htmlContent),
});
