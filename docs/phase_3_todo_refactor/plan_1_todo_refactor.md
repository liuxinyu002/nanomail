# Plan 1: To-Do Module Refactoring - Kanban Board with Drag-and-Drop

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 3

---

## 1. Requirements Summary

### 1.1 Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### 1.2 Core Features

| Feature | Description |
|---------|-------------|
| **Inbox Panel** | Tasks in Column ID 1 (系统默认收件箱) |
| **Planner Panel** | Month calendar view for deadline management |
| **Board Panel** | Kanban-style columns (待处理, 进行中, 已完成) |
| **Drag-and-Drop** | Cross-panel task movement with smart field updates |
| **Position System** | Large-integer algorithm for stable ordering |
| **Optimistic Updates** | Instant visual feedback with rollback on error |

### 1.3 Technical Decisions

- **Drag Library**: dnd-kit (multi-container support, accessibility-first)
- **State Management**: TanStack Query + local UI state
- **Animation**: CSS Transitions with Tailwind
- **Database**: SQLite with TypeORM (synchronize mode in dev)

### 1.4 Architecture Constraints

> **IMPORTANT**: This application follows a **pure single-user architecture**.
> - No role-based access control (RBAC)
> - No multi-user isolation or Admin validation
> - Keep backend endpoints as simple SQLite CRUD operations

### 1.5 Domain Model Boundaries

> **Design Principle**: **Single Source of Truth for Task Status**.
>
> **彻底重构模式**：直接废除旧的 `urgency` 枚举字段，将任务的优先级和状态完全交由看板的 `boardColumnId` 和物理位置 (`position`) 来决定。
>
> | Category | Fields | Purpose |
> |----------|--------|---------|
> | **View State** | `boardColumnId`, `position` | UI presentation, Kanban ordering, task status |
> | **Business State** | `deadline`, `completed` | Task semantics, scheduling context |
>
> **Rationale**:
> - 维护两套优先级（业务级 `urgency` 和视图级 `position`）会导致极高的状态同步成本
> - 当前处于开发阶段，直接采用完全重构模式避免技术债务
> - 任务的状态完全由其所在的 Column 决定（如「待处理」「进行中」「已完成」）
> - Future iterations may attach email source links or AI-extracted task context to todos

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  TodosPage (Refactored)                                              │
├──────────────────────┬─────────────────────┬────────────────────────┤
│  InboxPanel          │  PlannerPanel       │  BoardPanel            │
│  (Droppable)         │  (Droppable)        │  (Droppable x 3)       │
│                      │                     │                        │
│  - DraggableTodoItem │  - CalendarGrid     │  - BoardColumn x 3     │
│  - Filtered: no      │  - DraggableDate    │  - DraggableTodoItem   │
│    columnId AND      │  - Drop sets        │  - Drop updates        │
│    no deadline       │    deadline         │    columnId + position │
├──────────────────────┴─────────────────────┴────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ ViewToggle: [◉ Inbox] [○ Planner] [◉ Board]  (Pill-style)       ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

### 2.1 Data Flow (Optimistic Update Pattern)

```
User Drag → onDragEnd
  → [1] Local UI Update (setQueryData) → Instant visual feedback
  → [2] Async Mutation → Backend API → DB Update
  → [3a] Success: invalidateQueries (sync with server)
  → [3b] Error: Rollback to snapshot, show error toast
```

---

## 3. Database Schema Changes

### 3.1 New Table: `board_columns`

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

### 3.2 Modified Table: `todos`

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

### 3.3 Default Data

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

## 4. Implementation Phases

### Phase 1: Backend Foundation (Estimated: 3-4 hours)

**Objective**: Extend backend to support board columns and position-based ordering.

#### Task 1.1: Create BoardColumn Entity

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

#### Task 1.2: Update Todo Entity

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

#### Task 1.3: Create BoardColumn Routes

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

#### Task 1.4: Update Todo Routes

**File**: `packages/backend/src/routes/todo.routes.ts`

Add endpoints:
- `PATCH /api/todos/:id/position` - Update position/column
- `POST /api/todos/batch-position` - Batch update positions (for rebalancing)

Modify existing endpoints:
- Add `boardColumnId` filter to GET (required, no null values)
- Add `position` to sorting logic
- Remove `urgency` filter (deprecated)

#### Task 1.5: Database Initialization

**File**: `packages/backend/src/config/database.ts`

