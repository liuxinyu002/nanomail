# Plan 2 Phase 1: 面板可调整宽度基础架构

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **预估时间**: 1-2h

---

## 一、计划背景

### 1.1 总体目标

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

### 1.2 本阶段目标

**使用 `react-resizable-panels` 实现面板宽度调整功能**

> **变更说明**：原计划使用原生拖拽事件，现改为使用 `react-resizable-panels` 库，大幅简化实现复杂度。

---

## 二、交互设计

```
┌──────────────┬─┬────────────────┬─┬──────────────────┐
│    Inbox     │ │    Planner     │ │      Board       │
│   (280px)    │ │    (320px)     │ │     (280px)      │
│              │ │                │ │                  │
│              │ │                │ │                  │
└──────────────┴─┴────────────────┴─┴──────────────────┘
               ↑                   ↑
           Divider 1           Divider 2
         (8px hitbox)         (8px hitbox)
```

**分隔条行为**：
- 默认状态：完全透明，不可见
- Hover 状态：显示 1-2px 高亮线，光标变为 `col-resize`
- 拖拽中：实时更新面板宽度
- 拖拽边界：受最小宽度限制，无法继续压缩

---

## 三、技术实现

### 3.1 技术选型

| 要点 | 实现 |
|------|------|
| 拖拽库 | **`react-resizable-panels`**（必须依赖），避免手写拖拽带来的边界碰撞、文本选中干扰等技术债 |
| 宽度存储 | `react-resizable-panels` 内置 `autoSaveId` 支持，自动持久化到 localStorage |
| 最小宽度 | 通过 `minSize` / `minWidth` 属性配置，库自动处理约束 |
| Handle 样式 | 通过 Tailwind 覆盖：透明热区 + Hover 显示 1-2px 高亮细线 |
| 响应式 | 库自动处理窗口 resize，无需手动监听 |

**为什么选择 `react-resizable-panels`**：
- 原生 `mousedown/mousemove/mouseup` 实现面临繁琐的边界碰撞、文本意外选中干扰（user-select）、窗口 Resize 时的重新平衡 BUG
- 该库已处理所有边界情况，提供鲁棒的比例与约束管理
- 我们只需覆盖 Handle 样式即可实现设计稿中的"透明热区 + Hover 高亮细线"效果

### 3.2 数据结构

```typescript
// localStorage 存储结构
interface PanelWidths {
  inbox: number    // 像素值
  planner: number  // 像素值
  board: number    // 像素值
}

// 默认值
const DEFAULT_PANEL_WIDTHS: PanelWidths = {
  inbox: 320,
  planner: 400,
  board: 400
}

// 最小宽度约束
const MIN_PANEL_WIDTHS = {
  inbox: 280,
  planner: 320,
  board: 280
}
```

---

## 四、任务清单

### 4.1 安装依赖

```bash
pnpm --filter @nanomail/frontend add react-resizable-panels
```

### 4.2 创建 ResizablePanels 容器组件

**文件路径**: `packages/frontend/src/features/todos/ResizablePanels.tsx`

**实现要点**：
- 封装 `PanelGroup`、`Panel`、`PanelResizeHandle`
- 配置 `autoSaveId="nanomail-todo-panels"` 自动持久化
- 设置最小宽度约束 (`minSize`)

**组件实现参考**：

```typescript
// packages/frontend/src/features/todos/ResizablePanels.tsx
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { cn } from '@/lib/utils'

interface ResizablePanelsProps {
  children: React.ReactNode
  className?: string
}

// 使用示例
<PanelGroup
  direction="horizontal"
  autoSaveId="nanomail-todo-panels"
  className="h-full"
>
  <Panel defaultSize={25} minSize={15} className="min-w-[280px]">
    <InboxPanel />
  </Panel>

  <PanelResizeHandle className={cn(
    "w-2 group relative",
    "before:absolute before:inset-y-0 before:left-1/2 before:w-0.5",
    "before:bg-transparent hover:before:bg-border",
    "before:transition-colors cursor-col-resize"
  )} />

  <Panel defaultSize={35} minSize={20} className="min-w-[320px]">
    <PlannerPanel />
  </Panel>

  <PanelResizeHandle className={cn(
    "w-2 group relative",
    "before:absolute before:inset-y-0 before:left-1/2 before:w-0.5",
    "before:bg-transparent hover:before:bg-border",
    "before:transition-colors cursor-col-resize"
  )} />

  <Panel defaultSize={40} minSize={20} className="min-w-[280px]">
    <BoardPanel />
  </Panel>
</PanelGroup>
```

### 4.3 自定义 Handle 样式

**样式说明**：
- `w-2`：8px 透明热区
- `before:bg-transparent hover:before:bg-border`：默认透明，Hover 显示高亮线
- `cursor-col-resize`：拖拽光标

### 4.4 更新 TodosPage.tsx

**文件路径**: `packages/frontend/src/pages/TodosPage.tsx`

**修改内容**：替换现有 flex 布局为 `ResizablePanels`

---

## 五、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 新建 | `packages/frontend/src/features/todos/ResizablePanels.tsx` | 基于 `react-resizable-panels` 封装的面板容器组件 |
| 修改 | `packages/frontend/src/pages/TodosPage.tsx` | 替换 flex 布局为 `ResizablePanels` |
| 修改 | `packages/frontend/package.json` | 新增 `react-resizable-panels` 依赖 |

---

## 六、依赖说明

### 6.1 新增依赖（必须）

| 依赖 | 用途 | 说明 |
|------|------|------|
| `react-resizable-panels` | 专业级面板宽度调整 | 避免手写拖拽带来的边界碰撞、文本选中干扰、窗口 Resize BUG 等技术债 |

---

## 七、验收标准

- [ ] 可以拖拽分隔条调整宽度
- [ ] 宽度自动持久化到 localStorage
- [ ] 刷新页面后保持设置
- [ ] Handle 样式符合设计稿（透明热区 + Hover 高亮细线）

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `react-resizable-panels` 兼容性 | 潜在的库 bug 或版本问题 | 库维护活跃，Star 数高，已在大量生产项目验证 |

---

## 九、后续阶段

完成本阶段后，进入：
- **Phase 2**: 面板宽度边界处理（验证并微调边界行为）