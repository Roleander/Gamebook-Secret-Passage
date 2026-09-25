const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const isDev = process.env.NODE_ENV === 'development';
const APP_URL = isDev
  ? `http://localhost:${process.env.PORT || 3000}`
  : 'https://gamebook-secret-passage.vercel.app';

let mainWindow = null;
let autoUpdater = null;

function loadApp() {
  if (!mainWindow) return;
  mainWindow.loadURL(APP_URL).catch(() => loadOffline());
}

function loadOffline() {
  if (!mainWindow) return;
  const offlinePath = path.join(__dirname, 'offline.html');
  if (fs.existsSync(offlinePath)) {
    mainWindow.loadFile(offlinePath).catch(() => {});
  }
}

function initAutoUpdater() {
  if (isDev) return;
  try {
    autoUpdater = require('electron-updater').autoUpdater;
    autoUpdater.autoDownload = true;
    autoUpdater.on('error', () => {});
    autoUpdater.checkForUpdatesAndNotify().catch(() => {});
  } catch (e) {
    autoUpdater = null;
  }
}

function createWindow() {
  const iconPath = path.join(__dirname, '..', 'public', 'icon.png');
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
            if (autoUpdater) {
              autoUpdater.checkForUpdatesAndNotify().catch(() => {});
            } else {
              dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'Actualizaciones',
                message: 'No se pudo comprobar las actualizaciones.',
                detail: 'Conéctate a internet e inténtalo de nuevo.',
                buttons: ['Aceptar'],
              });
            }
          },
        },
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, _desc, _url, isMainFrame) => {
    if (isMainFrame && errorCode !== -3) {
      loadOffline();
    }
  });

  loadApp();
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

ipcMain.on('app-retry', () => loadApp());

ipcMain.handle('check-for-updates', async () => {
  if (!autoUpdater) return { ok: false };
  try {
    await autoUpdater.checkForUpdatesAndNotify();
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
});
ipcMain.on('install-update', () => {
  try {
    autoUpdater?.quitAndInstall();
  } catch (e) {
    // ignore
  }
});

app.whenReady().then(() => {
  createWindow();
  initAutoUpdater();
});

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
