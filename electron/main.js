// electron/main.js
const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fixPath = require('fix-path');
const fs = require('fs');

fixPath();

let mainWindow;
let backendProcess = null;
const FASTAPI_PORT = 8008;
const FASTAPI_HOST = '127.0.0.1';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // preload: path.join(__dirname, 'preload.js'),
    },
  });

  let actualFrontendIndexPath;
  if (app.isPackaged) {
    // 打包后的路径: 指向 resources/app/frontend_dist/index.html
    // (基于 extraResources to: "app/frontend_dist")
    const resourcesPath = process.resourcesPath;
    actualFrontendIndexPath = path.join(resourcesPath, 'frontend_dist', 'index.html');
  } else {
    // 开发时的路径
    actualFrontendIndexPath = path.join(__dirname, '..', 'frontend', 'deepread-ui', 'dist', 'index.html');
  }
  console.log(`[Main.js] Attempting to load frontend from: ${actualFrontendIndexPath}`);

  mainWindow.loadFile(actualFrontendIndexPath)
    .then(() => {
      console.log('[Main.js] Frontend loaded successfully.');
    })
    .catch(err => {
      console.error('[Main.js] Failed to load frontend HTML:', err);
      dialog.showErrorBox('Load Error', `Failed to load frontend: ${err.message}\nPath: ${actualFrontendIndexPath}`);
      app.quit();
    });

  // mainWindow.webContents.openDevTools(); // 需要时取消注释

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function startBackend() {
  return new Promise((resolve, reject) => {
    const platform = process.platform;
    let actualBackendExecutablePath;
    let actualBackendWorkingDir;

    if (app.isPackaged) {
      const resourcesPath = process.resourcesPath;
      const packagedBackendBaseDir = path.join(resourcesPath, 'backend_exe');

      if (platform === 'win32') {
        actualBackendExecutablePath = path.join(packagedBackendBaseDir, 'deepread_ai_server.exe');
      } else {
        actualBackendExecutablePath = path.join(packagedBackendBaseDir, 'deepread_ai_server'); // macOS/Linux 无 .exe 后缀
      }
      actualBackendWorkingDir = packagedBackendBaseDir; // 设置工作目录为可执行文件所在的目录
    } else {
      // 开发时的路径 (保持不变)
      const devBackendDistDir = path.join(__dirname, '..', 'backend', 'dist');
      if (platform === 'win32') {
        actualBackendExecutablePath = path.join(devBackendDistDir, 'deepread_ai_server.exe');
      } else {
        actualBackendExecutablePath = path.join(devBackendDistDir, 'deepread_ai_server');
      }
      actualBackendWorkingDir = devBackendDistDir;
    }

    console.log(`[Main.js] Attempting to start backend from: ${actualBackendExecutablePath}`);
    console.log(`[Main.js] Backend working directory: ${actualBackendWorkingDir}`);

    if (!fs.existsSync(actualBackendExecutablePath)) {
        const errMessage = `[Main.js] Backend executable not found at: ${actualBackendExecutablePath}.`;
        console.error(errMessage);
        return reject(new Error(errMessage));
    }

    backendProcess = spawn(actualBackendExecutablePath, [], { cwd: actualBackendWorkingDir });

    let backendStarted = false;
    let accumulatedStdout = '';
    let accumulatedStderr = '';
    const startupSuccessMessage = `Uvicorn running on http://${FASTAPI_HOST}:${FASTAPI_PORT}`;
    const timeoutDuration = 15000;
    let startupTimeout;

    function cleanupAndFinish(action, value) {
        if (startupTimeout) {
            clearTimeout(startupTimeout);
        }
        if (backendProcess && !backendProcess.killed) { // 检查进程是否还存在且未被杀死
            // 只有在 Promise 还没完成时才移除监听器，避免重复操作或操作已关闭的流
            if (!backendStarted || (action === 'reject' && value instanceof Error && value.message.includes('Timeout'))) {
                backendProcess.stdout.removeAllListeners('data');
                backendProcess.stderr.removeAllListeners('data');
                // backendProcess.removeListener('close', onClose); // 命名事件处理函数
                // backendProcess.removeListener('error', onError);   // 命名事件处理函数
            }
        }
        if (action === 'resolve') {
            if (!resolve.__calledOnce) { resolve(value); resolve.__calledOnce = true; if(reject.__calledOnce) console.warn("[Main.js] Resolve called after reject");}
        } else {
            if (!reject.__calledOnce) { reject(value); reject.__calledOnce = true; if(resolve.__calledOnce) console.warn("[Main.js] Reject called after resolve");}
        }
    }
    // 给 resolve 和 reject 添加一个标记，防止重复调用
    resolve.__calledOnce = false;
    reject.__calledOnce = false;


    startupTimeout = setTimeout(() => {
        if (!backendStarted) {
            const errMessage = `[Main.js] Timeout waiting for backend to start. Port ${FASTAPI_PORT} might be in use or backend failed silently.\nAccumulated STDOUT:\n${accumulatedStdout}\nAccumulated STDERR:\n${accumulatedStderr}`;
            console.error(errMessage);
            dialog.showErrorBox('Backend Timeout', errMessage);
            cleanupAndFinish('reject', new Error(errMessage));
        }
    }, timeoutDuration);

    function checkForStartupMessage(dataChunk) {
        if (!backendStarted && dataChunk.includes(startupSuccessMessage)) {
            backendStarted = true;
            console.log('[Main.js] Backend started successfully (detected in output).');
            cleanupAndFinish('resolve');
        }
    }

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      accumulatedStdout += output;
      console.log(`Backend STDOUT: ${output}`);
      checkForStartupMessage(output);
    });

    backendProcess.stderr.on('data', (data) => {
      const errorOutput = data.toString();
      accumulatedStderr += errorOutput;
      console.error(`Backend STDERR: ${errorOutput}`);
      checkForStartupMessage(errorOutput);
    });

    const onClose = (code) => {
      console.log(`[Main.js] Backend process exited with code ${code}`);
      if (!backendStarted) {
        const errMessage = `[Main.js] Backend process exited prematurely with code ${code}.\nAccumulated STDOUT:\n${accumulatedStdout}\nAccumulated STDERR:\n${accumulatedStderr}`;
        console.error(errMessage);
        dialog.showErrorBox('Backend Error', errMessage);
        cleanupAndFinish('reject', new Error(errMessage));
      }
      backendProcess = null;
    };

    const onError = (err) => {
      console.error('[Main.js] Failed to start backend process:', err);
      dialog.showErrorBox('Backend Error', `Failed to start backend process: ${err.message}`);
      cleanupAndFinish('reject', err);
    };

    backendProcess.on('close', onClose);
    backendProcess.on('error', onError);
  });
}

