import { BrowserWindow, screen } from 'electron'
import path from 'path'
import { setFloatingWindow } from './index'

/**
 * 创建悬浮窗口
 *
 * 规格:
 * - 固定宽度 400px，高度 600px
 * - 无边框、透明背景、圆角
 * - 始终置顶
 * - macOS 全屏应用下可见
 * - 失焦自动隐藏
 */
export function createFloatingWindow(isDev: boolean): BrowserWindow {
  const { width, height } = { width: 400, height: 600 }  // 固定高度
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const win = new BrowserWindow({
    width,
    height,
    minWidth: 400,
    minHeight: 600,
    maxWidth: 400,
    maxHeight: 600,
    x: screenWidth - width - 20,
    y: screenHeight - height - 20,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // macOS 跨工作区/全屏应用显示
  // 确保悬浮窗在全屏应用下也能显示
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

  // 加载前端的 /floating 路由
  // 注意：前端必须使用 HashRouter 才能在 file:// 协议下正常工作
  if (isDev) {
    // 开发环境也要用 hash 路由，保持与生产环境一致
    win.loadURL('http://localhost:5173/#/floating')
  } else {
    // 生产环境：前端使用 HashRouter，加载带 hash 的 URL
    // 前端资源位于 resources/frontend/
    const frontendPath = path.join(process.resourcesPath, 'frontend', 'index.html')
    win.loadFile(frontendPath, { hash: 'floating' })
  }

  // 窗口关闭时清理引用
  win.on('closed', () => {
    setFloatingWindow(null)
  })

  return win
}