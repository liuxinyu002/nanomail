# Plan 6 Phase 3: Frontend - BoardColumnDroppable Styling

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

## UI Design Specifications

### Board Column Styling

```
┌─────────────────────────────────────┐
│  Column Header (列颜色背景)          │
│  ┌─────────────────────────────────┐│
│  │ [标题]                    [n] ⋮ ││
│  └─────────────────────────────────┘│
├─────────────────────────────────────┤
│  Card Area (列颜色 12% 透明度)       │
│  ┌─────────────────────────────────┐│
│  │ [白底卡片 + shadow-sm]           ││
│  │ Task description here...        ││
│  └─────────────────────────────────┘│
│  ┌─────────────────────────────────┐│
│  │ [白底卡片 + shadow-sm]           ││
│  │ Another task...                 ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

**关键点**：
- 头部背景：列颜色 `#HEX`
- 卡片区域背景：列颜色 `opacity: 0.12`（CSS 透明度叠加）
- 待办卡片：纯白 `#FFFFFF` + 轻微阴影 `shadow-sm`
- 移除：2x2 小圆点颜色徽标

---

## Phase 3: Frontend - BoardColumnDroppable Styling

> Risk: Low
> Dependencies: Phase 2

### Task 3.1: Update BoardColumnDroppable Component

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**Action**: Add colored background to card area with CSS overlay

```typescript
const FALLBACK_BG_COLOR = '#F7F8FA' // Original neutral background

export function BoardColumnDroppable({
  column,
  todos,
  className,
  onRename,
  onColorChange,
  onDelete,
}: BoardColumnDroppableProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `column-${column.id}`,
    data: {
      type: 'board',
      columnId: column.id,
    },
  })

  const todoIds = todos.map(t => t.id)
  const isEmpty = todos.length === 0
  const showEmptyState = isEmpty && !isOver
  const showDropIndicator = isOver && isEmpty

  // Determine background color
  const columnColor = column.color ?? FALLBACK_BG_COLOR

  return (
    <div
      data-testid="board-column-droppable"
      className={cn(
        'flex flex-col rounded-lg overflow-hidden',
        'border border-gray-200',
        className
      )}
    >
      {/* Column Header - with colored background */}
      <ColumnHeader
        column={column}
        itemCount={todos.length}
        onRename={onRename || (() => {})}
        onColorChange={onColorChange || (() => {})}
        onDelete={onDelete || (() => {})}
      />

      {/* Card Area - with colored overlay */}
      <div
        className={cn(
          'flex-1 min-h-[200px] relative',
          'transition-colors duration-200'
        )}
        style={{ backgroundColor: '#FFFFFF' }} // Base white
      >
        {/* Color overlay layer - 12% opacity */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: columnColor,
            opacity: 0.12
          }}
        />

        {/* Content layer */}
        <div
          ref={setNodeRef}
          data-testid="droppable-zone"
          className={cn(
            'relative z-10 p-3',
            isOver && 'ring-2 ring-blue-400 ring-inset'
          )}
        >
          {showEmptyState ? (
            <EmptyState
              message={`No tasks in ${column.name}`}
              className="min-h-[160px]"
            />
          ) : (
            <SortableContext items={todoIds} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {todos.map(todo => (
                  <DraggableTodoItem key={todo.id} todo={todo} />
                ))}
              </div>
            </SortableContext>
          )}

          {showDropIndicator && (
            <div
              data-testid="drop-indicator"
              className="border-2 border-dashed border-blue-500 rounded-md p-4 mt-2"
            >
              <p className="text-blue-500 text-sm text-center">
                Drop here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

### Task 3.2: Update TodoItem/TodoCard Styling

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx`

**Action**: Ensure white background with shadow-sm

```typescript
export function TodoCard({ todo, ... }: TodoCardProps) {
  return (
    <div
      data-testid="todo-card"
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-md cursor-pointer',
        'shadow-sm', // Changed from custom shadow to shadow-sm
        'hover:shadow-md', // Slightly stronger on hover
        'transition-shadow',
        'p-4 mb-2',
        'border border-gray-100', // Subtle border for definition
        className
      )}
    >
      {/* ... existing content ... */}
    </div>
  )
}
```

**Key Changes**:
1. Use `shadow-sm` for consistent light shadow
2. Add subtle `border border-gray-100` for edge definition
3. Ensure `bg-white` is explicitly set

---

## Files Changed (Phase 3)

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | MODIFY |
| `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx` | MODIFY |

---

## Testing Checklist (Phase 3)

- [ ] BoardColumnDroppable card area has 12% color overlay
- [ ] TodoCard has white background with shadow-sm