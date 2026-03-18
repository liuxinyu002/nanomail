# Plan 3 Phase 3: Week View Implementation

> Part of: Planner Component Refactor
> Previous: Phase 2 (Day View Implementation)
> Next: Phase 4 (PlannerPanel Integration)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### Week View Structure
- Classic 7-column grid layout (like Google Calendar)
- **CRITICAL: Minimum column width + horizontal scroll**
  - Planner panel typically occupies ~35% of screen width (400-500px)
  - Each day column must have `min-w-[140px]` or `min-w-[160px]`
  - Parent container must have `overflow-x-auto` for horizontal scroll
  - **Do NOT attempt to squeeze 7 days into narrow viewport**
- Left side: 24-hour time axis (same as Day View)
- Right side: 7 day columns (Sunday to Saturday) with horizontal scroll
- Header row with day names and dates (sticky while scrolling)
- Current day column highlighted with subtle background
- Current time indicator spans across all columns

### Data Model
- Reuse existing `deadline` field for time positioning
- On drag from Inbox to Planner:
  - Set `deadline` to the target datetime
  - Change `boardColumnId = 2` (Todo column)
- Three-panel linkage: Optimistic Update (card disappears from Inbox, appears in Planner + Board)

### Drag Animation (@dnd-kit only)
- Drag feedback: `shadow-lg` + `scale(0.95)` on dragged item
- Placeholder: themed border empty box (`border-2 border-dashed border-gray-300`)
- Use `DragOverlay` for natural transitions during drag
- No external animation libraries

### Design System Compliance
- Follow `docs/SPEC/design-system.md`
- Animations: fade-in 150ms ease-out, fade-out 100ms ease-in
- No scale effects for menus (but OK for drag feedback)
- Colors: blue-600 for primary, gray-50 for hover states

---

## Architecture

### Component Structure (Phase 3 additions)
```
packages/frontend/src/features/todos/planner/
├── WeekView.tsx              # Week view container
└── WeekView.test.tsx         # Unit tests
```

### Data Flow
```
PlannerPanel
  └── WeekView
        ├── Header (Day names + dates, sticky)
        ├── TimeAxis (from Phase 1)
        ├── Day Column 1 (Sun) ─── HourSlot x 24
        ├── Day Column 2 (Mon) ─── HourSlot x 24
        ├── ...
        └── Day Column 7 (Sat) ─── HourSlot x 24
```

---

## Phase 3 Tasks (2 files)

### Step 3.1: Create WeekView component

- **File**: `packages/frontend/src/features/todos/planner/WeekView.tsx`
- **Action**: Create week view with 7-column grid
- **Why**: Alternative view for planning across multiple days
- **Dependencies**: Phase 1 (TimeAxis, CurrentTimeIndicator), Phase 2 (HourSlot, PlannerTodoCard)
- **Risk**: Medium

**Implementation notes**:
- Props: `weekStart` (Date - Sunday), `todos`, `onTodoClick`
- Header row: day names + dates (Sun-Sat)
- Current day column highlighted
- Grid layout: 1 column for TimeAxis + 7 columns for days
- Each day column has 24 HourSlots stacked vertically
- CurrentTimeIndicator spans all columns

**Props interface**:
```typescript
interface WeekViewProps {
  weekStart: Date  // Should be a Sunday
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
  className?: string
}
```

**Layout structure**:
```tsx
import { startOfWeek, addDays, format, isSameDay } from 'date-fns'

export function WeekView({ weekStart, todos, onTodoClick, className }: WeekViewProps) {
  const days = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i))
  const today = new Date()

  // Group todos by date and hour
  const todosByDateHour = useMemo(() => {
    const grouped: Record<string, Record<number, TodoItem[]>> = {}
    todos.forEach(todo => {
      if (todo.deadline) {
        const dateKey = format(new Date(todo.deadline), 'yyyy-MM-dd')
        const hour = new Date(todo.deadline).getHours()
        if (!grouped[dateKey]) grouped[dateKey] = {}
        if (!grouped[dateKey][hour]) grouped[dateKey][hour] = []
        grouped[dateKey][hour].push(todo)
      }
    })
    return grouped
  }, [todos])

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header: Day names and dates (sticky) */}
      <div className="flex border-b shrink-0 sticky top-0 bg-background z-10">
        <div className="w-16 shrink-0" /> {/* TimeAxis spacer */}
        <div className="flex overflow-x-auto flex-1">
          {days.map(day => (
            <div
              key={day.toISOString()}
              className={cn(
                'min-w-[140px] flex-1 text-center p-2 border-l',
                isSameDay(day, today) && 'bg-blue-50'
              )}
            >
              <div className="text-sm font-medium">{format(day, 'EEE')}</div>
              <div className="text-xs text-muted-foreground">{format(day, 'd')}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Grid: TimeAxis + Day columns with horizontal scroll */}
      <div className="flex flex-1 overflow-hidden">
        <TimeAxis className="shrink-0" />
        {/* CRITICAL: Horizontal scroll container for day columns */}
        <div className="flex-1 overflow-x-auto">
          <div className="flex h-full">
            {days.map(day => (
              <div
                key={day.toISOString()}
                className={cn(
                  'min-w-[140px] border-l overflow-y-auto',
                  isSameDay(day, today) && 'bg-blue-50/30'
                )}
              >
                {Array.from({ length: 24 }).map((_, hour) => (
                  <HourSlot
                    key={hour}
                    date={day}
                    hour={hour}
                    todos={todosByDateHour[format(day, 'yyyy-MM-dd')]?.[hour] || []}
                    onTodoClick={onTodoClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

**Key implementation details**:

1. **Minimum column width**: Each day column has `min-w-[140px]` to ensure usability in narrow viewports
2. **Horizontal scroll**: The day columns container has `overflow-x-auto` to enable scrolling
3. **Current day highlight**: Use `isSameDay` to check if column is today, apply subtle blue background
4. **Sticky header**: Header row uses `sticky top-0` to stay visible while scrolling vertically
5. **TimeAxis alignment**: Fixed width spacer (`w-16`) aligns with TimeAxis component

---

### Step 3.2: Create WeekView test file

- **File**: `packages/frontend/src/features/todos/planner/WeekView.test.tsx`
- **Action**: Write unit tests for WeekView component
- **Why**: Ensure correct rendering and behavior
- **Dependencies**: Step 3.1 (WeekView)
- **Risk**: Low

**Test cases**:
- Renders 7 day columns
- Renders TimeAxis
- Displays todos in correct day/hour slots
- Highlights current day
- Shows empty state when no todos

**Example test structure**:
```tsx
import { render, screen } from '@testing-library/react'
import { WeekView } from './WeekView'
import { startOfWeek } from 'date-fns'

