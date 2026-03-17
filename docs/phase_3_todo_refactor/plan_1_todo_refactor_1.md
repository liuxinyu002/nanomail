# Plan 1: To-Do Module Refactoring - Phase 1: Backend Foundation

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 1 of 5
**Estimated Time**: 3-4 hours

---

## Context & Background

### Project Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### Architecture Constraints

> **IMPORTANT**: This application follows a **pure single-user architecture**.
> - No role-based access control (RBAC)
> - No multi-user isolation or Admin validation
> - Keep backend endpoints as simple SQLite CRUD operations

### Domain Model Boundaries

> **Design Principle**: **Single Source of Truth for Task Status**.
>
> **彻底重构模式**：直接废除旧的 `urgency` 枚举字段，将任务的优先级和状态完全交由看板的 `boardColumnId` 和物理位置 (`position`) 来决定。

| Category | Fields | Purpose |
|----------|--------|---------|
| **View State** | `boardColumnId`, `position` | UI presentation, Kanban ordering, task status |
| **Business State** | `deadline`, `completed` | Task semantics, scheduling context |

**Rationale**:
- 维护两套优先级（业务级 `urgency` 和视图级 `position`）会导致极高的状态同步成本
- 当前处于开发阶段，直接采用完全重构模式避免技术债务
- 任务的状态完全由其所在的 Column 决定（如「待处理」「进行中」「已完成」）

---

## Objective

Extend backend to support board columns and position-based ordering.

---

## Database Schema Changes

### New Table: `board_columns`

```sql
CREATE TABLE board_columns (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  is_system INTEGER NOT NULL DEFAULT 0,  -- 1 = system column (cannot be deleted)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Table: `todos`

```sql
-- New columns
ALTER TABLE todos ADD COLUMN board_column_id INTEGER NOT NULL DEFAULT 1 REFERENCES board_columns(id);
ALTER TABLE todos ADD COLUMN position INTEGER DEFAULT 0;

-- Remove old urgency field (if exists)
-- ALTER TABLE todos DROP COLUMN urgency;  -- Run migration if urgency exists
```

> **重要变更**：
> - `boardColumnId` 不再允许 `NULL`，默认值为 `1`（Inbox Column）
> - 废除 `urgency` 字段，任务状态完全由 `boardColumnId` 决定
> - 所有现有任务迁移时，`boardColumnId` 设为 `1`（Inbox）

### Default Data

> **IMPORTANT**: Inbox 是一个**系统默认的、不可删除的 Column**，与其他 Column 完全统一。
> 这样所有的跨容器拖拽逻辑都可以被拉平，避免在 dnd-kit 的拖拽逻辑中引入特殊 IF/ELSE 分支。

```typescript
const DEFAULT_COLUMNS = [
  { id: 1, name: '收件箱', order: 0, isSystem: true },  // Inbox - 系统默认，不可删除
  { id: 2, name: '待处理', order: 1 },                   // Todo
  { id: 3, name: '进行中', order: 2 },                   // In Progress
  { id: 4, name: '已完成', order: 3 },                   // Done
]
```

**统一 Inbox 模型的优势**：
- 所有任务都有 `boardColumnId`，不存在 `null` 值的特殊处理
- 拖拽逻辑完全统一，无需判断 `boardColumnId === null` 的特殊情况
- 新建任务默认放入 Inbox Column (id: 1)
- 用户可以删除自定义 Column，但无法删除系统 Column (`isSystem: true`)

---

## Tasks

### Task 1.1: Create BoardColumn Entity

**File**: `packages/backend/src/entities/BoardColumn.entity.ts`

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, type Relation } from 'typeorm'
import { Todo } from './Todo.entity'

@Entity('board_columns')
export class BoardColumn {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Column({ type: 'text' })
  name!: string

  @Column({ type: 'text', nullable: true })
  color!: string | null

  @Column({ type: 'integer', default: 0 })
  order!: number

  @Column({ type: 'integer', default: 0 })
  isSystem!: number  // 1 = system column (Inbox), cannot be deleted

  @CreateDateColumn({ type: 'datetime' })
  createdAt!: Date

  @OneToMany(() => Todo, (todo) => todo.boardColumn)
  todos!: Relation<Todo[]>
}
```

