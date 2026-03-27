import { contextBridge, ipcRenderer } from 'electron'
import { IPC_CHANNELS } from '@nanomail/shared'

/**
 * Preload 脚本安全暴露规范
 *
 * 原则：
 * 1. 使用 contextBridge.exposeInMainWorld 暴露有限的 API
 * 2. 永不暴露整个 ipcRenderer 对象，只暴露必要的 invoke/on 方法
 * 3. 使用白名单机制限制可调用的 IPC channel
 * 4. 所有暴露的 API 应有明确的类型定义
 *
 * 悬浮窗与主窗口共享同一 preload 脚本，但使用不同的 API 子集：
 * - 悬浮窗：hideWindow, getPlatform
 * - 主窗口：invoke, on (通过白名单限制)
 */

// IPC channel 白名单（基于 IPC_CHANNELS 常量）
const ALLOWED_CHANNELS = {
  invoke: [
    IPC_CHANNELS.TOGGLE_FLOATING_WINDOW,
    IPC_CHANNELS.GET_WINDOW_STATE,
    IPC_CHANNELS.HIDE_FLOATING_WINDOW,
    IPC_CHANNELS.GET_PLATFORM,
  ] as const,
  on: [
    IPC_CHANNELS.FLOATING_WINDOW_CLOSED,
    IPC_CHANNELS.SHORTCUT_TRIGGERED,
  ] as const,
} as const

// 类型定义
type InvokeChannel = typeof ALLOWED_CHANNELS.invoke[number]
type OnChannel = typeof ALLOWED_CHANNELS.on[number]

// 暴露给渲染进程的安全 API
contextBridge.exposeInMainWorld('electronAPI', {
  // ===== Electron 环境信息 =====

  /**
   * 检测是否在 Electron 环境中
   */
  isElectron: true,

  /**
   * 获取后端 API 基础 URL
   * 打包后后端运行在 localhost:3000
   */
  getApiBaseUrl: (): string => {
    return 'http://localhost:3000'
  },

  // ===== 悬浮窗专用 API =====

  /**
   * 隐藏当前悬浮窗
   * 悬浮窗调用时隐藏自己
   */
  hideWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.HIDE_FLOATING_WINDOW)
  },

  /**
   * 获取当前操作系统平台
   * @returns 'darwin' | 'win32' | 'linux'
   */
  getPlatform: (): Promise<string> => {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PLATFORM)
  },

  // ===== 主窗口专用 API =====

  /**
   * 切换悬浮窗显示/隐藏
   * 主窗口专用，用于打开/关闭悬浮窗
   */
  toggleFloatingWindow: (): Promise<void> => {
    return ipcRenderer.invoke(IPC_CHANNELS.TOGGLE_FLOATING_WINDOW)
  },

  /**
   * 安全的 IPC invoke 封装
   * 用于请求-响应模式的 IPC 通信
   */
  invoke: (channel: string, ...args: unknown[]): Promise<unknown> => {
    if (!ALLOWED_CHANNELS.invoke.includes(channel as InvokeChannel)) {
      return Promise.reject(new Error(`Channel "${channel}" is not allowed`))
    }
    return ipcRenderer.invoke(channel, ...args)
  },

  /**
   * 安全的 IPC on 封装
   * 用于监听主进程发送的事件
   * @returns 取消订阅函数
   */
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    if (!ALLOWED_CHANNELS.on.includes(channel as OnChannel)) {
      throw new Error(`Channel "${channel}" is not allowed for listening`)
    }
    const subscription = (_event: unknown, ...args: unknown[]) => callback(...args)
    ipcRenderer.on(channel, subscription)
    return () => ipcRenderer.removeListener(channel, subscription)
  },
})