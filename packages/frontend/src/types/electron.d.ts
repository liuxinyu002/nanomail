/**
 * Electron 预加载脚本暴露的 API 类型声明
 * 与 packages/electron/src/preload/index.ts 保持同步
 *
 * 注意：悬浮窗和主窗口使用不同的 API 集合
 * - 主窗口: invoke + on (MainWindowAPI)
 * - 悬浮窗: hideWindow + getPlatform (FloatingWindowAPI)
 */

import type { FloatingWindowAPI, MainWindowAPI } from '@nanomail/shared'

// 重新导出类型方便使用
export type { FloatingWindowAPI, MainWindowAPI }

/**
 * Window 接口扩展
 * electronAPI 在 Electron 环境中存在，在纯 Web 环境中不存在
 */
declare global {
  interface Window {
    electronAPI?: FloatingWindowAPI | MainWindowAPI
  }
}

export {}