# Plan 3 Phase 1: Infrastructure Setup

> Part of: Planner Component Refactor
> Previous: None
> Next: Phase 2 (Day View Implementation)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### View Switching
- Default view: Day View
- Toggle via Segmented Control in Header (日/周 buttons, not dropdown)
- Persist view preference in component state (no localStorage needed for MVP)

### Day View Structure
- Fixed 24-hour timeline render (0:00 - 23:59)
- Auto-scroll to current time minus 1-2 hours on mount
- Hour slot height: `min-h-[60px]` to `min-h-[80px]`
- Current time indicator: red line + dot (absolute positioned, updates every minute)
- Multiple tasks in same hour: flex-col stack with auto height
- Empty hour slots show subtle dashed border placeholder

### Week View Structure
- Classic 7-column grid layout (like Google Calendar)
- **CRITICAL: Minimum column width + horizontal scroll**
  - Planner panel typically occupies ~35% of screen width (400-500px)
  - Each day column must have `min-w-[140px]` or `min-w-[160px]`
  - Parent container must have `overflow-x-auto` for horizontal scroll
- Left side: 24-hour time axis (same as Day View)
- Right side: 7 day columns (Sunday to Saturday) with horizontal scroll

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

### New Component Structure
```
packages/frontend/src/features/todos/
├── PlannerPanel.tsx              # Main container with view switching (MODIFIED)
├── planner/
│   ├── index.ts                  # Barrel export
│   ├── DayView.tsx               # Day view container
│   ├── WeekView.tsx              # Week view container
│   ├── TimeAxis.tsx              # Left time axis (0:00 - 23:00)
│   ├── HourSlot.tsx              # Single hour slot (droppable)
│   ├── CurrentTimeIndicator.tsx  # Red line + dot indicator
│   └── PlannerTodoCard.tsx       # Compact todo card for Planner
```

### Data Flow
```
TodosPage
  └── DndProvider
        └── PlannerPanel
              ├── Header (ViewToggle: 日/周)
              ├── DayView / WeekView
              │     ├── TimeAxis
              │     └── HourSlot (droppable)
              │           └── PlannerTodoCard
              └── CurrentTimeIndicator
```

---

## Phase 1 Tasks (3 files)

### Step 1.1: Create planner directory structure

- **File**: `packages/frontend/src/features/todos/planner/index.ts`
- **Action**: Create barrel export file
- **Why**: Clean import paths for planner sub-components
- **Dependencies**: None
- **Risk**: Low

```typescript
// planner/index.ts
export { DayView } from './DayView'
export { WeekView } from './WeekView'
export { TimeAxis } from './TimeAxis'
export { HourSlot } from './HourSlot'
export { CurrentTimeIndicator } from './CurrentTimeIndicator'
export { PlannerTodoCard } from './PlannerTodoCard'
```

---

### Step 1.2: Create TimeAxis component

- **File**: `packages/frontend/src/features/todos/planner/TimeAxis.tsx`
- **Action**: Create time axis displaying 24 hours (0:00 - 23:00)
- **Why**: Reusable component for both Day and Week views
- **Dependencies**: None
- **Risk**: Low

**Implementation notes**:
- Render 24 hour labels in a column
- Use `text-xs text-muted-foreground` for labels
- Fixed width: `w-16` (64px)
- Hour labels align with HourSlot components

**Props interface**:
```typescript
interface TimeAxisProps {
  className?: string
}
```

**Example structure**:
```tsx
export function TimeAxis({ className }: TimeAxisProps) {
  return (
    <div className={cn('w-16 shrink-0', className)}>
      {Array.from({ length: 24 }).map((_, hour) => (
        <div
          key={hour}
          className="h-[60px] flex items-start justify-end pr-2 pt-0"
        >
          <span className="text-xs text-muted-foreground">
            {hour.toString().padStart(2, '0')}:00
          </span>
        </div>
      ))}
    </div>
  )
}
```

---

### Step 1.3: Create CurrentTimeIndicator component

- **File**: `packages/frontend/src/features/todos/planner/CurrentTimeIndicator.tsx`
- **Action**: Create current time indicator with red line and dot
- **Why**: Visual reference for current time in scheduler
- **Dependencies**: None
- **Risk**: Low

**Implementation notes**:
- Absolute positioned relative to timeline container
- Red dot (8px circle) + horizontal red line
- Update position every minute via `setInterval`
- Calculate position based on current hour/minute

**Props interface**:
```typescript
interface CurrentTimeIndicatorProps {
  containerRef: React.RefObject<HTMLElement>
  className?: string
}
```

**Example structure**:
```tsx
export function CurrentTimeIndicator({ containerRef, className }: CurrentTimeIndicatorProps) {
  const [position, setPosition] = useState(0)

  useEffect(() => {
    const updatePosition = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      // Calculate position: each hour = 60px, each minute = 1px
      setPosition(hours * 60 + minutes)
    }

    updatePosition()
    const interval = setInterval(updatePosition, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div
      className={cn('absolute left-0 right-0 flex items-center z-10', className)}
      style={{ top: `${position}px` }}
    >
      <div className="w-2 h-2 rounded-full bg-red-500 ml-14" />
      <div className="flex-1 h-[2px] bg-red-500" />
    </div>
  )
}
```

---

## Dependencies

### External Dependencies (already installed)
- `@dnd-kit/core` - Drag-drop core
- `@dnd-kit/utilities` - CSS transforms
- `date-fns` - Date manipulation
- `lucide-react` - Icons

### Internal Dependencies
- `@nanomail/shared` - Todo types and schemas
- `@/components/ui` - UI primitives
- `@/lib/utils` - Utility functions (cn)

---

## Success Criteria (Phase 1)

- [ ] `planner/index.ts` barrel export created
- [ ] `TimeAxis` component renders 24 hour labels correctly
- [ ] `CurrentTimeIndicator` component shows red line + dot at current time
- [ ] `CurrentTimeIndicator` updates position every minute
- [ ] All new components exportable from `planner/index.ts`

---

## Next Phase

Proceed to **Phase 2: Day View Implementation** after completing Phase 1.