# Electron 悬浮窗功能实现方案

## 概述

为 NanoMail 添加 Electron 桌面端支持，实现系统级悬浮窗功能。用户可通过全局快捷键或主窗口按钮唤起悬浮窗，与 AI 进行对话以记录和整理待办事项。悬浮窗与主窗口共享同一对话会话，数据通过 localStorage 实时同步。

**核心设计原则**：
- **复用现有前端**：悬浮窗通过路由复用主前端，避免代码重复
- **简化实现**：固定窗口高度，避免动态调整带来的性能问题
- **安全可靠**：正确处理进程管理和数据同步

---

## 需求分析

### 核心需求

| 需求 | 描述 | 优先级 |
|------|------|--------|
| 系统级悬浮窗 | 悬浮在其他软件上方，支持随时唤起 | P0 |
| 共享会话 | 悬浮窗与主窗口共享同一对话，数据实时同步 | P0 |
| 全局快捷键 | `Ctrl/Cmd + Shift + K` 唤起/隐藏悬浮窗 | P0 |
| 主窗口联动 | 主窗口提供按钮开启悬浮窗 | P1 |
| 后端自动启动 | 生产环境 Electron 应用启动时自动启动后端服务 | P1 |
| 打包分发 | 支持 Windows + macOS 安装包 | P2 |

### 悬浮窗 UI 规格

| 属性 | 规格 | 说明 |
|------|------|------|
| 宽度 | 固定 400px | |
| 高度 | 固定 600px（展开态）或 80px（输入态） | 仅两种状态切换，不动态调整 |
| 窗口样式 | `frame: false`, 透明背景, 圆角 | |
| 置顶 | `alwaysOnTop: true` | |
| 默认位置 | 屏幕右下角 | |
| 拖拽 | 顶部 32px 热区支持拖拽移动 | |
| 失焦行为 | 点击外部自动隐藏 | |

### 数据同步方案

**现有状态**：对话历史存储在 `sessionStorage`，key 为 `nanomail_chat_messages`

**改造方案**：
1. 将存储从 `sessionStorage` 迁移到 `localStorage`
2. Electron 主进程启动时清除 localStorage，模拟 Session 生命周期
3. 通过 `storage` event 实现跨窗口实时同步

```
数据同步流程：
1. Electron App 启动 → 主进程执行 localStorage.removeItem('nanomail_chat_messages')
2. 任一窗口发送消息 → localStorage.setItem(...)
3. 其他窗口监听 storage event → 同步消息列表
```

---

## 架构设计

### 技术架构图

```
┌─────────────────────────────────────────────────────┐
│                  Electron 主进程                      │
│  - 窗口管理（主窗口 + 悬浮窗）                          │
│  - 全局快捷键注册                                      │
│  - 后端进程管理（仅生产环境）                           │
│  - IPC 通信                                          │
│  - 启动时清理 localStorage                            │
└─────────────────────────────────────────────────────┘
           │                              │
           ▼                              ▼
┌──────────────────────┐      ┌──────────────────────┐
│     主窗口            │      │      悬浮窗           │
│  (BrowserWindow)     │      │  (BrowserWindow)     │
│  - 完整 NanoMail UI   │      │  - 精简 Chat UI      │
│  - 加载 /            │      │  - 加载 /floating     │
│  - alwaysOnTop       │      │                      │
│                      │      │                      │
│  localStorage ◀─────┼──────┼─▶ localStorage        │
│       │              │      │       │              │
│       ▼              │      │       ▼              │
│  storage event ──────┼──────┼─▶ storage event      │
└──────────────────────┘      └──────────────────────┘
                │                       │
                └───────────┬───────────┘
                            ▼
                   ┌─────────────────┐
                   │   后端服务       │
                   │  (localhost)    │
                   │  - Express API  │
                   │  - SQLite       │
                   └─────────────────┘
```

### 新增目录结构