app.on('ready', async () => {
  try {
    console.log('[Main.js] App ready, attempting to start backend...');
    console.log(`[Main.js] App is packaged: ${app.isPackaged}`);
    console.log(`[Main.js] App path: ${app.getAppPath()}`);
    console.log(`[Main.js] Resources path: ${process.resourcesPath}`); // 打印 resourcesPath 方便调试
    await startBackend();
    console.log('[Main.js] Backend presumably started, creating main window...');
    createMainWindow();
  } catch (error) {
    console.error('[Main.js] Critical error during app startup (backend failed to start):', error);
    app.quit();
  }
});

app.on('will-quit', () => {
  if (backendProcess && !backendProcess.killed) {
    console.log('[Main.js] Terminating backend process...');
    backendProcess.kill('SIGTERM');
    setTimeout(() => {
        if (backendProcess && !backendProcess.killed) {
            console.log('[Main.js] Backend process did not terminate with SIGTERM, forcing SIGKILL...');
            backendProcess.kill('SIGKILL');
        }
    }, 3000);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    if (!backendProcess || backendProcess.killed) {
        console.log("[Main.js] Backend not running or killed on activate, attempting to restart...");
        startBackend().then(() => {
            if (mainWindow === null) createMainWindow();
        }).catch(err => {
            console.error("[Main.js] Failed to restart backend on activate:", err);
            dialog.showErrorBox('Backend Error', `Failed to restart backend on activate: ${err.message}`);
        });
    } else {
        createMainWindow();
    }
  }
});