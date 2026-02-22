const { app, BrowserWindow } = require('electron');
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Capiz Provincial Library System",
    icon: path.join(__dirname, "logo.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadURL("http://192.168.64.180:5173");

  win.setAutoHideMenuBar(true);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});