```
packages/
├── frontend/          # 现有 React 前端
│   └── src/
│       └── pages/
│           └── FloatingChatPage.tsx  # 新增：悬浮窗专用路由页面
├── backend/           # 现有 Express 后端（保持不变）
├── shared/            # 共享类型（保持不变）
└── electron/          # 新增 Electron 桌面端
    ├── src/
    │   ├── main/                 # 主进程代码
    │   │   ├── index.ts          # 入口，应用生命周期，localStorage 清理
    │   │   ├── mainWindow.ts     # 主窗口管理
    │   │   ├── floatingWindow.ts # 悬浮窗管理
    │   │   ├── shortcuts.ts      # 全局快捷键
    │   │   ├── backendProcess.ts # 后端进程管理（仅生产环境）
    │   │   ├── store.ts          # 窗口状态持久化
    │   │   └── ipc.ts            # IPC 处理
    │   └── preload/              # 预加载脚本
    │       └── index.ts          # 暴露安全 API 给渲染进程
    ├── build/                    # 打包资源（图标等）
    │   ├── icon.icns             # macOS 图标
    │   └── icon.ico              # Windows 图标
    ├── electron-builder.yml      # 打包配置
    ├── vite.main.config.ts       # 主进程 Vite 配置
    ├── vite.preload.config.ts    # 预加载脚本 Vite 配置
    ├── tsconfig.json             # TypeScript 配置
    └── package.json
```

**关键变化**：
- ❌ 删除了独立的 `renderer` 目录
- ✅ 悬浮窗直接加载前端的 `/floating` 路由
- ✅ 前端新增 `FloatingChatPage.tsx` 复用现有组件

### 现有代码变更

| 文件 | 变更类型 | 描述 |
|------|----------|------|
| `packages/frontend/src/pages/FloatingChatPage.tsx` | 新增 | 悬浮窗专用页面，复用 Chat 组件 |
| `packages/frontend/src/App.tsx` | 修改 | 添加 `/floating` 路由 |
| `packages/frontend/src/hooks/useChat.ts` | 修改 | 迁移存储到 localStorage，支持跨窗口同步 |
| `packages/frontend/src/components/layout/MainLayout.tsx` | 修改 | 添加开启悬浮窗按钮（仅 Electron 环境） |

---

## 风险评估

### 高风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| **跨窗口数据同步** | localStorage 同步延迟或丢失 | storage event 天然防循环，判断数据一致性 |
| **全局快捷键冲突** | 与其他应用快捷键冲突 | 提供备用快捷键，优雅降级提示 |

### 中风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| **打包体积** | Electron + 后端打包后体积大 | 后端使用 esbuild 打包成单文件，不拷贝 node_modules |
| **macOS 权限** | 辅助功能权限、通知权限 | 在 UI 中引导用户授权 |
| **窗口焦点管理** | 多窗口焦点切换混乱 | 明确的窗口状态机，失焦自动隐藏悬浮窗 |

### 低风险

| 风险 | 描述 | 缓解措施 |
|------|------|----------|
| **拖拽体验** | 拖拽时窗口闪烁 | 使用双缓冲、禁用重绘 |
| **内存泄漏** | 后端长时间运行内存增长 | 定时重启后端进程（可选） |

---

## 实施阶段

### Phase 1: 项目初始化与基础架构

**目标**：搭建 Electron 项目骨架，实现主窗口加载前端

#### 1.1 创建 Electron 包结构

**文件**: `packages/electron/package.json`

```json
{
  "name": "@nanomail/electron",
  "version": "0.1.0",
  "private": true,
  "main": "dist/main/index.js",
  "scripts": {
    "dev": "vite build -c vite.main.config.ts --watch & vite build -c vite.preload.config.ts --watch & electron .",
    "build": "tsc && vite build -c vite.main.config.ts && vite build -c vite.preload.config.ts",
    "package": "pnpm build && electron-builder",
    "package:win": "pnpm build && electron-builder --win",
    "package:mac": "pnpm build && electron-builder --mac"
  },
  "dependencies": {
    "electron-store": "^8.1.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1",
    "typescript": "^5.3.3",
    "vite": "^5.0.0"
  }
}
```

