# Plan 6 Phase 4: Frontend - PlannerTodoCard Update

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

### Planner Todo Card

```
┌───────────────────────────────────┐
│ █ Task description here...        │  ← 左侧 4px 颜色条
└───────────────────────────────────┘
```

**颜色来源**：直接读取 `todo.color`（API 已拼装好），若为 `null` 使用 `#9CA3AF`

---

## Phase 4: Frontend - PlannerTodoCard Update

> Risk: Low
> Dependencies: Phase 1

### Task 4.1: Update PlannerTodoCard Component

**File**: `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx`

**Action**: Use todo.color (already populated from API)

```typescript
import { cn } from '@/lib/utils'
import type { Todo } from '@nanomail/shared'

// Fallback color for null color values
const FALLBACK_COLOR = '#9CA3AF' // gray-400

export interface PlannerTodoCardProps {
  todo: Todo
  onClick?: () => void
  className?: string
}

/**
 * PlannerTodoCard - Minimal todo card for the planner scheduler view.
 *
 * Design: Color bar (4px) on left + title only (no description).
 * Color is read directly from todo.color field (populated from API JOIN).
 */
export function PlannerTodoCard({ todo, onClick, className }: PlannerTodoCardProps) {
  // Use todo's own color, fallback to neutral gray if null
  const color = todo.color ?? FALLBACK_COLOR

  return (
    <div
      data-testid={`planner-todo-card-${todo.id}`}
      className={cn(
        'flex items-center gap-1.5 px-1.5 py-1 rounded-sm',
        'bg-white border border-gray-100',
        'hover:bg-gray-50 transition-colors',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Color bar - 4px width */}
      <div
        data-testid={`planner-todo-card-color-bar-${todo.id}`}
        className="w-1 h-4 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      {/* Title - truncated to single line */}
      <span className="text-xs text-gray-900 truncate flex-1">
        {todo.description}
      </span>
    </div>
  )
}
```

**Key Points**:
- Since API already returns `color` field from JOIN, no column lookup needed
- Use `todo.color` directly
- Apply `FALLBACK_COLOR` when `todo.color` is null

---

## Files Changed (Phase 4)

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx` | MODIFY |

---

## Testing Checklist (Phase 4)

- [ ] PlannerTodoCard uses todo.color for color bar
- [ ] PlannerTodoCard fallback to gray when color is null