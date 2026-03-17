# Plan 1: To-Do 模块重构 - 看板拖拽功能

> **快速参考文档** - 详细方案见 [plan_1_todo_refactor.md](./plan_1_todo_refactor.md)

---

## 核心目标

将 Todo 模块从单一列表视图重构为**三面板界面**：Inbox（收件箱）、Planner（日历）、Board（看板），支持跨面板拖拽。

---

## 关键架构决策

| 决策 | 说明 |
|------|------|
| **废除 urgency 字段** | 任务状态完全由 `boardColumnId` 决定，避免双优先级系统 |
| **Inbox 统一模型** | Inbox = Column ID 1，与其他 Column 完全统一，无 `null` 特殊处理 |
| **大整数位置算法** | `position` 字段使用 65536 步长，支持稳定排序和重新平衡 |
| **dnd-kit 库** | 选择理由：多容器支持、无障碍优先、轻量 |
| **乐观更新模式** | 拖拽时即时 UI 反馈，失败时回滚 |

---

## 数据库变更

### 新增表：`board_columns`

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | INTEGER PK | 主键 |
| `name` | TEXT | 列名 |
| `order` | INTEGER | 显示顺序 |
| `is_system` | INTEGER | 系统列（如 Inbox）不可删除 |

### 修改表：`todos`

| 变更 | 说明 |
|------|------|
| **新增** `board_column_id` | NOT NULL, 默认值 1（Inbox） |
| **新增** `position` | 排序位置 |
| **移除** `urgency` | 废弃，状态由 boardColumnId 决定 |

### 默认列配置

```
ID 1: 收件箱 (Inbox) - 系统列，不可删除
ID 2: 待处理 (Todo)
ID 3: 进行中 (In Progress)
ID 4: 已完成 (Done)
```

---

## 面板职责边界

| 面板 | 数据范围 | 关键逻辑 |
|------|----------|----------|
| **InboxPanel** | `boardColumnId === 1` | 唯一收件箱入口 |
| **PlannerPanel** | 所有有 deadline 的任务 | 日历视图，拖拽设置截止日期 |
| **BoardPanel** | `boardColumnId !== 1` | 排除 Inbox，仅显示业务流转列 |

---

## 拖拽行为矩阵

| 源 → 目标 | Inbox | Planner | Board Column |
|-----------|-------|---------|--------------|
| **Inbox** | - | 设置 deadline | 设置 boardColumnId + position |
| **Planner** | 设置 boardColumnId=1 | 更新 deadline | 设置 boardColumnId + position |
| **Board** | 设置 boardColumnId=1 | **视觉回弹** + 设置 deadline | 更新 position/boardColumnId |

### 关键交互：Board → Planner

```
拖拽时：任务卡片视觉回弹到原位置
数据更新：仅更新 deadline，boardColumnId 不变
刷新机制：通过 React Query 缓存失效刷新 Planner
```

---

## 乐观更新模式

```
拖拽结束 → 1. 即时 UI 更新 (setQueryData)
         → 2. 异步 Mutation 发送请求
         → 3a. 成功: invalidateQueries 同步
         → 3b. 失败: 回滚到快照状态
```

**关键步骤**：
1. `queryClient.cancelQueries()` - 取消进行中的请求
2. 快照当前状态 - 用于失败回滚
3. `setQueryData` - 即时更新 UI
4. `onError` 回滚 - 失败时恢复快照

---

## 实现阶段

| 阶段 | 内容 | 预估时间 |
|------|------|----------|
| Phase 1 | Backend Foundation (Entity, Routes, Schema) | 3-4h |
| Phase 2 | Frontend DnD Setup (dnd-kit, Context, Utils) | 4-5h |
| Phase 3 | UI Components (Panels, Toggle) | 5-6h |
| Phase 4 | Service Layer (API, Hooks) | 2-3h |
| Phase 5 | Testing (Unit, E2E, A11y) | 4-5h |
| **总计** | | **18-23h** |

---

## 关键文件清单

### 后端
- `entities/BoardColumn.entity.ts` - 新建
- `entities/Todo.entity.ts` - 修改（添加字段）
- `routes/boardColumn.routes.ts` - 新建
- `routes/todo.routes.ts` - 修改（添加 position 端点）

### 共享模块
- `schemas/boardColumn.ts` - 新建
- `schemas/todo.ts` - 修改（添加字段）

### 前端
- `pages/TodosPage.tsx` - **核心重构**
- `features/todos/InboxPanel.tsx` - 新建
- `features/todos/BoardPanel.tsx` - 新建
- `features/todos/PlannerPanel.tsx` - 新建
- `features/todos/ViewToggle.tsx` - 新建
- `features/todos/DraggableTodoItem.tsx` - 新建
- `hooks/useTodoMutations.ts` - 扩展（乐观更新）
- `utils/todoPosition.ts` - 新建（位置计算）

---

## 风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| Position 整数溢出 | 阈值 < 10 时触发重新平衡 |
| 拖拽性能 | 长列表虚拟化，更新防抖 |
| 最后一个 toggle 取消选中 | 在 handler 中阻止 |
| Inbox 被删除 | `isSystem: true` 标志保护 |

---

## 成功标准

1. ✅ 跨面板拖拽有即时视觉反馈
2. ✅ 位置更新持久化，刷新后保持
3. ✅ 至少一个视图始终可见
4. ✅ 键盘用户可导航和移动任务
5. ✅ 废除 urgency，状态由 boardColumnId 唯一决定
6. ✅ 80%+ 测试覆盖率
7. ✅ Board → Planner 拖拽有视觉回弹动画
8. ✅ 乐观更新 + 失败回滚机制正常工作