Add `BoardColumn` to entities array and create seed data.

#### Task 1.6: Shared Schemas

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

### Phase 2: Frontend Drag-and-Drop Setup (Estimated: 4-5 hours)

**Objective**: Install dnd-kit and create core drag-and-drop infrastructure.

#### Task 2.1: Install Dependencies

```bash
pnpm --filter @nanomail/frontend add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

#### Task 2.2: Create DnD Context Provider

**File**: `packages/frontend/src/contexts/DndContext.tsx`

Create a context wrapper that:
- Wraps `DndContext` from dnd-kit
- Provides drag state to child components
- Handles drag end events and dispatches updates

#### Task 2.3: Create DraggableTodoItem

**File**: `packages/frontend/src/features/todos/DraggableTodoItem.tsx`

Wrap existing `TodoItem` with:
- `useDraggable` hook from dnd-kit
- Drag handle styling
- Visual feedback during drag

#### Task 2.4: Create DroppableZone

**File**: `packages/frontend/src/features/todos/DroppableZone.tsx`

Generic droppable zone component:
- `useDroppable` hook integration
- Visual indicator when item hovers
- Accept configuration (which item types)

#### Task 2.5: Create Position Utilities

**File**: `packages/frontend/src/utils/todoPosition.ts`

```typescript
export const POSITION_STEP = 65536
export const REBALANCE_THRESHOLD = 10

export function calculateInsertPosition(prev: number | null, next: number | null): number
export function needsRebalance(positions: number[]): boolean
export function rebalancePositions(count: number, start: number, step: number): number[]
```

---

### Phase 3: UI Components (Estimated: 5-6 hours)

**Objective**: Build the three-panel UI with toggle controls.

#### Task 3.1: Create ViewToggle Component

**File**: `packages/frontend/src/features/todos/ViewToggle.tsx`

Pill-style toggle buttons:
- Three options: Inbox, Planner, Board
- Multi-select with minimum-one constraint
- Animated selection indicators

**Visual Design Requirements**:
- **Position**: Centered, floating at bottom of viewport
- **Shape**: Pill-shaped (rounded-full)
- **Background**: Glassmorphism effect - `bg-white/80 backdrop-blur-md`
- **Shadow**: `shadow-lg` for elevation
- **Selected State**: Use bright theme color as indicator
- **Overall Style**: Clean, airy, breathing room - avoid dark or heavy navigation bar aesthetic

**Interaction Constraint**:
```typescript
// Prevent deselecting the last active toggle
const handleToggle = (view: ViewType) => {
  const activeCount = activeViews.length
  const isCurrentlyActive = activeViews.includes(view)

  // Block: User trying to deselect the last active view
  if (isCurrentlyActive && activeCount === 1) {
    return // Do nothing - prevent blank screen
  }

  // Otherwise proceed with toggle
  setActiveViews(prev =>
    isCurrentlyActive
      ? prev.filter(v => v !== view)
      : [...prev, view]
  )
}
```

#### Task 3.2: Create InboxPanel Component

**File**: `packages/frontend/src/features/todos/InboxPanel.tsx`

**职责定义**：InboxPanel 是**唯一的收件箱入口**，只显示 `boardColumnId === 1` 的任务。

**数据过滤边界**（CRITICAL）：
```typescript
// 严格的过滤条件 - 只显示 Column 1 的任务
const inboxTodos = useMemo(() => {
  return todos.filter(t => t.boardColumnId === 1)
}, [todos])
```

Features:
- Display todos where `boardColumnId === 1` (Inbox Column)
- Droppable zone for receiving items (same as other columns)
- Update `boardColumnId` to `1` on drop (no special null handling)
- **No special IF/ELSE branches** - Inbox is just another column with `id: 1`

**重要约束**：
- InboxPanel 与 BoardPanel 的数据**互斥**，确保同一任务不会在两边同时显示
- 过滤逻辑必须在组件级别明确执行，不依赖后端返回的预过滤数据

#### Task 3.3: Create PlannerPanel Component

**File**: `packages/frontend/src/features/todos/PlannerPanel.tsx`

Features:
- Reuse existing `TodoCalendar` logic
- Add droppable date cells
- Set deadline on drop (preserve boardColumnId)

#### Task 3.4: Create BoardPanel Component

**File**: `packages/frontend/src/features/todos/BoardPanel.tsx`

**职责定义**：BoardPanel 显示**业务流转列**（待处理、进行中、已完成），**严格排除 Inbox (Column 1)**。

**数据过滤边界**（CRITICAL）：
```typescript
// 按配置的 columns 列表循环渲染，自然排除 Inbox (Column 1)
const displayColumns = useMemo(() => {
  return columns.filter(c => c.id !== 1)  // 排除 Inbox，只显示业务流转列
}, [columns])

