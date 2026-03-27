import { globalShortcut, dialog } from 'electron'

/**
 * 全局快捷键管理
 *
 * 注册全局快捷键 ⌘+Shift+Space (macOS) / Ctrl+Shift+Space (Windows/Linux)
 * 用于唤起/隐藏悬浮窗
 */

let shortcutCallback: (() => void) | null = null

/**
 * 注册全局快捷键
 * @param callback 快捷键触发时的回调函数
 * @returns 是否注册成功
 */
export function registerShortcuts(callback: () => void): boolean {
  shortcutCallback = callback

  // 注册默认快捷键 Cmd+Shift+Space (macOS) / Ctrl+Shift+Space (Windows/Linux)
  const accelerator = process.platform === 'darwin'
    ? 'Command+Shift+Space'
    : 'Ctrl+Shift+Space'

  const success = globalShortcut.register(accelerator, () => {
    shortcutCallback?.()
  })

  if (!success) {
    // MVP 阶段的优雅降级：弹窗提示冲突
    dialog.showErrorBox(
      '快捷键冲突',
      `无法注册全局快捷键 (${accelerator})，它可能被其他应用程序占用。请通过主窗口的按钮使用悬浮窗。`
    )
    console.error(`Failed to register global shortcut: ${accelerator}`)
  } else {
    console.log(`Global shortcut registered: ${accelerator}`)
  }

  return success
}

/**
 * 注销全局快捷键
 * 使用 unregisterAll 简化注销逻辑，避免硬编码匹配错误
 */
export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll()
  shortcutCallback = null
  console.log('All global shortcuts unregistered')
}