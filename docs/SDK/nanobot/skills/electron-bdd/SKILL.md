---
name: electron-bdd
description: "Electron BDD工作流：类型优先 → BDD行为拆解 → 增量编码 → 人工验证。适用于主进程/渲染进程/预加载脚本开发。"
metadata:
  nanobot:
    emoji: "🔄"
    triggers:
      - "实现Electron功能"
      - "开发主进程"
      - "开发预加载脚本"
      - "IPC通信"
      - "悬浮窗"
---

# Electron BDD 工作流

**【核心定位】**
你当前的职责是**高级执行者（Coder）**。人类开发者已经为你提供了详细的设计方案（包含了架构、文件路径、核心代码结构等）。你的任务是**严格、连贯地一次性实现方案中的所有代码**，并确保代码质量。

---

## 【开发原则】

1. **绝对禁止过度设计**：严格按照人类提供的方案编码。不要擅自添加方案外的高级功能或复杂设计。
2. **禁止编写 UI/系统级测试脚本**：当前处于 MVP 阶段，不要使用 TDD，不要编写针对 UI 渲染、Electron 原生窗口、DOM 交互的自动化测试（如 Jest, React Testing Library, Playwright 等）。
3. **一次性执行，无需停顿**：不要在开发过程中停下来询问人类意见。一次性将整个方案的任务写完（如果受限于单次输出长度，说明后续输出计划即可）。

---

## Step 1: Type-First（契约与类型优先）

**在生成具体业务代码前，先明确并输出前/后端交互的 TypeScript 类型契约。**

### 1.1 优先声明类型

定义以下内容：

- **接口（Interface）**：API 方法签名
- **数据结构**：请求/响应的 DTO
- **全局扩展**：`window.electronAPI` 类型声明
- **IPC Channel 签名**：主进程与渲染进程通信的频道名称和载荷类型

### 1.2 利用静态检查

依靠 TypeScript 编译器确保主进程与渲染进程的参数对齐：

```typescript
// 示例：shared/types/electron.d.ts
export interface ElectronAPI {
  windowManager: {
    showFloatWindow: () => Promise<void>
    hideFloatWindow: () => Promise<void>
  }
}

declare global {
  interface Window {
    electronAPI: ElectronAPI
  }
}
```

### 1.3 类型定义位置

**所有共享类型必须定义在 `@nanomail/shared` 包中**，遵循项目的 [单一事实来源原则](../../../CLAUDE.md)。

---

## Step 2: Continuous Coding（严格执行编码）

**按照方案列出的顺序连续输出完整的代码实现。**

### 2.1 编码顺序

通常按照以下层次顺序实现：

1. **底层/主进程层**
   - BrowserWindow 实例化
   - IPC 处理器注册
   - 窗口生命周期管理

```typescript
// 示例：main/windowManager.ts
export function createFloatWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 300,
    height: 400,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  return win
}
```

2. **桥接层**
   - preload.ts 暴露 API
   - ipc.ts 定义 handlers

```typescript
// preload.ts
contextBridge.exposeInMainWorld('electronAPI', {
  windowManager: {
    showFloatWindow: () => ipcRenderer.invoke('window:show-float'),
    hideFloatWindow: () => ipcRenderer.invoke('window:hide-float')
  }
})
```

3. **前端/UI层**
   - React 组件接入调用
   - 状态管理
   - 用户交互

```tsx
// FloatWindowController.tsx
export function FloatWindowController() {
  const handleShow = async () => {
    await window.electronAPI.windowManager.showFloatWindow()
  }
  return <button onClick={handleShow}>显示悬浮窗</button>
}
```

### 2.2 编码要求

- 确保导入路径正确
- 确保没有丢失方案中强调的关键点（如 `HashRouter` 使用）
- 确保类型定义与实现一致

---

## Step 3: BDD 行为自检与验收清单提炼

**在代码实现完成后，使用 BDD 思想提炼出人类用于手动测试的验收清单。**

### 3.1 Given-When-Then 场景格式

将方案中的需求转化为可验证的行为场景：

```markdown
- [ ] **场景 1 (描述场景名称)**:
  - **Given**: [前置条件，如"打开了悬浮窗"]
  - **When**: [用户动作，如"点击 Hide 按钮"]
  - **Then**: [预期结果，如"悬浮窗立刻消失"]
```

### 3.2 场景覆盖要点

- 正常流程场景
- 边界条件场景
- 异常处理场景（如有）

---

## Step 4: Final Report（交付与风险报告）

**输出完所有代码后，必须提供一份总结报告。**

### 4.1 强制输出格式

```markdown
### ✅ 执行结果总结
我已经严格按照方案完成了所有的编码任务，涉及以下文件：
- `xxx/xxx.ts` (描述作用)
- `xxx/xxx.tsx` (描述作用)

---

### 🧪 人类手动验证清单 (BDD 验收场景)
请开发者运行应用后，手动验证以下场景以确保功能符合 MVP 预期：
- [ ] **场景 1 (描述场景名称)**:
  - **Given**: [前置条件，如"打开了悬浮窗"]
  - **When**: [用户动作，如"点击 Hide 按钮"]
  - **Then**: [预期结果，如"悬浮窗立刻消失"]
- [ ] **场景 2**: ...

---

### ⚠️ 潜在风险点与注意事项
*(请 Agent 结合系统特性、Electron 机制或前端框架，指出可能的问题。如果没有则写"无显著风险"。)*
1. **[平台差异风险]**: 例如，macOS 全屏模式下的置顶行为差异。
2. **[依赖风险]**: 例如，前端路由协议从 BrowserRouter 切换到 HashRouter 可能带来的路径解析问题。
3. **[性能/样式风险]**: 例如，CSS 透明度或拖拽热区在特定分辨率下可能失效的情况。
```

### 4.2 风险评估要点

结合以下方面评估潜在风险：
- **平台差异**：macOS/Windows/Linux 行为差异
- **Electron 机制**：窗口管理、进程通信、安全限制
- **前端框架**：路由、状态管理、渲染时机

---

## 完整工作流示例

```
┌─────────────────────────────────────────────────────────────┐
│  Step 1: Type-First                                         │
│  ├── 输出 TypeScript 类型契约                               │
│  └── 确保编译通过                                           │
│                                                              │
│  Step 2: Continuous Coding                                   │
│  ├── 主进程层实现 (BrowserWindow + IPC handlers)            │
│  ├── 桥接层实现 (preload + API 暴露)                        │
│  └── 前端层实现 (React 组件 + 状态管理)                     │
│                                                              │
│  Step 3: BDD 验收清单                                       │
│  └── 输出 Given-When-Then 手动测试场景                      │
│                                                              │
│  Step 4: Final Report                                        │
│  ├── 执行结果总结                                           │
│  ├── 人类手动验证清单                                       │
│  └── 潜在风险点与注意事项                                   │
│                                                              │
│  ✅ 交付完成，等待人类验证                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 快速启动

当用户请求开发 Electron 功能时，按以下顺序执行：

1. **声明**："我将按照 Electron BDD 工作流执行，共 4 步。"
2. 执行 Step 1（输出类型契约）
3. 执行 Step 2（连续输出所有代码）
4. 执行 Step 3（输出 BDD 验收清单）
5. 执行 Step 4（输出最终报告）
6. 等待人类验证反馈