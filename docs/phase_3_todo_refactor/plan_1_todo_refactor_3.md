# Plan 1: To-Do Module Refactoring - Phase 3: UI Components

**Project**: NanoMail - Email client application
**Date**: 2026-03-17
**Phase**: 3 of 5
**Estimated Time**: 5-6 hours

---

## Context & Background

### Project Overview

Refactor the existing To-Do module from a simple urgency-based list view to a multi-panel interface with Inbox, Planner (calendar), and Kanban Board views, supporting drag-and-drop between views.

### Architecture Overview

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

### Default Column Structure

```typescript
const DEFAULT_COLUMNS = [
  { id: 1, name: '收件箱', order: 0, isSystem: true },  // Inbox - 系统默认，不可删除
  { id: 2, name: '待处理', order: 1 },                   // Todo
  { id: 3, name: '进行中', order: 2 },                   // In Progress
  { id: 4, name: '已完成', order: 3 },                   // Done
]
```

### Data Flow (Optimistic Update Pattern)

```
User Drag → onDragEnd
  → [1] Local UI Update (setQueryData) → Instant visual feedback
  → [2] Async Mutation → Backend API → DB Update
  → [3a] Success: invalidateQueries (sync with server)
  → [3b] Error: Rollback to snapshot, show error toast
```

---

## Objective

Build the three-panel UI with toggle controls.

---

## Tasks

### Task 3.1: Create ViewToggle Component

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

### Task 3.2: Create InboxPanel Component

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

### Task 3.3: Create PlannerPanel Component

**File**: `packages/frontend/src/features/todos/PlannerPanel.tsx`

Features:
- Reuse existing `TodoCalendar` logic
- Add droppable date cells
- Set deadline on drop (preserve boardColumnId)

**Implementation Notes**:
- Calendar shows month view
- Each date cell is a droppable zone
- Dropping a todo sets its `deadline` field
- Tasks with deadlines are highlighted in calendar

### Task 3.4: Create BoardPanel Component

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

### Task 3.5: Create BoardColumn Component

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

Features:
- Header with column name and count
- Sortable container using `SortableContext`
- Auto-scroll when dragging near edges

**Implementation Pattern**:
```typescript
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'

interface BoardColumnDroppableProps {
  column: BoardColumn
  todos: Todo[]
}

export function BoardColumnDroppable({ column, todos }: BoardColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: { type: 'board', columnId: column.id },
  })

  return (
    <div className="flex flex-col bg-gray-50 rounded-lg">
      <div className="p-3 border-b flex items-center justify-between">
        <h3 className="font-medium">{column.name}</h3>
        <span className="text-sm text-gray-500">{todos.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 p-2 min-h-[200px] overflow-y-auto',
          isOver && 'bg-blue-50'
        )}
      >
        <SortableContext
          items={todos.map(t => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {todos.map(todo => (
            <DraggableTodoItem key={todo.id} todo={todo} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}
```

### Task 3.6: Refactor TodosPage

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

## Drag-and-Drop Behavior Matrix

| Source → Target | Inbox (Column 1) | Planner | Board Column (2-4) |
|-----------------|------------------|---------|---------------------|
| **Inbox (Column 1)** | N/A | Set `deadline` | Set `boardColumnId` + `position` |
| **Planner** | Set `boardColumnId = 1` | Update `deadline` | Set `boardColumnId` + `position`, keep `deadline` |
| **Board Column (2-4)** | Set `boardColumnId = 1` | Set `deadline` (card rebounds) | Update `position`, optionally `boardColumnId` |

> **Note**:
> - Inbox is now Column ID 1, not a special case with `null` boardColumnId
> - All drag-and-drop operations use the same unified logic
> - Board → Planner interactions trigger a visual rebound animation. The task remains visually in its Kanban column while only the `deadline` is updated.

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `features/todos/ViewToggle.tsx` | CREATE | Pill-style view toggles |
| `features/todos/InboxPanel.tsx` | CREATE | Inbox panel component |
| `features/todos/PlannerPanel.tsx` | CREATE | Calendar panel component |
| `features/todos/BoardPanel.tsx` | CREATE | Kanban board component |
| `features/todos/BoardColumnDroppable.tsx` | CREATE | Single column component |
| `pages/TodosPage.tsx` | MODIFY | Major refactor for new layout |
| `features/todos/index.ts` | MODIFY | Export new components |

---

## Success Criteria

1. ViewToggle shows three options with glassmorphism design
2. Cannot deselect the last active view
3. InboxPanel shows only `boardColumnId === 1` tasks
4. BoardPanel shows columns 2-4 (excludes Inbox)
5. PlannerPanel shows calendar with droppable date cells
6. Panels smoothly expand/collapse when toggled
7. Drag-and-drop works between all panels

---

## Dependencies

- **Requires**: Phase 1 (Backend Foundation), Phase 2 (DnD Setup)
- **Enables**: Phase 4 (Service Layer Updates)

---

## Next Phase

After completing this phase, proceed to **Phase 4: Service Layer Updates**.