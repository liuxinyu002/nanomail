# Plan 2: Todo 模块增强 - 面板可调整宽度 + 看板列管理

> **文档版本**: v1.1
> **创建日期**: 2026-03-17
> **更新日期**: 2026-03-17
> **依赖**: Plan 1 (Todo 模块重构)

---

## 一、目标概述

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

---

## 二、功能详细设计

### 2.1 面板可调整宽度

#### 2.1.1 交互设计

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

#### 2.1.2 技术实现要点

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

#### 2.1.3 数据结构

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

### 2.2 看板列管理

#### 2.2.1 新建列（New List 按钮）

**位置**：在滚动区域内，作为最后一个"虚拟列"显示

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│    Todo     │ │ In Progress │ │    Done     │ │   + New List    │
│             │ │             │ │             │ │   (Ghost Btn)   │
│  [items]    │ │  [items]    │ │  [items]    │ │                 │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘
```

**样式**：Ghost Button 风格
- 边框：`border-2 border-dashed border-gray-300`
- 背景：`bg-transparent` 或 `hover:bg-gray-50`
- 文字：`text-gray-500 hover:text-gray-700`
- **宽度**：**固定宽度 `w-[280px] flex-shrink-0`**，与普通看板列保持绝对一致，防止用户输入列名时发生横向跳动（Layout Shift）

**点击行为**：
1. 弹出 Popover 或内联 Input
2. 输入列名
3. 调用 `useCreateBoardColumnMutation`
4. 自动设置 `order` 为当前最大值 + 1

#### 2.2.2 列头菜单

**触发方式**：Hover 列头时显示设置按钮（`MoreHorizontal` 或 `Settings` 图标）

```
┌─────────────────────────────────┐
│  ● Todo                    [⋮] │  ← Hover 时显示按钮
└─────────────────────────────────┘
                                  ↓ 点击
                            ┌──────────────┐
                            │ Rename       │
                            │ Change Color │
                            │──────────────│
                            │ Delete       │  ← 红色
                            └──────────────┘
```

**Popover 交互规范（极简风格）**：
- **禁止遮罩**：展开时底层的 BoardPanel 不添加任何深色遮罩（Overlay）或模糊效果（Blur）
- **层级区分**：仅通过 `shadow-md` 阴影区分层级
- **关闭方式**：点击外部区域（Click outside）即刻静默关闭
- **目的**：保持轻量级的气泡菜单体验，避免打断用户视觉焦点

#### 2.2.3 内联重命名

**触发方式**：双击列头文字区域

```
┌─────────────────────────────────┐
│  ● [_______________]       3   │  ← Input 聚焦，全选文字
└─────────────────────────────────┘
```

**行为**：
- Enter 或失焦：保存修改
- Escape：取消修改

#### 2.2.4 颜色选择器

**预设颜色**（柔和色调）：

| 颜色名 | Hex 值 | Tailwind 类 |
|--------|--------|-------------|
| Gray | `#E5E7EB` | `bg-gray-200` |
| Blue | `#DBEAFE` | `bg-blue-100` |
| Green | `#D1FAE5` | `bg-green-100` |
| Yellow | `#FEF3C7` | `bg-yellow-100` |
| Purple | `#EDE9FE` | `bg-purple-100` |
| Pink | `#FCE7F3` | `bg-pink-100` |

**UI 实现**：
```
┌───────────────────────────────┐
│ Column Color                  │
├───────────────────────────────┤
│  ○     ○     ○     ○     ○   │  ← 颜色圆点选择器
│ Gray Blue Grn Yell Prpl Pink  │
└───────────────────────────────┘
```

#### 2.2.5 删除列

**流程**：
1. 点击删除菜单项
2. 弹出确认对话框（Alert Dialog）
3. 确认后：
   - 将该列所有 todos 的 `boardColumnId` 设为 1 (Inbox)
   - 删除列
   - 显示 Toast 提示

**后端处理**（需要新增）：
- 删除列时，自动迁移该列下的 todos 到 Inbox
- 或者前端先批量更新 todos，再删除列

---

## 三、文件变更清单

### 3.1 新建文件