**验收标准**：
- [ ] Electron 包目录结构创建完成
- [ ] package.json 配置正确
- [ ] TypeScript 配置完成

---

#### 1.2 主进程入口

**文件**: `packages/electron/src/main/index.ts`

```typescript
import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { createMainWindow } from './mainWindow'
import { createFloatingWindow } from './floatingWindow'
import { registerShortcuts, unregisterShortcuts } from './shortcuts'
import { BackendProcess } from './backendProcess'

let mainWindow: BrowserWindow | null = null
let floatingWindow: BrowserWindow | null = null
let backendProcess: BackendProcess | null = null

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

async function bootstrap() {
  // 生产环境：启动后端进程
  if (!isDev) {
    backendProcess = new BackendProcess()
    await backendProcess.start()
  }

  // 创建主窗口
  mainWindow = createMainWindow(isDev)

  // 启动时清理 localStorage（模拟 Session 生命周期）
  // 必须等待页面加载完成后再执行，否则清除的是 about:blank 的存储
  mainWindow.webContents.once('did-finish-load', async () => {
    await mainWindow?.webContents.executeJavaScript(
      `localStorage.removeItem('nanomail_chat_messages')`
    )
  })

  // 注册全局快捷键
  registerShortcuts(() => {
    toggleFloatingWindow()
  })

  // IPC: 切换悬浮窗
  ipcMain.handle('toggle-floating-window', () => {
    toggleFloatingWindow()
  })
}

function toggleFloatingWindow() {
  if (floatingWindow) {
    // 修复：只有既可见又有焦点时才隐藏
    // 否则（被其他窗口遮挡或未聚焦）应该置顶显示
    if (floatingWindow.isVisible() && floatingWindow.isFocused()) {
      floatingWindow.hide()
    } else {
      floatingWindow.show()
      floatingWindow.focus()
    }
  } else {
    floatingWindow = createFloatingWindow(isDev)
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
```

**验收标准**：
- [ ] Electron 应用可启动
- [ ] 主窗口正常加载前端页面
- [ ] 应用启动时 localStorage 被正确清理
- [ ] 应用退出时正确清理资源

---

#### 1.3 后端进程管理（仅生产环境）

**文件**: `packages/electron/src/main/backendProcess.ts`

