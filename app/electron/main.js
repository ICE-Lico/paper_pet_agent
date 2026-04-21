const { app, BrowserWindow, dialog, ipcMain, screen } = require("electron");
const http = require("http");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

let backendProcess = null;
let ballWindow = null;
let panelWindow = null;

function getPythonExecutable() {
  const venvPaths = [
    path.join(__dirname, "..", ".venv", "Scripts", "python.exe"),
    path.join(__dirname, "..", ".venv", "bin", "python"),
    "python3",
    "python",
  ];

  for (const pythonPath of venvPaths) {
    try {
      if (fs.existsSync(pythonPath)) return pythonPath;
    } catch (error) {
      console.error("检查 Python 路径失败:", error);
    }
  }

  return "python";
}

function attachBackendLogs(processRef) {
  processRef.on("error", (error) => {
    console.error("后端启动失败:", error);
  });

  processRef.stdout?.on("data", (data) => {
    console.log("backend stdout:", data.toString());
  });

  processRef.stderr?.on("data", (data) => {
    console.error("backend stderr:", data.toString());
  });

  processRef.on("exit", (code, signal) => {
    console.log("backend exited:", { code, signal });
  });
}

function stopBackend() {
  if (backendProcess) {
    backendProcess.kill();
    backendProcess = null;
  }
}

function startBackend() {
  if (app.isPackaged) {
    const backendExe = path.join(process.resourcesPath, "electron", "backend", "backend.exe");
    console.log("后端路径:", backendExe, "存在:", fs.existsSync(backendExe));

    backendProcess = spawn(backendExe, [], {
      cwd: path.dirname(backendExe),
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    });
    attachBackendLogs(backendProcess);
    return;
  }

  const python = getPythonExecutable();
  backendProcess = spawn(
    python,
    ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000"],
    {
      cwd: path.join(__dirname, ".."),
      stdio: ["ignore", "pipe", "pipe"],
      detached: false,
    }
  );
  attachBackendLogs(backendProcess);
}

function checkBackendReady() {
  return new Promise((resolve) => {
    const request = http.get("http://127.0.0.1:8000/config", (response) => {
      response.resume();
      resolve(response.statusCode >= 200 && response.statusCode < 500);
    });

    request.on("error", () => resolve(false));
    request.setTimeout(1500, () => {
      request.destroy();
      resolve(false);
    });
  });
}

async function waitForBackend(maxWaitMs = 30000, intervalMs = 500) {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (await checkBackendReady()) return true;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return false;
}

function positionPanelWindow() {
  if (!ballWindow || !panelWindow) return;

  const ball = ballWindow.getBounds();
  const displayBounds = screen.getPrimaryDisplay().bounds;
  let x = ball.x;
  let y = ball.y + ball.height + 12;

  if (x + 470 > displayBounds.width - 8) {
    x = Math.max(8, displayBounds.width - 470 - 8);
  }

  if (y + 640 > displayBounds.height - 8) {
    y = ball.y - 640 - 12;
  }

  panelWindow.setPosition(x, y);
}

function createWindows() {
  const indexPath = path.join(__dirname, "../frontend/dist/index.html");
  console.log("前端入口:", indexPath, "存在:", fs.existsSync(indexPath));

  const fileUrl = `file://${indexPath.replace(/\\/g, "/")}`;

  ballWindow = new BrowserWindow({
    width: 124,
    height: 124,
    x: screen.getPrimaryDisplay().bounds.width - 144,
    y: screen.getPrimaryDisplay().bounds.height - 144,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    roundedCorners: false,
    thickFrame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  panelWindow = new BrowserWindow({
    width: 470,
    height: 640,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    roundedCorners: false,
    thickFrame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    hasShadow: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  ballWindow.webContents.on("did-fail-load", (_, errorCode, errorDescription, validatedURL) => {
    console.error("悬浮球加载失败:", errorCode, errorDescription, validatedURL);
  });

  panelWindow.webContents.on("did-fail-load", (_, errorCode, errorDescription, validatedURL) => {
    console.error("面板加载失败:", errorCode, errorDescription, validatedURL);
  });

  ballWindow.loadURL(fileUrl);
  panelWindow.loadURL(`${fileUrl}?panel=1`);
}

function setupIPC() {
  ipcMain.on("toggle-panel", () => {
    if (!panelWindow) return;

    if (panelWindow.isVisible()) {
      panelWindow.hide();
      return;
    }

    positionPanelWindow();
    panelWindow.show();
  });

  ipcMain.on("close-panel", () => {
    panelWindow?.hide();
  });

  ipcMain.on("window-move", (_, dx, dy) => {
    if (!ballWindow) return;

    const [x, y] = ballWindow.getPosition();
    ballWindow.setPosition(x + dx, y + dy);

    if (panelWindow?.isVisible()) {
      positionPanelWindow();
    }
  });

  ipcMain.handle("save-text-file", async (_, payload) => {
    const result = await dialog.showSaveDialog({
      title: "保存论文与聊天记录",
      defaultPath: payload?.defaultPath || "paper-pet.txt",
      filters: [{ name: "Text File", extensions: ["txt"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    fs.writeFileSync(result.filePath, payload?.content || "", "utf-8");
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle("quit-app", () => {
    stopBackend();
    app.quit();
    return { success: true };
  });
}

app.whenReady().then(async () => {
  startBackend();
  setupIPC();
  await waitForBackend();
  createWindows();
});

app.on("before-quit", () => {
  stopBackend();
});

app.on("window-all-closed", () => {
  stopBackend();
  if (process.platform !== "darwin") app.quit();
});
