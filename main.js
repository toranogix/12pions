
// Fichier principal de l'application Electron
// Ce fichier est chargé de créer la fenêtre principale de l'application et de gérer les événements de la barre de titre
// Import des modules nécessaires

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 900,
        icon: path.join(__dirname, "public/images/logo_app.png"), // Icône de l'application 
        frame: false, // Supprimer la barre de titre
        resizable: false,
        webPreferences: {
            nodeIntegration: true,
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            devTools: true,
            enableRemoteModule: false,
        },
    });

    mainWindow.loadFile('index.html');

    // Envoyer l'icône de la fenêtre à la fenêtre principale
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.send('set-title-icon', path.join(__dirname, "../public/images", "logo_app.png"));
    });

}

app.on('ready', createWindow); // Lancer l'application

// Fermer l'application
app.on('window-all-closed', () => {   
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Relancer l'application
app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// Gestion des commandes de la barre de titre via IPC : réduire, agrandir et fermer la fenêtre
ipcMain.on('window-minimize', () => {
    mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('window-close', () => {
    mainWindow.close();
});