| 文件路径 | 用途 |
|----------|------|
| `packages/frontend/src/features/todos/ResizablePanels.tsx` | 基于 `react-resizable-panels` 封装的面板容器组件 |
| `packages/frontend/src/features/todos/ColumnHeader.tsx` | 列头组件（含菜单、重命名） |
| `packages/frontend/src/features/todos/ColorPicker.tsx` | 颜色选择器组件 |
| `packages/frontend/src/features/todos/NewListButton.tsx` | 新建列按钮组件（固定宽度，防布局跳动） |
| `packages/frontend/src/features/todos/ResizablePanels.test.tsx` | 单元测试 |
| `packages/frontend/src/features/todos/ColumnHeader.test.tsx` | 单元测试 |
| `packages/frontend/src/features/todos/ColorPicker.test.tsx` | 单元测试 |

### 3.2 修改文件

| 文件路径 | 修改内容 |
|----------|----------|
| `packages/frontend/src/pages/TodosPage.tsx` | 替换 flex 布局为 `ResizablePanels`（基于 react-resizable-panels） |
| `packages/frontend/src/features/todos/BoardPanel.tsx` | 添加 `NewListButton`，传递列管理回调 |
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | 使用新的 `ColumnHeader`，支持背景色 |
| `packages/backend/src/routes/boardColumn.routes.ts` | 删除列时自动迁移 todos 到 Inbox |
| `packages/frontend/package.json` | 新增 `react-resizable-panels` 依赖 |

---

## 四、实现阶段

### Phase 1: 面板可调整宽度基础架构 (1-2h)

> **变更说明**：原计划使用原生拖拽事件，现改为使用 `react-resizable-panels` 库，大幅简化实现复杂度。

**目标**：使用 `react-resizable-panels` 实现面板宽度调整功能

**任务**：
1. 安装依赖
   ```bash
   pnpm --filter @nanomail/frontend add react-resizable-panels
   ```

2. 创建 `ResizablePanels` 容器组件
   - 封装 `PanelGroup`、`Panel`、`PanelResizeHandle`
   - 配置 `autoSaveId="nanomail-todo-panels"` 自动持久化
   - 设置最小宽度约束 (`minSize`)

3. 自定义 Handle 样式
   - 默认状态：完全透明（`opacity-0`）
   - Hover 状态：显示 1-2px 高亮线（`group-hover:opacity-100 bg-border`）
   - 光标：`cursor-col-resize`

4. 更新 `TodosPage.tsx`
   - 替换现有 flex 布局为 `ResizablePanels`

**验收标准**：
- [ ] 可以拖拽分隔条调整宽度
- [ ] 宽度自动持久化到 localStorage
- [ ] 刷新页面后保持设置
- [ ] Handle 样式符合设计稿（透明热区 + Hover 高亮细线）

---

### Phase 2: 面板宽度边界处理 (0.5-1h)

> **简化说明**：使用 `react-resizable-panels` 后，大部分边界处理由库自动完成。

**目标**：验证并微调边界行为

**任务**：
1. 验证最小宽度约束
   - 确认 `minSize` 配置生效
   - 测试拖拽到边界时的行为

2. 验证响应式行为
   - 测试窗口 resize 时的面板重新分配
   - 确认小屏幕下的表现

3. 单元测试
   - 测试组件渲染
   - 测试持久化恢复

**验收标准**：
- [ ] 无法将面板压缩到最小宽度以下
- [ ] 窗口 resize 时面板自动调整

---

### Phase 3: 列头组件重构 (2-3h)

**目标**：将 BoardColumnDroppable 的列头抽取为独立组件

**任务**：
1. 创建 `ColumnHeader` 组件
   - 显示列名和计数
   - 颜色指示器
   - Hover 显示设置按钮
   - 双击进入编辑模式

2. 实现内联重命名
   - Input 自动聚焦和全选
   - Enter 保存、Escape 取消
   - 失焦保存

3. 实现 Popover 菜单
   - 重命名选项
   - 更改颜色选项
   - 删除选项（红色警示）

**验收标准**：
- [ ] Hover 列头显示设置按钮
- [ ] 双击可编辑列名
- [ ] 菜单正确显示所有选项

---

### Phase 4: 颜色选择器 (1-2h)

**目标**：实现预设颜色选择功能

**任务**：
1. 创建 `ColorPicker` 组件
   - 6 个预设颜色圆点
   - 当前选中状态
   - 点击选择颜色

2. 集成到列头菜单
   - 点击"Change Color"显示颜色选择器
   - 选择后立即更新列颜色
   - 调用 `useUpdateBoardColumnMutation`

