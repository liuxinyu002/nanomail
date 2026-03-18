# Plan 2 Phase 5: 新建列功能

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **前置阶段**: Phase 4 - 颜色选择器
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

**实现添加新列功能，允许用户在看板中创建新的列**

---

## 二、交互设计

### 2.1 New List 按钮位置

**位置**：在滚动区域内，作为最后一个"虚拟列"显示

```
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│    Todo     │ │ In Progress │ │    Done     │ │   + New List    │
│             │ │             │ │             │ │   (Ghost Btn)   │
│  [items]    │ │  [items]    │ │  [items]    │ │                 │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────────┘
```

### 2.2 Ghost Button 样式

**视觉规范**：
- 边框：`border-2 border-dashed border-gray-300`
- 背景：`bg-transparent` 或 `hover:bg-gray-50`
- 文字：`text-gray-500 hover:text-gray-700`
- **宽度**：**固定宽度 `w-[280px] flex-shrink-0`**，与普通看板列保持绝对一致，防止用户输入列名时发生横向跳动（Layout Shift）

### 2.3 点击行为

1. 弹出 Popover 或内联 Input
2. 输入列名
3. 调用 `useCreateBoardColumnMutation`
4. 自动设置 `order` 为当前最大值 + 1

---

## 三、技术实现

### 3.1 NewListButton 组件实现

```typescript
// packages/frontend/src/features/todos/NewListButton.tsx
import { useState } from 'react'
import { Plus, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NewListButtonProps {
  onCreateColumn: (name: string) => void
}

export function NewListButton({ onCreateColumn }: NewListButtonProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = () => {
    if (name.trim()) {
      onCreateColumn(name.trim())
      setName('')
      setIsEditing(false)
    }
  }

  const handleCancel = () => {
    setName('')
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div
        className={cn(
          // 固定宽度，与普通看板列一致
          "w-[280px] flex-shrink-0",
          "h-full border-2 border-dashed border-primary bg-background",
          "flex flex-col p-3 gap-2 rounded-lg"
        )}
      >
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter list name..."
          className="w-full px-2 py-1 text-sm border rounded"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleCreate()
            if (e.key === 'Escape') handleCancel()
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 text-xs border rounded"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
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

### 3.2 布局防抖动要点

**关键样式**：
- `w-[280px]`：固定宽度，与 BoardColumn 一致
- `flex-shrink-0`：禁止压缩，确保宽度恒定
- 输入列名时替换为同宽度容器，维持视觉稳定

### 3.3 集成到 BoardPanel

```typescript
// BoardPanel.tsx
import { NewListButton } from './NewListButton'
import { useCreateBoardColumnMutation } from '@/hooks/useBoardColumns'

export function BoardPanel() {
  const createColumn = useCreateBoardColumnMutation()

  const handleCreateColumn = async (name: string) => {
    // 计算新列 order 值
    const maxOrder = columns.reduce((max, col) => Math.max(max, col.order), 0)

    await createColumn.mutateAsync({
      name,
      order: maxOrder + 1,
      color: null
    })
  }

  return (
    <div className="flex h-full overflow-x-auto">
      {columns.map((column) => (
        <BoardColumnDroppable key={column.id} column={column} />
      ))}
      <NewListButton onCreateColumn={handleCreateColumn} />
    </div>
  )
}
```

---

## 四、任务清单

### 4.1 创建 NewListButton 组件

**文件路径**: `packages/frontend/src/features/todos/NewListButton.tsx`

**实现内容**：
- Ghost Button 样式
- 点击切换到编辑模式
- 内联 Input 输入列名
- Enter 创建、Escape 取消

### 4.2 集成到 BoardPanel

**修改文件**: `packages/frontend/src/features/todos/BoardPanel.tsx`

**实现内容**：
- 作为"虚拟列"显示在最后
- 在滚动区域内
- 计算新列 order 值
- 调用 `useCreateBoardColumnMutation`

### 4.3 默认值处理

**创建逻辑**：
- 计算新列 order 值（当前最大值 + 1）
- 默认颜色为 null（灰色）
- 创建后自动聚焦到新列

---

## 五、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 新建 | `packages/frontend/src/features/todos/NewListButton.tsx` | 新建列按钮组件（固定宽度，防布局跳动） |
| 修改 | `packages/frontend/src/features/todos/BoardPanel.tsx` | 添加 NewListButton 和列管理逻辑 |

---

## 六、依赖说明

### 6.1 现有依赖（无需新增）

| 依赖 | 用途 |
|------|------|
| `lucide-react` | 图标（Plus, Check, X 等） |
| `@nanomail/shared` | CreateBoardColumn 类型 |
| `hooks/useBoardColumns` | 列管理 Mutations |

---

## 七、验收标准

- [ ] "New List" 按钮显示在列末尾
- [ ] 按钮固定宽度，不产生布局跳动
- [ ] 可以创建新列
- [ ] 新列 order 值正确
- [ ] Enter 创建、Escape 取消

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| NewListButton 布局跳动 | 用户输入时界面闪烁 | 固定宽度 `w-[280px] flex-shrink-0`，禁止自适应 |

---

## 九、后续阶段

完成本阶段后，进入：
- **Phase 6**: 删除列与任务迁移（实现删除列并迁移任务到 Inbox）