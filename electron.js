const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  // Create the browser window.
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "THE TERMINAL",
    icon: path.join(__dirname, 'public/favicon.ico'), // Optional: Add an icon later
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true, // Hides the File/Edit menu for that cleaner look
  });

  // Load the app
  const isDev = !app.isPackaged;
  
  if (isDev) {
    // In Dev: Load from the local Vite server
    win.loadURL('http://localhost:5173');
    // win.webContents.openDevTools(); // Uncomment to see console logs in the exe
  } else {
    // In Prod: Load the built HTML file
    win.loadFile(path.join(__dirname, 'dist/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});