3. 更新 `BoardColumnDroppable`
   - 列背景色支持
   - 颜色指示器样式

**验收标准**：
- [ ] 可选择预设颜色
- [ ] 颜色立即应用到列背景

---

### Phase 5: 新建列功能 (1-2h)

**目标**：实现添加新列功能

**任务**：
1. 创建 `NewListButton` 组件
   - Ghost Button 样式
   - 点击弹出 Input 或内联编辑
   - 输入列名后创建

2. 集成到 `BoardPanel`
   - 作为"虚拟列"显示在最后
   - 在滚动区域内

3. 创建逻辑
   - 计算新列 order 值
   - 调用 `useCreateBoardColumnMutation`
   - 默认颜色（可选：随机或用户选择）

**验收标准**：
- [ ] "New List"按钮显示在列末尾
- [ ] 可以创建新列

---

### Phase 6: 删除列与任务迁移 (2h)

**目标**：实现删除列并迁移任务到 Inbox

**任务**：
1. 前端删除确认
   - 使用 `AlertDialog` 组件
   - 显示将被迁移的任务数量

2. 后端删除逻辑更新
   - 删除列前，将该列所有 todos 的 `boardColumnId` 设为 1
   - 使用事务保证原子性

3. Toast 通知
   - 显示 "X tasks moved to Inbox" 消息

**验收标准**：
- [ ] 删除列时任务自动迁移到 Inbox
- [ ] 用户收到通知

---

### Phase 7: 测试与完善 (2h)

**目标**：完善测试覆盖率和边界情况

**任务**：
1. 单元测试
   - ResizablePanels 测试
   - ColumnHeader 测试
   - ColorPicker 测试
   - NewListButton 测试

2. E2E 测试（可选）
   - 面板宽度调整流程
   - 列管理完整流程

3. 无障碍优化
   - 键盘导航支持
   - ARIA 标签

**验收标准**：
- [ ] 单元测试覆盖率 > 80%
- [ ] 键盘可完成主要操作

---

## 五、时间估算

| 阶段 | 预估时间 |
|------|----------|
| Phase 1: 面板宽度基础 | 1-2h |
| Phase 2: 边界处理 | 0.5-1h |
| Phase 3: 列头组件 | 2-3h |
| Phase 4: 颜色选择器 | 1-2h |
| Phase 5: 新建列 | 1-2h |
| Phase 6: 删除列 | 2h |
| Phase 7: 测试完善 | 2h |
| **总计** | **9.5-14h** |

> **时间节省说明**：使用 `react-resizable-panels` 替代原生拖拽实现，Phase 1-2 时间从 3-5h 缩减至 1.5-3h，节省约 2h。

---

## 六、依赖说明

### 6.1 现有依赖（无需新增）

| 依赖 | 用途 |
|------|------|
| `@radix-ui/react-popover` | 列头菜单弹出 |
| `@radix-ui/react-dropdown-menu` | 菜单项 |
| `@radix-ui/react-alert-dialog` | 删除确认对话框 |
| `lucide-react` | 图标（Settings, Plus, Trash2 等） |
| `sonner` | Toast 通知 |

### 6.2 新增依赖（必须）

| 依赖 | 用途 | 说明 |
|------|------|------|
| `react-resizable-panels` | 专业级面板宽度调整 | 避免手写拖拽带来的边界碰撞、文本选中干扰、窗口 Resize BUG 等技术债 |

> **决策依据**：原生 `mousedown/mousemove/mouseup` 实现面板拖拽需要处理大量边界情况，容易产生技术债。`react-resizable-panels` 已在底层处理了所有复杂逻辑，我们只需通过 Tailwind 覆盖 Handle 样式即可实现设计稿中的"透明热区 + Hover 高亮细线"效果。

---

## 七、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| `react-resizable-panels` 兼容性 | 潜在的库 bug 或版本问题 | 库维护活跃，Star 数高，已在大量生产项目验证 |
| 删除列时数据丢失 | 用户误删 | 强制确认对话框，可考虑"撤销"功能 |
| 颜色对比度问题 | 文字难以辨认 | 预设颜色经过对比度测试 |
| NewListButton 布局跳动 | 用户输入时界面闪烁 | 固定宽度 `w-[280px] flex-shrink-0`，禁止自适应 |

---

## 八、后续优化（不在本计划范围）

