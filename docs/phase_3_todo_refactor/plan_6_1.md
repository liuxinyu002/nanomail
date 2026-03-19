# Plan 6 Phase 1: Backend - Query with JOIN & DTO Formatting

> Part of: Phase 3 Todo Refactor - [Plan 6 Overview](./plan_6.md)

## Overview

实现 Todo 分组颜色同步功能，使 Board 列的颜色能够体现在 UI 的各个层面。采用**关系映射**架构，通过 JOIN 查询动态获取颜色，避免数据冗余和同步复杂度。

### 核心需求

| # | 需求 | 描述 |
|---|------|------|
| 1 | Board 列颜色 UI | 更改颜色时更新头部背景，移除颜色徽标 |
| 2 | Todo 颜色字段 | **API 响应中动态计算**，不物理存储 |
| 3 | Planner 颜色指示栏 | 左侧颜色条读取 Todo 的 color 字段 |

---

## Data Design

### Architecture Decision: Relation/JOIN over Storage

**诊断**：原方案在 Todo 实体中存储 `color` 字段存在以下问题：
- 数据冗余（颜色已在 BoardColumn 表中存储）
- 状态同步风险（列颜色变更时需批量更新所有 Todo）
- 增加维护成本

**纠正**：采用关系映射架构：
- Todo 实体不存储 `color` 字段
- 查询时通过 `boardColumnId` 关联 BoardColumn 表
- API 响应中动态拼装 `color` 字段（DTO 层）

### API Response Format

虽然数据库不存储 `color`，但 API 返回给前端的 DTO 依然包含 `color` 字段，实现**完美解耦**：

```typescript
// API Response
{
  id: 1,
  description: "Task description",
  boardColumnId: 2,
  color: "#FFB5BA",  // 动态计算，从关联的 BoardColumn 读取
  // ... other fields
}
```

### Color Fallback 逻辑

前端渲染时，若 `color` 为 `null`，使用中性灰色 `#9CA3AF` (Tailwind `bg-gray-400`)

---

## Phase 1: Backend - Query with JOIN & DTO Formatting

> Risk: Low
> Dependencies: None

### Task 1.1: Update Todo Query to Include BoardColumn Relation

**File**: `packages/backend/src/routes/todo.routes.ts`

**Action**: Modify todo queries to JOIN BoardColumn table

```typescript
import { dataSource } from '../config/database'
import { Todo } from '../entities/Todo.entity'
import { BoardColumn } from '../entities/BoardColumn.entity'

const todoRepository = dataSource.getRepository(Todo)
const columnRepository = dataSource.getRepository(BoardColumn)

// GET /todos - List all todos with color from related column
router.get('/', async (req, res, next) => {
  try {
    const todos = await todoRepository.find({
      relations: ['boardColumn'],  // JOIN BoardColumn table
      order: { createdAt: 'DESC' }
    })

    res.json({
      todos: todos.map(formatTodo)
    })
  } catch (error) {
    next(error)
  }
})
```

---

### Task 1.2: Update Todo Response Formatter (DTO)

**File**: `packages/backend/src/routes/todo.routes.ts`

**Action**: Add `color` field to response, dynamically computed from relation

```typescript
/**
 * Format Todo entity to API response DTO
 * Color is dynamically computed from related BoardColumn
 */
function formatTodo(todo: Todo): TodosResponse['todos'][0] {
  return {
    id: todo.id,
    emailId: todo.emailId,
    description: todo.description,
    status: todo.status,
    deadline: todo.deadline?.toISOString() ?? null,
    boardColumnId: todo.boardColumnId,
    position: todo.position,
    notes: todo.notes,
    // Core change: dynamic color from relation
    color: todo.boardColumn?.color ?? null,
    createdAt: todo.createdAt.toISOString(),
  }
}
```

**Key Points**:
- `todo.boardColumn` 通过 TypeORM 关系自动加载
- `color` 是衍生字段，不存储在 Todo 表

---

### Task 1.3: Update Todo Entity Relation

**File**: `packages/backend/src/entities/Todo.entity.ts`

**Action**: Ensure BoardColumn relation is properly defined

```typescript
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm'
import { BoardColumn } from './BoardColumn.entity'

@Entity('todos')
export class Todo {
  // ... existing fields ...

  @Column({ type: 'integer' })
  boardColumnId!: number

  /**
   * Relation to BoardColumn for color lookup
   * Not stored in Todo table, used for JOIN queries
   */
  @ManyToOne(() => BoardColumn)
  @JoinColumn({ name: 'boardColumnId' })
  boardColumn?: BoardColumn

  // ... rest of entity ...
}
```

**Note**: This relation should already exist. Verify it's properly configured.

---

### Task 1.4: Update All Todo Query Endpoints

**File**: `packages/backend/src/routes/todo.routes.ts`

**Action**: Ensure all endpoints that return todos include the relation

```typescript
// GET /todos/:id - Single todo with color
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    const todo = await todoRepository.findOne({
      where: { id },
      relations: ['boardColumn']  // Include relation
    })

    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' })
    }

    res.json(formatTodo(todo))
  } catch (error) {
    next(error)
  }
})

// PATCH /todos/:id/position - Update position, return with color
router.patch('/:id/position', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    // ... validation and update logic ...

    // After update, fetch with relation
    const updatedTodo = await todoRepository.findOne({
      where: { id },
      relations: ['boardColumn']  // Include relation
    })

    res.json(formatTodo(updatedTodo!))
  } catch (error) {
    next(error)
  }
})

// POST /todos/batch-position - Batch update positions
router.post('/batch-position', async (req, res, next) => {
  try {
    // ... validation ...

    // After batch update, return updated todos with colors
    const updatedIds = updates.map(u => u.id)
    const updatedTodos = await todoRepository.find({
      where: updatedIds.map(id => ({ id })),
      relations: ['boardColumn']  // Include relation
    })

    res.json({
      success: true,
      updated: updates.length,
      todos: updatedTodos.map(formatTodo)
    })
  } catch (error) {
    next(error)
  }
})
```

**Verification**: All endpoints returning todos now include `color` field from JOIN.

---

## Files Changed (Phase 1)

| File | Action |
|------|--------|
| `packages/backend/src/routes/todo.routes.ts` | MODIFY |
| `packages/backend/src/entities/Todo.entity.ts` | VERIFY |

---

## Testing Checklist (Phase 1)

- [ ] Todo entity has `boardColumn` relation defined
- [ ] GET /todos returns `color` from JOIN'd BoardColumn
- [ ] GET /todos/:id returns `color` from JOIN'd BoardColumn
- [ ] PATCH /todos/:id/position returns `color` from new column
- [ ] POST /todos/batch-position returns updated todos with colors
- [ ] `color` is `null` when BoardColumn has no color
- [ ] POST /todos ignores `color` field if client sends it (Zod strict)