### Task 1.2: Update Todo Entity

**File**: `packages/backend/src/entities/Todo.entity.ts`

Add new columns:
- `boardColumnId: number` (NOT NULL, default: 1 - Inbox)
- `position: number`
- `boardColumn: BoardColumn` (relation)

**Remove**:
- `urgency` field (deprecated - status now determined by `boardColumnId`)

**Migration Note**: Existing tasks with `urgency` should be migrated:
- `urgency = 'high'` → `boardColumnId = 2` (Todo)
- `urgency = 'medium'` → `boardColumnId = 1` (Inbox)
- `urgency = 'low'` → `boardColumnId = 1` (Inbox)

### Task 1.3: Create BoardColumn Routes

**File**: `packages/backend/src/routes/boardColumn.routes.ts`

Endpoints:
- `GET /api/board-columns` - List all columns with todo counts
- `POST /api/board-columns` - Create new column
- `PATCH /api/board-columns/:id` - Update column
- `DELETE /api/board-columns/:id` - Delete column (blocked if `isSystem: true`)

**Delete Protection**:
```typescript
// Prevent deletion of system columns (Inbox)
if (column.isSystem) {
  return res.status(403).json({ error: 'Cannot delete system column' })
}
```

### Task 1.4: Update Todo Routes

**File**: `packages/backend/src/routes/todo.routes.ts`

Add endpoints:
- `PATCH /api/todos/:id/position` - Update position/column
- `POST /api/todos/batch-position` - Batch update positions (for rebalancing)

Modify existing endpoints:
- Add `boardColumnId` filter to GET (required, no null values)
- Add `position` to sorting logic
- Remove `urgency` filter (deprecated)

### Task 1.5: Database Initialization

**File**: `packages/backend/src/config/database.ts`

Add `BoardColumn` to entities array and create seed data.

### Task 1.6: Shared Schemas

**File**: `packages/shared/src/schemas/boardColumn.ts`

```typescript
export const BoardColumnSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(50),
  color: z.string().nullable(),
  order: z.number().int(),
  isSystem: z.boolean(),  // System columns (like Inbox) cannot be deleted
  createdAt: z.coerce.date()
})

export const CreateBoardColumnSchema = BoardColumnSchema.omit({ id, createdAt, isSystem })
export const UpdateBoardColumnSchema = CreateBoardColumnSchema.partial()

export const UpdateTodoPositionSchema = z.object({
  boardColumnId: z.number().int().positive(),  // NOT nullable - all tasks must belong to a column
  position: z.number().int().optional(),
  deadline: z.string().datetime().nullable().optional()
})
```

**File**: `packages/shared/src/schemas/todo.ts`

Add `boardColumnId` (required, default: 1) and `position` fields.
Remove `urgency` field from schema.

---

## Dependencies

This is the **first phase** - no dependencies on other phases.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `entities/BoardColumn.entity.ts` | CREATE | New entity for board columns |
| `entities/Todo.entity.ts` | MODIFY | Add boardColumnId, position, relation |
| `routes/boardColumn.routes.ts` | CREATE | CRUD endpoints for columns |
| `routes/todo.routes.ts` | MODIFY | Add position endpoints, update filters |
| `config/database.ts` | MODIFY | Add BoardColumn to entities, seed data |
| `schemas/boardColumn.ts` | CREATE | Zod schemas for BoardColumn |
| `schemas/todo.ts` | MODIFY | Add boardColumnId, position fields |
| `schemas/index.ts` | MODIFY | Export new schemas |

---

## Success Criteria

1. `board_columns` table created with seed data
2. `todos` table updated with `boardColumnId` and `position` columns
3. All CRUD endpoints for board columns working
4. Position update endpoints working
5. Shared schemas updated and exported

---

## Next Phase

After completing this phase, proceed to **Phase 2: Frontend Drag-and-Drop Setup**.