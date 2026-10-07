const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const os = require("os");
const fs = require("fs");
const http = require("http");

const isDev = !app.isPackaged;

function getBaseIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        const parts = iface.address.split(".");
        parts.pop();
        return parts.join(".");
      }
    }
  }
  return null;
}

// Helper function to cleanly ping one IP at a time
function pingIp(ip) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://${ip}/api/ping`, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (data.includes("CapizLibraryServer")) resolve(ip);
        else reject();
      });
    });
    req.on("error", reject);
    req.setTimeout(2000, () => {
      req.abort();
      reject();
    });
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Capiz Provincial Library System",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.setAutoHideMenuBar(true);

  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url); 
    return { action: "deny" }; 
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
  } else {
    const indexPath = path.join(__dirname, "client/dist/index.html");

    const loadApp = (foundIp) => {
      win
        .loadFile(indexPath)
        .then(() => {
          win.webContents.executeJavaScript(`
          if (localStorage.getItem('API_URL') !== 'http://${foundIp}') {
            localStorage.setItem('API_URL', 'http://${foundIp}');
            window.location.reload(); 
          }
        `);
        })
        .catch((err) => console.error(err));
    };

    const showError = () => {
      dialog.showErrorBox(
        "Connection Error",
        "Could not find the Library Server. Is Laragon running on the main laptop?",
      );
      app.quit();
    };

    // STEP 1: ONLY check Localhost first. If it works, load instantly and skip the rest!
    pingIp("127.0.0.1")
      .then(loadApp)
      .catch(() => {
        // Try the Laragon specific hostname
        pingIp("LAPTOP-SG3OKTO8.local")
          .then(loadApp)
          .catch(() => {
            // STEP 2: Only if the main server isn't local, scan the Wi-Fi (for staff laptops)
            const baseIp = getBaseIp();
            if (!baseIp) return showError();

            let found = false;
            let checksCompleted = 0;

            for (let i = 1; i < 255; i++) {
              if (found) break;
              pingIp(`${baseIp}.${i}`)
                .then((ip) => {
                  if (!found) {
                    found = true;
                    loadApp(ip);
                  }
                })
                .catch(() => {
                  checksCompleted++;
                  if (checksCompleted >= 254 && !found) showError();
                });
            }

            setTimeout(() => {
              if (!found) showError();
            }, 10000);
          });
      });
  }
}

ipcMain.on("trigger-print", async (event, htmlContent) => {
  // 1. Create a hidden worker window to render the HTML
  let workerWindow = new BrowserWindow({ show: false });
  workerWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`,
  );

  workerWindow.webContents.on("did-finish-load", async () => {
    try {
      const pdfData = await workerWindow.webContents.printToPDF({
        printBackground: true,
        marginType: 0, 
      });

      const tempPath = path.join(
        os.tmpdir(),
        `barcode-preview-${Date.now()}.pdf`,
      );
      fs.writeFileSync(tempPath, pdfData);

      let previewWindow = new BrowserWindow({
        width: 1000,
        height: 800,
        title: "Print Preview",
        autoHideMenuBar: true,
        webPreferences: {
          plugins: true,
        },
      });

      previewWindow.loadFile(tempPath);

      workerWindow.close();
    } catch (error) {
      console.error("Failed to generate PDF preview:", error);
      workerWindow.close();
    }
  });
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