// 每个列的数据
const getColumnTodos = (columnId: number) => {
  return todos.filter(t => t.boardColumnId === columnId)
}
```

Features:
- Three columns: Todo (id: 2), In Progress (id: 3), Done (id: 4)
- Each column is a sortable droppable zone
- Update `boardColumnId` and `position` on drop

**重要约束**：
- BoardPanel **必须排除 Column 1 (Inbox)**，防止任务在 InboxPanel 和 BoardPanel 同时显示
- 过滤逻辑在组件级别执行，与 InboxPanel 形成数据边界
- 支持未来扩展：用户可添加自定义业务列，但 Inbox 始终在左侧独立面板

#### Task 3.5: Create BoardColumn Component

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

Features:
- Header with column name and count
- Sortable container using `SortableContext`
- Auto-scroll when dragging near edges

#### Task 3.6: Refactor TodosPage

**File**: `packages/frontend/src/pages/TodosPage.tsx`

Major refactor:
- Remove Tabs component
- Add three-panel layout
- Integrate ViewToggle
- Handle panel visibility state

**Layout Implementation Requirements**:
```tsx
// Three panels must be wrapped in a flex container
<div className="flex flex-1 gap-4 overflow-hidden">
  {showInbox && <InboxPanel className="flex-1 min-w-0" />}
  {showPlanner && <PlannerPanel className="flex-1 min-w-0" />}
  {showBoard && <BoardPanel className="flex-1 min-w-0" />}
</div>

// Each panel wrapper
<div className={cn(
  "transition-all duration-300 ease-in-out",
  isVisible ? "flex-1 min-w-0" : "w-0 flex-shrink-0 overflow-hidden"
)}>
  {children}
