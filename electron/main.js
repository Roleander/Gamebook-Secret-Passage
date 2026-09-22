const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const isDev = process.env.NODE_ENV === 'development';
const PORT = isDev ? (process.env.PORT || 3000) : 3847;

let mainWindow;
let serverProcess;

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
  const fs = require('fs');
  const iconExists = fs.existsSync(iconPath);

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: 'Secret Passage - Editor de Librojuegos',
    icon: iconExists ? iconPath : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false,
  });

  const template = [
    {
      label: 'Archivo',
      submenu: [
        { role: 'quit', label: 'Salir' },
      ],
    },
    {
      label: 'Editar',
      submenu: [
        { role: 'undo', label: 'Deshacer' },
        { role: 'redo', label: 'Rehacer' },
        { type: 'separator' },
        { role: 'cut', label: 'Cortar' },
        { role: 'copy', label: 'Copiar' },
        { role: 'paste', label: 'Pegar' },
        { role: 'selectAll', label: 'Seleccionar todo' },
      ],
    },
    {
      label: 'Ver',
      submenu: [
        { role: 'reload', label: 'Recargar' },
        { role: 'forceReload', label: 'Recargar forzado' },
        { role: 'toggleDevTools', label: 'Herramientas de desarrollador' },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Restablecer zoom' },
        { role: 'zoomIn', label: 'Acercar' },
        { role: 'zoomOut', label: 'Alejar' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Pantalla completa' },
      ],
    },
    {
      label: 'Ventana',
      submenu: [
        { role: 'minimize', label: 'Minimizar' },
        { role: 'maximize', label: 'Maximizar' },
        { role: 'close', label: 'Cerrar' },
      ],
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Buscar actualizaciones',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send('check-for-updates');
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  const startUrl = `http://localhost:${PORT}`;

  // Wait for server to be ready before loading
  const loadApp = () => {
    mainWindow.loadURL(startUrl);
  };

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Auto-updater (only in production)
  if (!isDev) {
    try {
      const { autoUpdater } = require('electron-updater');
      autoUpdater.checkForUpdatesAndNotify().catch(() => {});
    } catch (e) {
      // Auto-updater not available
    }
  }

  return loadApp;
}

// IPC handlers
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-platform', () => process.platform);
ipcMain.on('window-minimize', () => mainWindow?.minimize());
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});
ipcMain.on('window-close', () => mainWindow?.close());

app.whenReady().then(() => {
  if (!isDev) {
    // Start Next.js server in production
    const serverPath = path.join(__dirname, 'server.js');
    serverProcess = spawn(process.execPath, [serverPath], {
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT) },
    });
    serverProcess.stdout?.on('data', (data) => console.log(`[server] ${data}`));
    serverProcess.stderr?.on('data', (data) => console.error(`[server] ${data}`));

    // Wait for server to be ready
    const checkServer = () => {
      const http = require('http');
      const req = http.get(`http://localhost:${PORT}`, (res) => {
        res.resume();
        createWindow();
      });
      req.on('error', () => setTimeout(checkServer, 500));
      req.end();
    };
    setTimeout(checkServer, 1000);
  } else {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
