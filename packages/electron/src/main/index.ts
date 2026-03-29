import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { createMainWindow } from './mainWindow'
import { createFloatingWindow } from './floatingWindow'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { BackendProcess } from './backendProcess'
import { IPC_CHANNELS } from '@nanomail/shared'

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null
let backendProcess: BackendProcess | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function bootstrap() {
  // 生产环境：启动后端进程
  if (!isDev) {
    try {
      backendProcess = new BackendProcess()
      await backendProcess.start()
    } catch (err) {
      console.error('[Electron] Failed to start backend:', err)
      dialog.showErrorBox(
        'Backend Error',
        `Backend failed to start: ${err instanceof Error ? err.message : String(err)}\n\nThe app will continue but some features may not work.`
      )
      // 继续创建窗口，让用户至少能看到界面
    }
  }

  // 创建主窗口
  mainWindow = createMainWindow(isDev)

  // 注册全局快捷键
  registerShortcuts(() => {
    toggleFloatingWindow()
  })

  // IPC: 切换悬浮窗
  ipcMain.handle(IPC_CHANNELS.TOGGLE_FLOATING_WINDOW, () => {
    toggleFloatingWindow()
  })

  // IPC: 隐藏悬浮窗
  ipcMain.handle(IPC_CHANNELS.HIDE_FLOATING_WINDOW, (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.hide()
  })

  // IPC: 获取平台信息
  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, () => process.platform)
}

function toggleFloatingWindow() {
  // 修复：检查窗口是否已被销毁
  // floatingWindow 变量可能存在但底层 WebContents 已被销毁
  if (floatingWindow && !floatingWindow.isDestroyed()) {
    // 只有既可见又有焦点时才隐藏
    // 否则（被其他窗口遮挡或未聚焦）应该置顶显示
    if (floatingWindow.isVisible() && floatingWindow.isFocused()) {
      floatingWindow.hide()
    } else {
      floatingWindow.show()
      floatingWindow.focus()
    }
  } else {
    floatingWindow = createFloatingWindow(isDev)

    // 关键：监听 closed 事件，清理引用
    // 防止窗口被强制关闭后 floatingWindow 变量仍持有已销毁的引用
    floatingWindow.on('closed', () => {
      floatingWindow = null
    })
  }
}

app.whenReady().then(bootstrap)

app.on('window-all-closed', () => {
  unregisterShortcuts()
  backendProcess?.stop()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  backendProcess?.stop()
})

// 导出给 shortcuts.ts 使用
export function getMainWindow() {
  return mainWindow
}

export function getFloatingWindow() {
  return floatingWindow
}

export function setFloatingWindow(win: BrowserWindow | null) {
  floatingWindow = win
}