describe('WeekView', () => {
  const mockTodos: TodoItem[] = [
    { id: 1, title: 'Monday Task', deadline: '2024-01-15T10:00:00', boardColumnId: 2 }, // Monday
    { id: 2, title: 'Wednesday Task', deadline: '2024-01-17T14:00:00', boardColumnId: 2 }, // Wednesday
  ]

  const weekStart = startOfWeek(new Date('2024-01-15')) // Sunday Jan 14

  it('renders 7 day columns', () => {
    render(<WeekView weekStart={weekStart} todos={mockTodos} />)

    // Verify 7 day columns are rendered
    const dayColumns = screen.getAllByTestId('day-column')
    expect(dayColumns).toHaveLength(7)
  })

  it('renders TimeAxis', () => {
    render(<WeekView weekStart={weekStart} todos={mockTodos} />)

    // TimeAxis should be present
    expect(screen.getByTestId('time-axis')).toBeInTheDocument()
  })

  it('displays todos in correct day/hour slots', () => {
    render(<WeekView weekStart={weekStart} todos={mockTodos} />)

    // Check that todos appear in correct day columns
    expect(screen.getByText('Monday Task')).toBeInTheDocument()
    expect(screen.getByText('Wednesday Task')).toBeInTheDocument()
  })

  it('highlights current day', () => {
    const today = new Date()
    const thisWeekStart = startOfWeek(today)

    render(<WeekView weekStart={thisWeekStart} todos={[]} />)

    // Current day column should have highlight class
    const todayColumn = screen.getByTestId(`day-column-${format(today, 'yyyy-MM-dd')}`)
    expect(todayColumn).toHaveClass('bg-blue-50')
  })

  it('shows empty state when no todos', () => {
    render(<WeekView weekStart={weekStart} todos={[]} />)

    // All hour slots should show dashed border placeholder
    const emptySlots = screen.getAllByTestId('hour-slot-empty')
    // 7 days * 24 hours = 168 empty slots
    expect(emptySlots).toHaveLength(168)
  })
})
```

---

## Dependencies

### Phase 1 Dependencies (must be complete)
- `planner/index.ts` - Barrel export
- `TimeAxis.tsx` - 24-hour time axis
- `CurrentTimeIndicator.tsx` - Red line + dot indicator

### Phase 2 Dependencies (must be complete)
- `HourSlot.tsx` - Droppable hour container
- `PlannerTodoCard.tsx` - Compact todo card
- `DayView.tsx` - Day view container (for reference)

### External Dependencies (already installed)
- `@dnd-kit/core` - Drag-drop core
- `date-fns` - Date manipulation (startOfWeek, addDays, format, isSameDay)

### Internal Dependencies
- `@nanomail/shared` - Todo types and schemas
- `@/lib/utils` - Utility functions (cn)

---

## Risks & Mitigations

### Risk 1: Horizontal Scroll UX
- **Description**: Users may not realize they can scroll horizontally in narrow viewports
- **Mitigation**: Add subtle scroll indicators or arrows when content overflows

### Risk 2: Performance with 168 HourSlots
- **Description**: 7 days * 24 hours = 168 HourSlot components could impact performance
- **Mitigation**: Consider virtualization for week view, or lazy render hours outside visible range

### Risk 3: Touch Device Support
- **Description**: Horizontal scroll may conflict with swipe gestures on touch devices
- **Mitigation**: Test on touch devices, consider alternative navigation for mobile

---

## Success Criteria (Phase 3)

- [ ] `WeekView` renders 7 day columns (Sun-Sat)
- [ ] Each day column has `min-w-[140px]` minimum width
- [ ] Horizontal scroll works correctly in narrow viewports
- [ ] Header row is sticky during vertical scroll
- [ ] Current day column is highlighted
- [ ] TimeAxis aligns correctly on the left
- [ ] Todos display in correct day/hour slots
- [ ] Empty hour slots show dashed border placeholder
- [ ] Unit tests pass for WeekView component

---

## Next Phase

Proceed to **Phase 4: PlannerPanel Integration** after completing Phase 3.