</div>
```

**Key Points**:
- Use `flex-1` for visible panels to auto-fill available space
- Hidden panels should have `w-0 flex-shrink-0 overflow-hidden` (or be removed from DOM)
- Apply `transition-all duration-300 ease-in-out` for smooth expand/collapse
- Hidden panel's space is automatically reclaimed by remaining panels

---

### Phase 4: Service Layer Updates (Estimated: 2-3 hours)

**Objective**: Update frontend services to support new API endpoints.

#### Task 4.1: Update TodoService

**File**: `packages/frontend/src/services/todo.service.ts`

Add methods:
```typescript
async updateTodoPosition(id: number, data: UpdateTodoPosition): Promise<TodoItem>
async batchUpdatePositions(updates: Array<{id: number, position: number}>): Promise<void>
async getTodosByColumn(columnId: number): Promise<TodosResponse>  // Works for all columns including Inbox
```

> Note: No separate `getInboxTodos()` needed - Inbox is just Column ID 1

#### Task 4.2: Create BoardColumnService

**File**: `packages/frontend/src/services/boardColumn.service.ts`

Methods:
- `getBoardColumns()` - Fetch all columns
- `createBoardColumn()` - Create new column
- `updateBoardColumn()` - Update column

#### Task 4.3: Update Hooks

**File**: `packages/frontend/src/hooks/useTodoMutations.ts`

Add:
- `useUpdateTodoPositionMutation()` - **Optimistic position updates with rollback**
- `useBatchUpdatePositionsMutation()` - Batch updates for rebalancing

**Important**: The mutation must implement optimistic update pattern:
```typescript
const useUpdateTodoPositionMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (params: { id: number; data: UpdateTodoPosition }) =>
      todoService.updateTodoPosition(params.id, params.data),

    // Optimistic update happens BEFORE mutation (in onDragEnd)
    // This hook is called after local state already updated

    onError: (err, variables, context) => {
      // Rollback is handled by the caller with snapshot
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    }
  })
}
```

**File**: `packages/frontend/src/hooks/useBoardColumns.ts` (NEW)

```typescript
export function useBoardColumns()
export function useCreateBoardColumnMutation()
```

---

### Phase 5: Integration and Testing (Estimated: 4-5 hours)

**Objective**: Integrate all components and ensure quality.

#### Task 5.1: Integration Testing

- Test all drag-and-drop scenarios per the matrix
- Verify optimistic updates and rollback
- Test position calculation edge cases

#### Task 5.2: Unit Tests

Create tests for:
- `packages/frontend/src/utils/todoPosition.test.ts`
- `packages/frontend/src/features/todos/DraggableTodoItem.test.tsx`
- `packages/backend/src/routes/todo.routes.test.ts` (extend existing)

#### Task 5.3: E2E Tests

**File**: `tests/e2e/todos-drag-drop.spec.ts`

Test scenarios:
- Drag todo from Inbox to Board column
- Drag todo between Board columns
- Set deadline by dragging to Planner
- Position persistence after reorder

#### Task 5.4: Accessibility Audit

- Ensure keyboard navigation works
- Verify screen reader announcements during drag
- Check focus management

---

## 5. Drag-and-Drop Behavior Matrix

| Source → Target | Inbox (Column 1) | Planner | Board Column (2-4) |
|-----------------|------------------|---------|---------------------|
| **Inbox (Column 1)** | N/A | Set `deadline` | Set `boardColumnId` + `position` |
| **Planner** | Set `boardColumnId = 1` | Update `deadline` | Set `boardColumnId` + `position`, keep `deadline` |
| **Board Column (2-4)** | Set `boardColumnId = 1` | Set `deadline` (card rebounds) | Update `position`, optionally `boardColumnId` |

> **Note**:
> - Inbox is now Column ID 1, not a special case with `null` boardColumnId
> - All drag-and-drop operations use the same unified logic
> - Board → Planner interactions trigger a visual rebound animation. The task remains visually in its Kanban column while only the `deadline` is updated.

### 5.1 Drop Handler Logic

> **CRITICAL: Optimistic Update Pattern**
>
> **问题**：直接在 drop 事件中读写 React Query Cache 容易导致卡片在拖拽松手的瞬间发生"闪烁"或"瞬移"。
>
> **正确的流转**：
> 1. **拖拽结束 (`onDragEnd`)** 时，优先触发**本地 UI 状态更新**
> 2. 使用 dnd-kit 提供的 `arrayMove` 操作本地的 `columns` 数组，让用户**瞬间看到卡片落位**
> 3. 同时触发 **Mutation** 发送异步请求更新数据库
> 4. 如果后端报错，再**回滚本地状态**
>
> 这才是符合直觉的顺滑交互。

#### Implementation Pattern

```typescript
import { arrayMove } from '@dnd-kit/sortable'
import { useMutation, useQueryClient } from '@tanstack/react-query'

function useTodoDragDrop() {
  const queryClient = useQueryClient()
  const updateMutation = useUpdateTodoPositionMutation()

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const sourceType = active.data.current?.type
    const targetType = over.data.current?.type
    const activeId = Number(active.id)

    // ═══════════════════════════════════════════════════════════════
    // STEP 1: OPTIMISTIC LOCAL UPDATE (instant visual feedback)
    // ═══════════════════════════════════════════════════════════════

    if (targetType === 'board' || sourceType === 'board') {
      const targetColumnId = over.data.current?.columnId ?? 1

      // Cancel any ongoing refetches to prevent race conditions
      queryClient.cancelQueries({ queryKey: ['todos'] })

      // Snapshot current state for potential rollback
      const previousTodos = queryClient.getQueryData(['todos'])

      // Optimistically update local cache
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) => {
        if (!old) return old

        const todoIndex = old.findIndex(t => t.id === activeId)
        if (todoIndex === -1) return old

        const newTodos = [...old]
        const [movedTodo] = newTodos.splice(todoIndex, 1)

        // Calculate new position (simplified for example)
        const newPosition = calculateInsertPosition(
          findPrevPosition(newTodos, targetColumnId, over.id),
          findNextPosition(newTodos, targetColumnId, over.id)
        )

        // Update the moved todo
        newTodos.push({
          ...movedTodo,
          boardColumnId: targetColumnId,
          position: newPosition
        })

        return newTodos
      })

      // ═══════════════════════════════════════════════════════════════
      // STEP 2: ASYNC SERVER UPDATE with ROLLBACK on error
      // ═══════════════════════════════════════════════════════════════

      const targetColumnId = over.data.current?.columnId ?? 1
      const newPosition = calculateNewPosition(/* ... */)

      updateMutation.mutate(
        {
          id: activeId,
          data: { boardColumnId: targetColumnId, position: newPosition }
        },
        {
          onError: (error) => {
            // ROLLBACK: Restore previous state on error
            queryClient.setQueryData(['todos'], previousTodos)
            console.error('Failed to update todo position:', error)
            // Optional: Show toast notification to user
          },
          onSettled: () => {
            // Refetch to ensure sync with server
            queryClient.invalidateQueries({ queryKey: ['todos'] })
          }
        }
      )
    }

    // Handle Planner drops (deadline updates)
    if (targetType === 'planner') {
      const date = over.data.current?.date

      // Optimistic update
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) => {
        if (!old) return old
        return old.map(t =>
          t.id === activeId ? { ...t, deadline: date } : t
        )
      })

      updateMutation.mutate(
        { id: activeId, data: { deadline: date } },
        {
          onError: () => {
            // Rollback handled by onSettled refetch
            queryClient.invalidateQueries({ queryKey: ['todos'] })
          }
        }
      )
    }
  }

  return { handleDragEnd }
}
```

#### Key Points

1. **`queryClient.cancelQueries()`** - Cancel ongoing refetches before optimistic update
2. **Snapshot previous state** - Store for rollback on error
3. **`setQueryData` for instant update** - User sees change immediately
4. **Mutation with `onError` rollback** - Handle server failures gracefully
5. **`invalidateQueries` on settled** - Ensure eventual consistency

#### Board Column Drop (Simplified)

Since Inbox is now just another column (`id: 1`), all column drops follow the same pattern:

```typescript
// NO MORE SPECIAL CASES for Inbox!
// All columns use the same drag-and-drop logic

