# Plan 3 Phase 4: PlannerPanel Integration

> Part of: Planner Component Refactor
> Previous: Phase 3 (Week View Implementation)
> Next: Phase 5 (Drag-Drop Integration)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### View Switching
- Default view: Day View
- Toggle via Segmented Control in Header (日/周 buttons, not dropdown)
- Persist view preference in component state (no localStorage needed for MVP)

### Data Model
- Reuse existing `deadline` field for time positioning
- On drag from Inbox to Planner:
  - Set `deadline` to the target datetime
  - Change `boardColumnId = 2` (Todo column)
- Three-panel linkage: Optimistic Update (card disappears from Inbox, appears in Planner + Board)

### Design System Compliance
- Follow `docs/SPEC/design-system.md`
- Animations: fade-in 150ms ease-out, fade-out 100ms ease-in
- No scale effects for menus (but OK for drag feedback)
- Colors: blue-600 for primary, gray-50 for hover states

---

## Architecture

### Component Structure (Phase 4 additions)
```
packages/frontend/src/features/todos/
├── PlannerPanel.tsx          # MODIFIED: Add view switching
└── planner/
    └── PlannerViewToggle.tsx # NEW: View toggle control
```

### Data Flow
```
TodosPage
  └── DndProvider
        └── PlannerPanel
              ├── Header
              │     ├── Title: "Planner"
              │     └── PlannerViewToggle (日/周)
              ├── view === 'day' ? DayView : WeekView
              └── (Droppable container for legacy support)
```

---

## Phase 4 Tasks (2 files)

### Step 4.1: Create PlannerViewToggle component

- **File**: `packages/frontend/src/features/todos/planner/PlannerViewToggle.tsx`
- **Action**: Create segmented control for Day/Week view toggle
- **Why**: Clean UI component following design system
- **Dependencies**: None
- **Risk**: Low

**Implementation notes**:
- Segmented control style (pill buttons side by side)
- Labels: "日" and "周"
- Active state: `bg-primary text-primary-foreground`
- Inactive: `bg-transparent text-muted-foreground hover:bg-muted`
- No scale effects (per design system)

**Props interface**:
```typescript
interface PlannerViewToggleProps {
  value: 'day' | 'week'
  onChange: (value: 'day' | 'week') => void
  className?: string
}
```

**Example structure**:
```tsx
import { cn } from '@/lib/utils'

export function PlannerViewToggle({ value, onChange, className }: PlannerViewToggleProps) {
  return (
    <div className={cn('inline-flex rounded-lg border p-0.5', className)}>
      <button
        onClick={() => onChange('day')}
        className={cn(
          'px-3 py-1 text-sm rounded-md transition-colors',
          value === 'day'
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent text-muted-foreground hover:bg-muted'
        )}
      >
        日
      </button>
      <button
        onClick={() => onChange('week')}
        className={cn(
          'px-3 py-1 text-sm rounded-md transition-colors',
          value === 'week'
            ? 'bg-primary text-primary-foreground'
            : 'bg-transparent text-muted-foreground hover:bg-muted'
        )}
      >
        周
      </button>
    </div>
  )
}
```

---

### Step 4.2: Modify PlannerPanel component

- **File**: `packages/frontend/src/features/todos/PlannerPanel.tsx`
- **Action**: Refactor to include view switching logic
- **Why**: Integrate Day/Week views with existing panel structure
- **Dependencies**: Phase 2 (DayView), Phase 3 (WeekView), Phase 4 Step 4.1 (PlannerViewToggle)
- **Risk**: Medium

**Changes**:
- Add `view` state ('day' | 'week')
- Add `currentDate` state for DayView
- Add `weekStart` state for WeekView
- Replace `TodoCalendar` with DayView/WeekView
- Add PlannerViewToggle in header
- Keep existing droppable functionality

**New structure**:
```tsx
import { useState, useMemo } from 'react'
import { startOfWeek } from 'date-fns'
import { DayView, WeekView } from './planner'
import { PlannerViewToggle } from './planner/PlannerViewToggle'
import type { TodoItem } from '@nanomail/shared'

interface PlannerPanelProps {
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
  className?: string
}

export function PlannerPanel({ todos, onTodoClick, className }: PlannerPanelProps) {
  const [view, setView] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Filter todos for planner (have deadline and boardColumnId === 2)
  const plannerTodos = useMemo(() => {
    return todos.filter(t => t.deadline !== null && t.boardColumnId === 2)
  }, [todos])

  // Calculate week start for WeekView
  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate])

  // Count of scheduled tasks
  const scheduledCount = plannerTodos.length

  return (
    <div className={cn('flex flex-col bg-background rounded-lg border', className)}>
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Planner</h2>
          <span className="text-sm text-muted-foreground">({scheduledCount} scheduled)</span>
        </div>
        <PlannerViewToggle value={view} onChange={setView} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'day' ? (
          <DayView
            date={currentDate}
            todos={plannerTodos}
            onTodoClick={onTodoClick}
            className="h-full"
          />
        ) : (
          <WeekView
            weekStart={weekStart}
            todos={plannerTodos}
            onTodoClick={onTodoClick}
            className="h-full"
          />
        )}
      </div>
    </div>
  )
}
```

**Key changes from original**:

1. **Remove TodoCalendar import and usage**
2. **Add view state** with 'day' as default
3. **Add currentDate state** for navigation within DayView
4. **Filter todos** to only show items with deadline AND boardColumnId === 2
5. **Add PlannerViewToggle** in header
6. **Conditionally render** DayView or WeekView based on view state
7. **Show scheduled count** in header

---

## Dependencies

### Phase 1-3 Dependencies (must be complete)
- `planner/index.ts` - Barrel export
- `TimeAxis.tsx` - 24-hour time axis
- `CurrentTimeIndicator.tsx` - Red line + dot indicator
- `HourSlot.tsx` - Droppable hour container
- `PlannerTodoCard.tsx` - Compact todo card
- `DayView.tsx` - Day view container
- `WeekView.tsx` - Week view container

### External Dependencies (already installed)
- `date-fns` - Date manipulation (startOfWeek)

### Internal Dependencies
- `@nanomail/shared` - Todo types and schemas
- `@/lib/utils` - Utility functions (cn)

---

## Risks & Mitigations

### Risk 1: Breaking Existing Droppable Functionality
- **Description**: PlannerPanel may have existing droppable wrapper that conflicts with HourSlot droppables
- **Mitigation**: Review existing code, ensure droppable IDs are unique, test drag-drop thoroughly

### Risk 2: State Management Complexity
- **Description**: Managing currentDate and weekStart states could lead to sync issues
- **Mitigation**: Derive weekStart from currentDate using useMemo, ensure single source of truth

### Risk 3: Performance with Large Todo Lists
- **Description**: Filtering todos on every render could be slow with many items
- **Mitigation**: Use useMemo for filtering, consider moving filter logic to parent component

---

## Success Criteria (Phase 4)

- [ ] `PlannerViewToggle` component renders with 日/周 buttons
- [ ] Clicking toggle switches between Day and Week views
- [ ] Active button shows primary styling
- [ ] `PlannerPanel` renders DayView by default
- [ ] `PlannerPanel` filters todos correctly (deadline + boardColumnId === 2)
- [ ] Header shows count of scheduled tasks
- [ ] View switching preserves todo list and scroll position
- [ ] No TypeScript errors in PlannerPanel
- [ ] No console errors on view toggle

---

## Next Phase

Proceed to **Phase 5: Drag-Drop Integration** after completing Phase 4.