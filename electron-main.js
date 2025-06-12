const { app, BrowserWindow } = require('electron');
const path = require('path');
const url = require('url');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

let mainWindow;
let nextServerProcess;

const isDev = !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload: path.join(__dirname, 'preload.js') // If needed
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load Next.js app after server is started
    const targetUrl = 'http://localhost:3000';
    waitOn({ resources: [targetUrl], timeout: 30000 }, (err) => { // Added timeout
      if (err) {
        console.error('Failed to start Next.js server or server not reachable:', err);
        // Load a local error page if the server fails to start
        mainWindow.loadFile(path.join(__dirname, 'public', 'error.html'));
        return;
      }
      mainWindow.loadURL(targetUrl);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startNextServer() {
  const serverWorkingDirectory = app.getAppPath();
  console.log(`Starting Next.js server in: ${serverWorkingDirectory}`);

  // In packaged app, npm might not be directly available or in PATH the same way.
  // Using node to directly run Next.js CLI is more robust.
  // This requires `next` to be a dependency.
  // The path to next's CLI script: path.join(serverWorkingDirectory, 'node_modules', 'next', 'dist', 'bin', 'next-start.js')
  // However, `npm start` should work if node_modules are packaged correctly.

  const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  nextServerProcess = spawn(command, ['start'], { // `npm start` will execute `next start` as per package.json
    cwd: serverWorkingDirectory,
    stdio: ['ignore', 'pipe', 'pipe'], // stdin, stdout, stderr
    // shell: process.platform === 'win32', // Already handled by using npm.cmd for windows
  });

  nextServerProcess.stdout.on('data', (data) => {
    console.log(`Next.js Server STDOUT: ${data.toString().trim()}`);
  });
  nextServerProcess.stderr.on('data', (data) => {
    console.error(`Next.js Server STDERR: ${data.toString().trim()}`);
    // Optionally, if server logs specific error messages, Electron could react here.
  });
  nextServerProcess.on('exit', (code) => {
    console.log(`Next.js server exited with code ${code}`);
    nextServerProcess = null;
    // If the server exits unexpectedly, we might want to show an error or try to restart.
    if (code !== 0 && mainWindow && !mainWindow.isDestroyed()) {
        // Ensure error page is loaded relative to __dirname, which is app.asar root in prod
        mainWindow.loadFile(path.join(__dirname, 'public', 'error.html')).catch(err => {
            console.error("Failed to load error page:", err);
        });
    }
  });
   nextServerProcess.on('error', (err) => {
    console.error(`Failed to start Next.js server process: ${err}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadFile(path.join(__dirname, 'public', 'error.html')).catch(loadErr => {
            console.error("Failed to load error page after spawn error:", loadErr);
        });
    }
  });
}

app.whenReady().then(() => {
  if (!isDev) {
    startNextServer(); // Start the Next.js server in production
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure Next.js server is terminated when Electron quits.
app.on('quit', () => {
  if (nextServerProcess) {
    console.log('Attempting to kill Next.js server process.');
    const killed = nextServerProcess.kill(); // SIGTERM
    if (killed) {
      console.log('Next.js server process killed.');
    } else {
      console.log('Failed to kill Next.js server process (it may have already exited).');
      // Forcibly kill if it didn't respond to SIGTERM, especially on Windows
      if (process.platform === 'win32' && nextServerProcess && !nextServerProcess.killed) {
          process.kill(nextServerProcess.pid, 'SIGKILL');
      } else if (nextServerProcess && !nextServerProcess.killed){
          nextServerProcess.kill('SIGKILL');
      }
    }
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