const DEFAULT_COLUMNS = [
  { id: 1, name: '收件箱', isSystem: true },  // Inbox - same as others
  { id: 2, name: '待处理' },
  { id: 3, name: '进行中' },
  { id: 4, name: '已完成' },
]

// Drop to ANY column - same logic
const targetColumnId = over.data.current?.columnId  // Could be 1, 2, 3, or 4
updateMutation.mutate({
  id: activeId,
  data: { boardColumnId: targetColumnId, position: newPosition }
})
```

### 5.2 Board → Planner Visual Interaction

> **Critical UX Pattern**: When dragging a task from Kanban Board to Planner:
>
> 1. **Visual Behavior**: The task card **must rebound** to its original position in the Kanban column
> 2. **Data Update**: Only the `deadline` field is updated; `boardColumnId` remains unchanged
> 3. **UI Refresh**: The Planner's date cell showing task count should update via React Query cache invalidation
>
> **Implementation**:
> ```typescript
> if (sourceType === 'board' && targetType === 'planner') {
>   const date = over.data.current?.date
>
>   // Update deadline only - task stays in its Kanban column
>   updateMutation.mutate(
>     { id: activeId, data: { deadline: date } },
>     {
>       onSuccess: () => {
>         // Invalidate planner queries to refresh date cell indicators
>         queryClient.invalidateQueries({ queryKey: ['todos', 'deadline'] })
>         queryClient.invalidateQueries({ queryKey: ['calendar'] })
>       }
>     }
>   )
>   // No DOM manipulation - let dnd-kit handle the visual revert
> }
> ```
>
> **Why Revert?**: The task still belongs to a Kanban column. Moving it into the calendar DOM would create UI inconsistency. The Planner shows deadline-linked tasks via a different query, not by repositioning cards.
```

---

## 6. File Change Summary

### Backend

| File | Action | Description |
|------|--------|-------------|
| `entities/BoardColumn.entity.ts` | CREATE | New entity for board columns |
| `entities/Todo.entity.ts` | MODIFY | Add boardColumnId, position, relation |
| `routes/boardColumn.routes.ts` | CREATE | CRUD endpoints for columns |
| `routes/todo.routes.ts` | MODIFY | Add position endpoints, update filters |
| `config/database.ts` | MODIFY | Add BoardColumn to entities, seed data |

### Shared

| File | Action | Description |
|------|--------|-------------|
| `schemas/boardColumn.ts` | CREATE | Zod schemas for BoardColumn |
| `schemas/todo.ts` | MODIFY | Add boardColumnId, position fields |
| `schemas/index.ts` | MODIFY | Export new schemas |

### Frontend