1. **撤销删除**：删除列后提供 5 秒撤销窗口
2. **列排序拖拽**：支持拖拽调整列顺序
3. **自定义颜色**：允许用户输入任意颜色值
4. **面板折叠**：支持折叠某个面板到最小状态
5. **布局预设**：保存和切换多种布局配置

---

## 九、关键实现细节

### 9.1 ResizablePanels 组件实现

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

**Handle 样式说明**：
- `w-2`：8px 透明热区
- `before:bg-transparent hover:before:bg-border`：默认透明，Hover 显示高亮线
- `cursor-col-resize`：拖拽光标

### 9.2 ColumnHeader 组件签名

```typescript
interface ColumnHeaderProps {
  column: BoardColumn
  itemCount: number
  onRename: (name: string) => void
  onColorChange: (color: string | null) => void
  onDelete: () => void
  isEditing?: boolean
  onStartEdit?: () => void
  onEndEdit?: () => void
}
```

**Popover 极简交互实现**：
```typescript
// 列头菜单 Popover 配置
<Popover>
  <PopoverTrigger asChild>
    <button className="opacity-0 group-hover:opacity-100">
      <MoreHorizontal className="w-4 h-4" />
    </button>
  </PopoverTrigger>
  <PopoverContent
    className="w-48 p-1 shadow-md"  // 仅阴影，无遮罩
    // 不要设置 modal={true}，保持轻量气泡体验
  >
    {/* 菜单项 */}
  </PopoverContent>
</Popover>
```

> **交互规范**：
> - 无 Overlay/Blur 背景
> - 仅 `shadow-md` 区分层级
> - 点击外部静默关闭（Radix Popover 默认行为）

### 9.3 后端数据模型确认

**`color` 字段已存在**：
- `packages/backend/src/entities/BoardColumn.entity.ts`：`@Column({ type: 'text', nullable: true }) color!: string | null`
- `packages/shared/src/schemas/boardColumn.ts`：`color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).nullable()`

> **注意**：Plan 1 已包含 `color` 字段，无需额外数据库迁移。本计划只需实现前端颜色选择与更新逻辑。

### 9.4 后端删除列逻辑（伪代码）

```typescript
// packages/backend/src/routes/boardColumn.routes.ts
router.delete('/:id', async (req, res, next) => {
  const id = parseInt(req.params.id, 10)

  await dataSource.transaction(async (manager) => {
    // 1. 将该列所有 todos 迁移到 Inbox
    await manager.getRepository(Todo).update(
      { boardColumnId: id },
      { boardColumnId: 1 } // Inbox
    )

    // 2. 删除列
    await manager.getRepository(BoardColumn).delete(id)
  })

  res.status(204).send()
})
```

### 9.5 NewListButton 组件实现

```typescript
// packages/frontend/src/features/todos/NewListButton.tsx
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewListButtonProps {
  onCreateColumn: (name: string) => void
}

// 关键样式：固定宽度，防止布局跳动
export function NewListButton({ onCreateColumn }: NewListButtonProps) {
  return (
    <button
      className={cn(
        // 固定宽度，与普通看板列一致
        "w-[280px] flex-shrink-0",
        // Ghost Button 样式
        "h-full border-2 border-dashed border-gray-300",
        "bg-transparent hover:bg-gray-50",
        "text-gray-500 hover:text-gray-700",
        "flex items-center justify-center gap-2",
        "rounded-lg transition-colors"
      )}
    >
      <Plus className="w-4 h-4" />
      <span>New List</span>
    </button>
  )
}
```

**布局防抖动要点**：
- `w-[280px]`：固定宽度，与 BoardColumn 一致
- `flex-shrink-0`：禁止压缩，确保宽度恒定
- 输入列名时替换为同宽度 Input，维持视觉稳定

---

## 十、关键文件清单

| 文件 | 用途 |
|------|------|
| `packages/frontend/src/pages/TodosPage.tsx` | 主页面，需要替换为 ResizablePanels 布局 |
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | 列组件，需要集成新的 ColumnHeader 和背景色支持 |
| `packages/frontend/src/features/todos/BoardPanel.tsx` | Board 面板，需要添加 NewListButton 和列管理逻辑 |
| `packages/frontend/src/hooks/useBoardColumns.ts` | 现有 Hook，列管理操作的参考模式 |
| `packages/backend/src/routes/boardColumn.routes.ts` | 后端路由，需要更新删除逻辑以支持任务迁移 |