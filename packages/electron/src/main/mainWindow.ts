import { BrowserWindow } from 'electron'
import path from 'path'

export function createMainWindow(isDev: boolean): BrowserWindow {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    win.loadURL('http://localhost:5173')
    win.webContents.openDevTools()
  } else {
    // 生产环境：从 resources 目录加载前端资源
    // Phase 5 打包时，electron-builder 会将前端 dist 拷贝到 resources/frontend/
    const frontendPath = path.join(process.resourcesPath, 'frontend', 'index.html')
    console.log('[Electron] Loading frontend from:', frontendPath)
    console.log('[Electron] process.resourcesPath:', process.resourcesPath)

    win.loadFile(frontendPath)
      .then(() => console.log('[Electron] Frontend loaded successfully'))
      .catch((err) => console.error('[Electron] Failed to load frontend:', err))

    // 生产环境也打开 DevTools 用于调试
    win.webContents.openDevTools()
  }

  // 监听控制台消息
  win.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer]', message)
  })

  // 监听加载错误
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription, validatedURL)
  })

  return win
}