| File | Action | Description |
|------|--------|-------------|
| `services/boardColumn.service.ts` | CREATE | API client for board columns |
| `services/todo.service.ts` | MODIFY | Add position-related methods |
| `hooks/useBoardColumns.ts` | CREATE | React Query hooks for columns |
| `hooks/useTodoMutations.ts` | MODIFY | Add position mutation hooks |
| `utils/todoPosition.ts` | CREATE | Position calculation utilities |
| `features/todos/DraggableTodoItem.tsx` | CREATE | Draggable wrapper for TodoItem |
| `features/todos/DroppableZone.tsx` | CREATE | Generic droppable container |
| `features/todos/ViewToggle.tsx` | CREATE | Pill-style view toggles |
| `features/todos/InboxPanel.tsx` | CREATE | Inbox panel component |
| `features/todos/PlannerPanel.tsx` | CREATE | Calendar panel component |
| `features/todos/BoardPanel.tsx` | CREATE | Kanban board component |
| `features/todos/BoardColumnDroppable.tsx` | CREATE | Single column component |
| `pages/TodosPage.tsx` | MODIFY | Major refactor for new layout |
| `features/todos/index.ts` | MODIFY | Export new components |

---

## 7. Dependencies

### 7.1 Phase Dependencies

```
Phase 1 (Backend)
    ↓
Phase 2 (DnD Setup) ← Can start Task 2.1 in parallel
    ↓
Phase 3 (UI Components) ← Requires Phase 2 context
    ↓
Phase 4 (Services) ← Can overlap with Phase 3
    ↓
Phase 5 (Testing) ← Requires all previous phases
```

### 7.2 External Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@dnd-kit/core` | ^6.x | Core drag-and-drop primitives |
| `@dnd-kit/sortable` | ^8.x | Sortable list functionality |
| `@dnd-kit/utilities` | ^3.x | Helper utilities |

---

## 8. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Position integer overflow | Low | High | Implement rebalancing when threshold < 10 |
| Drag performance with many items | Medium | Medium | Virtualize long lists, debounce updates |
| TypeORM synchronize issues in prod | Medium | High | Create explicit migrations for prod |
| dnd-kit accessibility gaps | Low | Medium | Test with screen readers, add ARIA labels |
| State sync between panels | Low | High | TanStack Query cache as source of truth + optimistic updates |
| Board→Planner visual confusion | Medium | Medium | Clear rebound animation, cache-based refresh |
| Last toggle deselection | Medium | High | Block deselection in toggle handler |
| Optimistic update rollback failure | Low | High | Snapshot state before update, invalidate on error |
| Inbox Column deletion | Low | High | `isSystem: true` flag prevents deletion |

---

## 9. Complexity Estimates

| Phase | Estimated Time | Complexity |
|-------|---------------|------------|
| Phase 1: Backend | 3-4 hours | Medium |
| Phase 2: DnD Setup | 4-5 hours | High |
| Phase 3: UI Components | 5-6 hours | High |
| Phase 4: Services | 2-3 hours | Medium |
| Phase 5: Testing | 4-5 hours | Medium |
| **Total** | **18-23 hours** | **High** |

---

## 10. Success Criteria

1. Users can drag todos between Inbox, Planner, and Board panels with **instant visual feedback**
2. Position updates are persisted and stable across page refreshes
3. At least one view is always visible (toggle blocks deselection of last active view)
4. Keyboard users can navigate and move todos
5. All existing todo functionality remains intact (urgency field deprecated)
6. 80%+ test coverage for new code
7. View toggle uses glassmorphism pill-style design (not dark/heavy navigation)
8. Panel expand/collapse uses smooth CSS transitions with `flex-1` auto-fill
9. Board → Planner drops show visual rebound, update only `deadline`, refresh via cache invalidation
10. **Optimistic updates with rollback**: Drag operations feel instant; errors gracefully revert UI
11. **Unified Inbox model**: Inbox is Column ID 1, no special `null` handling in drag logic
12. **Single source of truth**: Task status determined by `boardColumnId` only, no `urgency` field

---

## 11. Critical Files for Implementation

| File | Purpose |
|------|---------|
| `packages/backend/src/entities/Todo.entity.ts` | Must add boardColumnId and position columns |
| `packages/shared/src/schemas/todo.ts` | Single source of truth for Todo types |
| `packages/frontend/src/pages/TodosPage.tsx` | Main page requiring major refactor |
| `packages/frontend/src/hooks/useTodoMutations.ts` | Optimistic update logic to extend |
| `packages/backend/src/routes/todo.routes.ts` | Existing routes to extend with position endpoints |