```typescript
import { spawn, ChildProcess } from 'child_process'
import { app, dialog } from 'electron'
import path from 'path'
import http from 'http'

export class BackendProcess {
  private process: ChildProcess | null = null
  private port = 3000
  private maxRetries = 3
  private retryCount = 0

  async start(): Promise<void> {
    // 仅在生产环境运行
    if (!app.isPackaged) {
      console.log('Development mode: skipping backend process management')
      return
    }

    const portAvailable = await this.checkPortAvailable(this.port)
    if (!portAvailable) {
      // 端口冲突时弹窗报错，让用户选择退出或重试
      const result = await dialog.showMessageBox({
        type: 'error',
        buttons: ['Exit', 'Retry'],
        title: 'Port Conflict',
        message: `Port ${this.port} is already in use.`,
        detail: 'Please close the conflicting application and try again.'
      })
      if (result.response === 0) {
        app.quit()
        return
      }
      // 用户选择重试
      return this.start()
    }

    const backendPath = path.join(process.resourcesPath, 'backend', 'index.cjs')

    this.process = spawn('node', [backendPath], {
      env: { ...process.env, PORT: String(this.port) },
      stdio: ['ignore', 'pipe', 'pipe']
    })

    this.process.stdout?.on('data', (data) => {
      console.log(`[Backend] ${data}`)
    })

    this.process.stderr?.on('data', (data) => {
      console.error(`[Backend Error] ${data}`)
    })

    this.process.on('exit', (code) => {
      if (code !== 0 && this.retryCount < this.maxRetries) {
        this.retryCount++
        console.log(`Backend exited with code ${code}, restarting... (${this.retryCount}/${this.maxRetries})`)
        setTimeout(() => this.start(), 1000)
      }
    })

    await this.waitForReady()
  }

  private async checkPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = http.createServer()
      server.once('error', () => resolve(false))
      server.once('listening', () => {
        server.close()
        resolve(true)
      })
      server.listen(port)
    })
  }

  private async waitForReady(maxWait = 10000): Promise<void> {
    const startTime = Date.now()
    while (Date.now() - startTime < maxWait) {
      if (await this.healthCheck()) return
      await new Promise(r => setTimeout(r, 200))
    }
    throw new Error('Backend failed to start within timeout')
  }

  private async healthCheck(): Promise<boolean> {
    return new Promise((resolve) => {
      const req = http.get(`http://localhost:${this.port}/health`, (res) => {
        resolve(res.statusCode === 200)
      })
      req.on('error', () => resolve(false))
      req.setTimeout(2000, () => {
        req.destroy()
        resolve(false)
      })
    })
  }

  stop(): void {
    this.process?.kill()
    this.process = null
  }
}
```

**关键变化**：
- ✅ 开发环境不启动后端，完全由 `pnpm dev` 管理
- ✅ 生产环境端口冲突时弹窗报错，而不是尝试连接冲突端口
- ✅ 后端使用打包后的 `index.cjs` 文件

**验收标准**：
- [ ] 开发环境不干扰现有的 pnpm dev
- [ ] 生产环境后端进程可自动启动
- [ ] 端口冲突时有正确的用户提示
- [ ] 进程崩溃后可自动重启

---

### Phase 2: 悬浮窗实现

**目标**：创建悬浮窗 UI，实现拖拽、失焦隐藏

#### 2.1 悬浮窗管理

**文件**: `packages/electron/src/main/floatingWindow.ts`

```typescript
import { BrowserWindow, screen } from 'electron'
import path from 'path'

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

  // 失焦隐藏
  win.on('blur', () => {
    win.hide()
  })

  // 加载前端的 /floating 路由
  // 注意：前端必须使用 HashRouter 才能在 file:// 协议下正常工作
  if (isDev) {
    // 开发环境也要用 hash 路由，保持与生产环境一致
    win.loadURL('http://localhost:5173/#/floating')
  } else {
    // 生产环境：前端使用 HashRouter，加载带 hash 的 URL
    win.loadFile(path.join(__dirname, '../../../frontend/dist/index.html'), {
      hash: 'floating'
    })
  }

  return win
}
```

**关键变化**：
- ✅ 固定高度 600px，取消动态调整
- ✅ 加载前端的 `/floating` 路由，删除独立的 renderer 目录
- ✅ 生产环境使用 HashRouter
- ⚠️ **重要**：前端 `App.tsx` 必须使用 `<HashRouter>` 而非 `<BrowserRouter>`，否则在 `file://` 协议下无法正常路由

**验收标准**：
- [ ] 悬浮窗可正常创建
- [ ] 默认位置在屏幕右下角
- [ ] 失焦自动隐藏
- [ ] 正确加载前端 /floating 路由
- [ ] 前端确认使用 HashRouter

---

#### 2.2 IPC 通信

**文件**: `packages/electron/src/main/ipc.ts`

```typescript
import { ipcMain, BrowserWindow } from 'electron'

export function setupIPC() {
  // 渲染进程请求隐藏窗口
  ipcMain.handle('hide-floating-window', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    win?.hide()
  })

  // 获取当前平台
  ipcMain.handle('get-platform', () => process.platform)
}
```

**关键变化**：
- ❌ 删除了 `resize-floating-window` IPC（不再需要动态调整高度）

**验收标准**：
- [ ] IPC 通信正常工作
- [ ] 渲染进程可调用主进程方法

---

#### 2.3 预加载脚本

**文件**: `packages/electron/src/preload/index.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron'

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 窗口控制
  hideWindow: () =>
    ipcRenderer.invoke('hide-floating-window'),
  toggleFloatingWindow: () =>
    ipcRenderer.invoke('toggle-floating-window'),

  // 平台信息
  getPlatform: () =>
    ipcRenderer.invoke('get-platform'),
})
```

