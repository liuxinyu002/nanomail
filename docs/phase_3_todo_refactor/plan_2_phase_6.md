# Plan 2 Phase 6: 删除列与任务迁移

> **文档版本**: v1.0
> **创建日期**: 2026-03-18
> **所属计划**: Plan 2 - Todo 模块增强
> **前置阶段**: Phase 5 - 新建列功能
> **预估时间**: 2h

---

## 一、计划背景

### 1.1 总体目标

在 Plan 1 实现的三面板界面基础上，新增两个增强功能：

| 功能 | 目标 |
|------|------|
| **面板可调整宽度** | 用户可通过拖拽分隔条调整 Inbox、Planner、Board 面板宽度，宽度持久化到 localStorage |
| **看板列管理** | 支持新建列、重命名、更改颜色、删除列，删除时自动迁移任务到 Inbox |

### 1.2 本阶段目标

**实现删除列并自动迁移任务到 Inbox**

---

## 二、交互设计

### 2.1 删除流程

```
用户点击删除菜单项
        ↓
弹出确认对话框（AlertDialog）
        ↓
    用户确认？
   /        \
  否         是
  ↓          ↓
关闭对话框   执行删除
              ↓
         迁移任务到 Inbox
              ↓
         删除列记录
              ↓
         显示 Toast 提示
```

### 2.2 确认对话框设计

```
┌─────────────────────────────────────────────┐
│  Delete List?                               │
│                                             │
│  "In Progress" contains 5 tasks.            │
│  These tasks will be moved to Inbox.        │
│                                             │
│  This action cannot be undone.              │
│                                             │
│               [Cancel]  [Delete]            │
└─────────────────────────────────────────────┘
```

**对话框内容**：
- 标题：`Delete List?`
- 说明：显示列名和任务数量
- 提示：任务将迁移到 Inbox
- 警告：操作不可撤销
- 按钮：Cancel（次要） + Delete（红色危险按钮）

### 2.3 Toast 通知

**成功删除后显示**：
```
✓ 5 tasks moved to Inbox
```

---

## 三、技术实现

### 3.1 前端删除确认

**使用 AlertDialog 组件**：

```typescript
// ColumnHeader.tsx
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const [showDeleteDialog, setShowDeleteDialog] = useState(false)
const [isDeleting, setIsDeleting] = useState(false)

// 删除按钮点击
const handleDeleteClick = () => {
  setShowDeleteDialog(true)
}

// 确认删除
const handleConfirmDelete = async () => {
  setIsDeleting(true)
  try {
    await onDelete()
    toast.success(`${itemCount} tasks moved to Inbox`)
  } catch (error) {
    toast.error('Failed to delete list')
  } finally {
    setIsDeleting(false)
    setShowDeleteDialog(false)
  }
}

// AlertDialog 渲染
<AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Delete List?</AlertDialogTitle>
      <AlertDialogDescription>
        "{column.name}" contains {itemCount} tasks.
        <br />
        These tasks will be moved to Inbox.
        <br />
        <strong>This action cannot be undone.</strong>
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction
        onClick={handleConfirmDelete}
        disabled={isDeleting}
        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### 3.2 后端删除逻辑更新

**文件路径**: `packages/backend/src/routes/boardColumn.routes.ts`

**实现要点**：
- 删除列前，将该列所有 todos 的 `boardColumnId` 设为 1（Inbox）
- 使用事务保证原子性
- 返回迁移的任务数量

**伪代码实现**：

```typescript
// packages/backend/src/routes/boardColumn.routes.ts
import { dataSource } from '../config/database'
import { Todo } from '../entities/Todo.entity'
import { BoardColumn } from '../entities/BoardColumn.entity'

router.delete('/:id', async (req, res, next) => {
  const id = parseInt(req.params.id, 10)

  // 不允许删除 Inbox 列（id = 1）
  if (id === 1) {
    return res.status(400).json({ error: 'Cannot delete Inbox column' })
  }

  try {
    const result = await dataSource.transaction(async (manager) => {
      // 1. 获取该列的任务数量
      const todoCount = await manager.getRepository(Todo).count({
        where: { boardColumnId: id }
      })

      // 2. 将该列所有 todos 迁移到 Inbox
      await manager.getRepository(Todo).update(
        { boardColumnId: id },
        { boardColumnId: 1 } // Inbox
      )

      // 3. 删除列
      await manager.getRepository(BoardColumn).delete(id)

      return { todoCount }
    })

    // 返回迁移的任务数量
    res.status(200).json({
      message: `Column deleted, ${result.todoCount} tasks moved to Inbox`,
      movedTasks: result.todoCount
    })
  } catch (error) {
    next(error)
  }
})
```

### 3.3 前端 Mutation 调用

```typescript
// hooks/useBoardColumns.ts
const deleteColumn = useMutation({
  mutationFn: async (columnId: number) => {
    const response = await apiClient.delete(`/board-columns/${columnId}`)
    return response.data
  },
  onSuccess: (data) => {
    // 刷新列列表
    queryClient.invalidateQueries({ queryKey: ['boardColumns'] })
    // 刷新 todos 列表
    queryClient.invalidateQueries({ queryKey: ['todos'] })
  }
})
```

---

## 四、任务清单

### 4.1 前端删除确认

**修改文件**: `packages/frontend/src/features/todos/ColumnHeader.tsx`

**实现内容**：
- 使用 `AlertDialog` 组件
- 显示将被迁移的任务数量的动态文案
- 删除中和删除后的状态处理

### 4.2 后端删除逻辑更新

**修改文件**: `packages/backend/src/routes/boardColumn.routes.ts`

**实现内容**：
- 删除列前迁移 todos 到 Inbox
- 使用事务保证原子性
- 返回迁移的任务数量

### 4.3 Toast 通知

**集成到删除流程**：
- 成功：显示 "X tasks moved to Inbox"
- 失败：显示错误信息

---

## 五、文件变更清单

| 操作 | 文件路径 | 用途 |
|------|----------|------|
| 修改 | `packages/frontend/src/features/todos/ColumnHeader.tsx` | 添加删除确认对话框 |
| 修改 | `packages/backend/src/routes/boardColumn.routes.ts` | 删除列时自动迁移 todos 到 Inbox |
| 修改 | `packages/frontend/src/hooks/useBoardColumns.ts` | 更新删除 Mutation |

---

## 六、依赖说明

### 6.1 现有依赖（无需新增）

| 依赖 | 用途 |
|------|------|
| `@radix-ui/react-alert-dialog` | 删除确认对话框 |
| `sonner` | Toast 通知 |

---

## 七、验收标准

- [ ] 点击删除弹出确认对话框
- [ ] 对话框显示正确的任务数量
- [ ] 确认后任务自动迁移到 Inbox
- [ ] 列被正确删除
- [ ] 用户收到 Toast 通知
- [ ] 无法删除 Inbox 列

---

## 八、风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 删除列时数据丢失 | 用户误删 | 强制确认对话框，显示任务数量 |
| 事务失败 | 数据不一致 | 使用数据库事务，失败时回滚 |

---

## 九、后续阶段

完成本阶段后，进入：
- **Phase 7**: 测试与完善（完善测试覆盖率和边界情况）