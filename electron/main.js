import { app, BrowserWindow, ipcMain, Menu, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import electronUpdater from 'electron-updater';
const { autoUpdater } = electronUpdater;

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

// Import handlers - these will need to be converted too
import { setupAccountHandlers } from './handlers/accounts.js';
import { setupTransactionHandlers } from './handlers/transactions.js';
import { setupAnalyticsHandlers } from './handlers/analytics.js';
import { setupUploadHandlers } from './handlers/uploads.js';
import { setupAuthHandlers } from './handlers/auth.js';
import { setupAssistantHandlers } from './handlers/assistant.js';

// Import services
import DatabaseService from './services/database-sqlite3.js';
import EncryptionService from './services/encryption.js';

let mainWindow = null;
let db = null;
let databaseService = null;
let encryptionService = null;

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // Someone tried to run a second instance, focus our window instead
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Create the application menu
function createMenu() {
  const template = [
    {
      label: 'WhereMyMoneyGoes',
      submenu: [
        { label: 'About WhereMyMoneyGoes', role: 'about' },
        { type: 'separator' },
        { label: 'Preferences...', accelerator: 'Cmd+,', click: () => {
          mainWindow.webContents.send('navigate', '/settings');
        }},
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Cmd+Q', click: () => app.quit() }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Undo', accelerator: 'Cmd+Z', role: 'undo' },
        { label: 'Redo', accelerator: 'Shift+Cmd+Z', role: 'redo' },
        { type: 'separator' },
        { label: 'Cut', accelerator: 'Cmd+X', role: 'cut' },
        { label: 'Copy', accelerator: 'Cmd+C', role: 'copy' },
        { label: 'Paste', accelerator: 'Cmd+V', role: 'paste' },
        { label: 'Select All', accelerator: 'Cmd+A', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Reload', accelerator: 'Cmd+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'Cmd+Shift+R', role: 'forceReload' },
        { label: 'Toggle Developer Tools', accelerator: 'Alt+Cmd+I', role: 'toggleDevTools' },
        { type: 'separator' },
        { label: 'Actual Size', accelerator: 'Cmd+0', role: 'resetZoom' },
        { label: 'Zoom In', accelerator: 'Cmd+Plus', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Cmd+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Toggle Fullscreen', accelerator: 'Ctrl+Cmd+F', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { label: 'Minimize', accelerator: 'Cmd+M', role: 'minimize' },
        { label: 'Close', accelerator: 'Cmd+W', role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://wheremymoneygoes.com/docs');
          }
        },
        {
          label: 'Report Issue',
          click: async () => {
            const { shell } = await import('electron');
            await shell.openExternal('https://github.com/wheremymoneygoes/issues');
          }
        }
      ]
    }
  ];

  // Windows and Linux specific menu adjustments
  if (process.platform !== 'darwin') {
    // Remove the first menu item (app menu) on Windows/Linux
    template.shift();
    
    // Add File menu with Quit option
    template.unshift({
      label: 'File',
      submenu: [
        { label: 'Settings', accelerator: 'Ctrl+,', click: () => {
          mainWindow.webContents.send('navigate', '/settings');
        }},
        { type: 'separator' },
        { label: 'Quit', accelerator: 'Ctrl+Q', click: () => app.quit() }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create the main application window
async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: 'WhereMyMoneyGoes',
    icon: path.join(__dirname, '../assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: !isDev
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    show: false // Don't show until ready
  });

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Load the Vue app
  if (isDev || !app.isPackaged) {
    // In development, load from Vite dev server
    // Try multiple ports as Vite may use different ones
    const tryPorts = [5173];
    let loaded = false;
    
    for (const port of tryPorts) {
      try {
        await mainWindow.loadURL(`http://localhost:${port}`);
        console.log(`Loaded dev server from port ${port}`);
        loaded = true;
        break;
      } catch (error) {
        console.log(`Port ${port} not available, trying next...`);
      }
    }
    
    if (!loaded) {
      console.error('Could not connect to Vite dev server');
      dialog.showErrorBox('Development Server Error', 'Could not connect to Vite dev server. Please make sure it is running.');
    }
  } else {
    // In production, load the built app
    mainWindow.loadFile(path.join(__dirname, '../dist/electron/index.html'));
  }

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle navigation for external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Open external links in default browser
    if (url.startsWith('http://') || url.startsWith('https://')) {
      import('electron').then(({ shell }) => {
        shell.openExternal(url);
      });
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Prevent navigation away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith('http://localhost')) {
      event.preventDefault();
    }
  });
}

// Initialize the database
async function initializeDatabase() {
  try {
    // Get user data directory
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'wheremymoneygoes.db');
    
    console.log('Initializing database at:', dbPath);
    
    // Initialize services
    encryptionService = new EncryptionService();
    await encryptionService.initialize();
    
    // Create database service and initialize
    databaseService = new DatabaseService(dbPath, encryptionService);
    await databaseService.initialize();
    
    // Run migrations
    const migrationRunner = await import('./migrations/runner-sqlite3.js');
    await databaseService.runMigrations(migrationRunner.default);
    
    console.log('Database initialized successfully');
    
    return { databaseService, encryptionService };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    dialog.showErrorBox('Database Error', 
      'Failed to initialize the database. The application will now quit.\n\n' + error.message);
    app.quit();
    throw error;
  }
}

// Setup IPC handlers
function setupIPCHandlers() {
  // Setup all module handlers
  setupAccountHandlers(ipcMain, databaseService);
  setupTransactionHandlers(ipcMain, databaseService);
  setupAnalyticsHandlers(ipcMain, databaseService);
  setupUploadHandlers(ipcMain, databaseService);
  setupAuthHandlers(ipcMain, databaseService);
  setupAssistantHandlers(ipcMain, databaseService);
  
  // Dialog handlers
  ipcMain.handle('dialog:selectFile', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'CSV Files', extensions: ['csv'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });
  
  // App info handler
  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });
  
  // Window control handlers
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });
  
  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  
  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });
}

// Setup auto-updater
function setupAutoUpdater() {
  if (isDev) {
    console.log('Skipping auto-updater in development mode');
    return;
  }
  
  autoUpdater.checkForUpdatesAndNotify();
  
  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: 'A new version of WhereMyMoneyGoes is available. It will be downloaded in the background.',
      buttons: ['OK']
    });
  });
  
  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'The update has been downloaded. Would you like to restart the application to apply the update?',
      buttons: ['Restart Now', 'Later']
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    });
  });
  
  autoUpdater.on('error', (error) => {
    console.error('Auto-updater error:', error);
  });
}

// App event handlers
app.whenReady().then(async () => {
  try {
    // Initialize database first
    await initializeDatabase();
    
    // Create the menu
    createMenu();
    
    // Create the main window
    await createWindow();
    
    // Setup IPC handlers
    setupIPCHandlers();
    
    // Setup auto-updater
    setupAutoUpdater();
    
  } catch (error) {
    console.error('Failed to initialize app:', error);
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    // Close database connection
    if (databaseService) {
      await databaseService.close();
    }
    app.quit();
  }
});

app.on('activate', async () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    await createWindow();
  }
});

// Handle app quit
app.on('before-quit', async () => {
  // Close database connection
  if (databaseService) {
    await databaseService.close();
  }
});

// Export for testing
export { mainWindow, databaseService };