**关键变化**：
- ❌ 删除了 `resizeWindow` API

**验收标准**：
- [ ] API 安全暴露给渲染进程
- [ ] 类型定义正确

---

#### 2.4 前端悬浮窗路由页面

**文件**: `packages/frontend/src/pages/FloatingChatPage.tsx`

```tsx
import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { Button } from '@/components/ui/button'
import { Minus, Send, StopCircle } from 'lucide-react'

export default function FloatingChatPage() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    sendMessage,
    stopGeneration,
  } = useChat()

  return (
    <div className="h-screen flex flex-col bg-white/95 backdrop-blur-xl rounded-xl overflow-hidden border border-gray-200/50">
      {/* 拖拽区域 */}
      <div
        className="h-8 flex items-center justify-end px-3 bg-gray-50/80 border-b border-gray-100 shrink-0"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
          onClick={() => window.electronAPI?.hideWindow()}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          title="Hide"
        >
          <Minus className="w-3 h-3 text-gray-600" />
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`p-2 rounded-lg text-sm ${
              msg.role === 'user'
                ? 'bg-blue-100 ml-8'
                : 'bg-gray-100 mr-8'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </div>

      {/* 输入区域 */}
      <div className="p-3 border-t border-gray-100 shrink-0">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                sendMessage()
              }
            }}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {isStreaming ? (
            <Button size="sm" variant="destructive" onClick={stopGeneration}>
              <StopCircle className="w-4 h-4" />
            </Button>
          ) : (
            <Button size="sm" onClick={sendMessage} disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
```

**关键变化**：
- ✅ 新增悬浮窗专用页面，复用现有 `useChat` hook
- ✅ 不再需要独立的 `useSyncedChat` hook
- ✅ 复用现有的 Tailwind 样式

**验收标准**：
- [ ] 悬浮窗 UI 正常渲染
- [ ] 可拖拽移动窗口
- [ ] 消息发送/接收正常

---

#### 2.5 路由配置

**文件**: `packages/frontend/src/App.tsx`

**重要**：前端必须使用 `<HashRouter>` 而非 `<BrowserRouter>`。原因是生产环境 Electron 加载 `file://` 协议的本地文件时，无法进行服务端 URL rewrite，只有 HashRouter 能正常工作。

```tsx
// 确保使用 HashRouter
import { HashRouter, Routes, Route } from 'react-router-dom'
import FloatingChatPage from './pages/FloatingChatPage'

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* 其他路由 */}
        <Route path="/floating" element={<FloatingChatPage />} />
      </Routes>
    </HashRouter>
  )
}
```

**验收标准**：
- [ ] 确认使用 HashRouter 而非 BrowserRouter
- [ ] /floating 路由可正常访问
- [ ] 页面渲染正确

---

### Phase 3: 跨窗口数据同步

**目标**：实现悬浮窗与主窗口对话数据实时同步

#### 3.1 数据存储迁移与同步

**文件**: `packages/frontend/src/hooks/useChat.ts`

**变更内容**:

```typescript
// 第 23 行
// 原：const SESSION_STORAGE_KEY = 'nanomail_chat_messages'
// 改为：
const STORAGE_KEY = 'nanomail_chat_messages'

// 第 225-235 行 - 读取逻辑
useEffect(() => {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)  // 改为 localStorage
    if (cached) {
      const parsed = JSON.parse(cached) as UIMessage[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        setMessages(parsed)
      }
    }
  } catch (e) {
    console.warn('Failed to restore chat from localStorage:', e)
  }
}, [])

// 第 238-246 行 - 写入逻辑
useEffect(() => {
  if (messages.length > 0) {
    try {
      const prunedMessages = pruneMessagesForStorage(messages)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prunedMessages))
    } catch (e) {
      console.warn('localStorage quota exceeded even after pruning...', e)
    }
  }
}, [messages])

// 新增：监听 storage event 实现跨窗口同步
// storage event 只在其他窗口触发，天生防循环
useEffect(() => {
  const handleStorageChange = (e: StorageEvent) => {
    if (e.key !== STORAGE_KEY) return
    if (!e.newValue) {
      setMessages([])
      return
    }

    try {
      const parsed = JSON.parse(e.newValue) as UIMessage[]
      if (Array.isArray(parsed)) {
        // 直接更新，无需判断 id 变化
        // 原因：storage event 只在"其他窗口"触发，当前窗口修改不会触发
        // 这样可以完美支持流式输出（streaming）的跨窗口实时同步
        // React 会自动处理重绘优化
        setMessages(parsed)
      }
    } catch (err) {
      console.warn('Failed to parse synced messages:', err)
    }
  }

  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [])  // 移除 messages 依赖，避免不必要的事件监听器重建
```

**关键变化**：
- ✅ 移除了 `isExternalUpdateRef` 的防循环机制
- ✅ storage event 天然只在其他窗口触发，不会循环
- ✅ 直接 `setMessages(parsed)` 完美支持流式输出跨窗口同步
- ⚠️ **修复**：移除了错误的 id 判断逻辑（该逻辑会导致流式输出时悬浮窗无法看到实时打字效果）

**验收标准**：
- [ ] sessionStorage 完全替换为 localStorage
- [ ] 跨窗口数据同步正常
- [ ] 无循环更新问题
- [ ] 流式输出时悬浮窗可实时看到打字效果

---

### Phase 4: 全局快捷键与主窗口联动

**目标**：实现全局快捷键唤起悬浮窗，主窗口添加开启按钮

#### 4.1 全局快捷键注册

**文件**: `packages/electron/src/main/shortcuts.ts`

```typescript
import { globalShortcut } from 'electron'

export function registerShortcuts(callback: () => void): boolean {
  const accelerator = process.platform === 'darwin'
    ? 'Cmd+Shift+K'
    : 'Ctrl+Shift+K'

  const success = globalShortcut.register(accelerator, callback)

  if (!success) {
    console.error(`Failed to register global shortcut: ${accelerator}`)
    // 尝试备用快捷键
    const fallbackAccelerator = process.platform === 'darwin'
      ? 'Cmd+Alt+K'
      : 'Ctrl+Alt+K'

    const fallbackSuccess = globalShortcut.register(fallbackAccelerator, callback)
    if (fallbackSuccess) {
      console.log(`Registered fallback shortcut: ${fallbackAccelerator}`)
    }
    return fallbackSuccess
  }

  return success
}

export function unregisterShortcuts(): void {
  const accelerator = process.platform === 'darwin'
    ? 'Cmd+Shift+K'
    : 'Ctrl+Shift+K'

  if (globalShortcut.isRegistered(accelerator)) {
    globalShortcut.unregister(accelerator)
  }

  const fallbackAccelerator = process.platform === 'darwin'
    ? 'Cmd+Alt+K'
    : 'Ctrl+Alt+K'

  if (globalShortcut.isRegistered(fallbackAccelerator)) {
    globalShortcut.unregister(fallbackAccelerator)
  }
}
```

**验收标准**：
- [ ] 快捷键可正常注册
- [ ] 快捷键可唤起/隐藏悬浮窗
- [ ] 应用退出时快捷键注销

---

#### 4.2 主窗口添加悬浮窗按钮

**文件**: `packages/frontend/src/components/layout/MainLayout.tsx`

**变更内容**:

```tsx
// 检测是否在 Electron 环境中
const isElectron = typeof window !== 'undefined' && window.electronAPI

// 在 header 右侧添加
{isElectron && (
  <Button
    variant="ghost"
    size="sm"
    onClick={() => window.electronAPI?.toggleFloatingWindow()}
    title="Open Floating Window (Ctrl/Cmd+Shift+K)"
  >
    <MessageSquare className="h-4 w-4" />
  </Button>
)}
```

**验收标准**：
- [ ] 按钮仅在 Electron 环境显示
- [ ] 点击按钮可切换悬浮窗

---

### Phase 5: 打包分发

**目标**：配置 electron-builder，生成 Windows 和 macOS 安装包

#### 5.1 后端打包配置

**文件**: `packages/backend/package.json` (scripts 部分)

```json
{
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --outfile=dist/index.cjs --external:better-sqlite3 --external:@node-rs/bcrypt",
    "build:electron": "pnpm build && cp -r node_modules/better-sqlite3 dist/"
  }
}
```

**关键变化**：
- ✅ 使用 esbuild 打包成单一 `index.cjs` 文件
- ✅ 外置原生模块 `better-sqlite3` 和 `@node-rs/bcrypt`
- ✅ 不再拷贝整个 node_modules

#### 5.2 electron-builder 配置

**文件**: `packages/electron/electron-builder.yml`

```yaml
appId: com.nanomail.app
productName: NanoMail
directories:
  output: release
  buildResources: build

# 包含后端资源（仅打包后的文件和必要原生模块）
extraResources:
  - from: "../backend/dist/index.cjs"
    to: "backend/index.cjs"
  - from: "../backend/dist/better-sqlite3"
    to: "backend/better-sqlite3"
  - from: "../backend/node_modules/better-sqlite3"
    to: "backend/node_modules/better-sqlite3"
  - from: "../backend/node_modules/@node-rs/bcrypt"
    to: "backend/node_modules/@node-rs/bcrypt"

# macOS 配置
mac:
  category: public.app-category.productivity
  icon: build/icon.icns
  target:
    - dmg
    - zip
  hardenedRuntime: true
  gatekeeperAssess: false

dmg:
  contents:
    - x: 130
      y: 220
    - x: 410
      y: 220
      type: link
      path: /Applications

# Windows 配置
win:
  icon: build/icon.ico
  target:
    - nsis
    - portable

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true

# 通用配置
asar: true
compression: maximum
```

**关键变化**：
- ✅ 只打包 esbuild 编译后的 `index.cjs`
- ✅ 只包含必要的原生模块
- ❌ 删除了整个 node_modules 的拷贝

**验收标准**：
- [ ] macOS DMG 可正常安装
- [ ] Windows NSIS 安装包可正常安装
- [ ] 后端资源正确打包
- [ ] 安装包体积合理（< 150MB）

---

#### 5.3 构建脚本

**文件**: `packages/electron/package.json` (scripts 部分)

```json
{
  "scripts": {
    "dev": "vite build -c vite.main.config.ts --watch & vite build -c vite.preload.config.ts --watch & electron .",
    "build:all": "pnpm --filter @nanomail/shared build && pnpm --filter @nanomail/backend build:electron && pnpm --filter @nanomail/frontend build && pnpm build",
    "package": "pnpm build:all && electron-builder",
    "package:win": "pnpm build:all && electron-builder --win --x64",
    "package:mac": "pnpm build:all && electron-builder --mac --universal"
  }
}
```

**验收标准**：
- [ ] 构建脚本可正常执行
- [ ] 各平台打包成功

---

## 测试策略

### 单元测试

| 模块 | 测试内容 | 文件 |
|------|----------|------|
| `useChat` | localStorage 读写、storage event 处理、数据一致性判断 | `useChat.test.tsx` |
| `BackendProcess` | 进程启动、健康检查、自动重启 | `backendProcess.test.ts` |
| `shortcuts` | 快捷键注册/注销 | `shortcuts.test.ts` |

### 集成测试

| 场景 | 测试内容 |
|------|----------|
| 后端启动流程 | Electron 启动 → 后端就绪 → 窗口创建 |
| 悬浮窗显示/隐藏 | 快捷键触发 → 窗口显示 → 失焦隐藏 |
| 数据同步 | 主窗口发送消息 → 悬浮窗收到同步 |

### E2E 测试

| 用户旅程 | 测试步骤 |
|----------|----------|
| 快捷键唤起 | 按下 Ctrl/Cmd+Shift+K → 悬浮窗显示 → 输入消息 → 主窗口同步 |
| 拖拽移动 | 显示悬浮窗 → 拖拽标题栏 → 窗口位置改变 |
| 失焦隐藏 | 显示悬浮窗 → 点击其他窗口 → 悬浮窗隐藏 |

---

## 复杂度评估

| 阶段 | 工作量 | 复杂度 | 风险 |
|------|--------|--------|------|
| Phase 1: 项目初始化 | 1 天 | 低 | 低 |
| Phase 2: 悬浮窗实现 | 1 天 | 低 | 低 |
| Phase 3: 数据同步 | 1 天 | 中 | 低 |
| Phase 4: 快捷键联动 | 0.5 天 | 低 | 低 |
| Phase 5: 打包分发 | 1.5 天 | 中 | 中 |
| **总计** | **5 天** | **低** | **低** |

---

## 成功标准

- [ ] 悬浮窗可通过全局快捷键 `Ctrl/Cmd + Shift + K` 唤起/隐藏
- [ ] 悬浮窗显示在其他应用上方
- [ ] 悬浮窗支持拖拽移动
- [ ] 悬浮窗失焦自动隐藏
- [ ] 悬浮窗与主窗口对话实时同步
- [ ] 主窗口可点击按钮开启悬浮窗
- [ ] 后端随 Electron 应用自动启动（仅生产环境）
- [ ] Windows/macOS 安装包可正常安装运行
- [ ] 安装包体积 < 150MB
- [ ] 所有单元测试通过，覆盖率 > 80%

---

## 依赖关系图

```
Phase 1: 项目初始化
    │
    ├── 1.1 创建包结构
    │       │
    │       ├── 1.2 主进程入口
    │       │       │
    │       │       └── 1.3 后端进程管理
    │       │
    │       └── 2.3 预加载脚本
    │
Phase 2: 悬浮窗实现
    │
    ├── 2.1 悬浮窗管理 (依赖 Phase 1)
    │       │
    │       └── 2.2 IPC 通信
    │
    └── 2.4-2.5 前端悬浮窗页面 (依赖 2.3 + Phase 3)
    │
Phase 3: 数据同步
    │
    ├── 3.1 存储迁移与同步
    │
Phase 4: 快捷键联动
    │
    ├── 4.1 全局快捷键 (依赖 Phase 1)
    │
    └── 4.2 主窗口按钮 (依赖 2.3)
    │
Phase 5: 打包分发
    │
    └── 依赖 Phase 1-4 全部完成
```

---

## 设计规范遵循

悬浮窗 UI 设计遵循 `docs/SPEC/design-system.md` 中的规范：

| 规范项 | 实现 |
|--------|------|
| 主色 blue-600 | 发送按钮使用 `bg-blue-600` |
| 背景 white | 悬浮窗背景 `bg-white/95` |
| 边框 gray-200 | `border-gray-200/50` |
| 文字 gray-900 | 标题使用 `text-gray-900` |
| 提示文字 gray-500 | placeholder 使用 `text-gray-500` |
| 动画时长 150ms | 过渡动画 `duration-150` |
| Hover 背景 gray-50 | 按钮悬停 `hover:bg-gray-100` |

---

## 变更记录

| 版本 | 日期 | 变更内容 |
|------|------|----------|
| v1.0 | 2026-03-26 | 初始版本 |
| v1.1 | 2026-03-26 | 架构纠偏：废弃独立渲染进程，复用前端路由；取消动态高度；简化后端进程管理；修复 localStorage 清理时机和快捷键逻辑；优化打包体积 |
| v1.2 | 2026-03-26 | Bug 修复：(1) localStorage 清理改用 did-finish-load 确保时机正确；(2) 移除 storage event 中错误的 id 判断，修复流式输出无法跨窗口同步的问题；(3) 明确前端必须使用 HashRouter，开发环境 URL 同样带 # 前缀 |

---

**文档版本**: v1.2
**创建日期**: 2026-03-26
**最后更新**: 2026-03-26