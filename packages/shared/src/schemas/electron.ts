/**
 * Electron API Types
 *
 * 主进程与渲染进程之间的类型契约
 * 定义 IPC 通信的接口和数据结构
 */

/**
 * IPC Channel 名称常量
 * 用于主进程和渲染进程之间的通信
 */
export const IPC_CHANNELS = {
  // Invoke channels (request-response)
  TOGGLE_FLOATING_WINDOW: 'toggle-floating-window',
  GET_WINDOW_STATE: 'get-window-state',
  HIDE_FLOATING_WINDOW: 'hide-floating-window',
  GET_PLATFORM: 'get-platform',

  // Event channels (one-way notification)
  FLOATING_WINDOW_CLOSED: 'floating-window-closed',
  SHORTCUT_TRIGGERED: 'shortcut-triggered',
} as const

/**
 * IPC Channel 名称类型
 */
export type IPCChannelName = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]

/**
 * 悬浮窗专用的 Electron API 接口
 * 用于悬浮窗渲染进程调用主进程方法
 */
export interface FloatingWindowAPI {
  /** 隐藏当前悬浮窗 */
  hideWindow: () => Promise<void>
  /** 获取当前操作系统平台 */
  getPlatform: () => Promise<string>
}

/**
 * 主窗口专用的 Electron API 接口
 * 用于主窗口渲染进程调用主进程方法
 */
export interface MainWindowAPI {
  /**
   * 切换悬浮窗显示/隐藏
   * 如果悬浮窗不存在则创建，存在且聚焦则隐藏，存在但未聚焦则置顶显示
   */
  toggleFloatingWindow: () => Promise<void>

  /**
   * 安全的 IPC invoke 封装
   * 用于请求-响应模式的 IPC 通信
   */
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>

  /**
   * 安全的 IPC on 封装
   * 用于监听主进程发送的事件
   * @returns 取消订阅函数
   */
  on: (channel: string, callback: (...args: unknown[]) => void) => () => void
}

/**
 * 暴露给渲染进程的 Electron API 接口
 * 通过 preload 脚本的 contextBridge 暴露
 *
 * 主窗口和悬浮窗使用不同的 API 集合
 */
export type ElectronAPI = MainWindowAPI | FloatingWindowAPI

/**
 * 扩展 Window 接口
 * 使渲染进程可以通过 window.electronAPI 访问 Electron API
 */
declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}