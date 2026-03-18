# Implementation Plan: Planner Component Refactor

## Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements

### 1. View Switching
- Default view: Day View
- Toggle via Segmented Control in Header (日/周 buttons, not dropdown)
- Persist view preference in component state (no localStorage needed for MVP)

### 2. Day View Structure
- Fixed 24-hour timeline render (0:00 - 23:59)
- Auto-scroll to current time minus 1-2 hours on mount
- Hour slot height: `min-h-[60px]` to `min-h-[80px]`
- Current time indicator: red line + dot (absolute positioned, updates every minute)
- Multiple tasks in same hour: flex-col stack with auto height
- Empty hour slots show subtle dashed border placeholder

### 3. Week View Structure
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

### 4. Data Model
- Reuse existing `deadline` field for time positioning
- On drag from Inbox to Planner:
  - Set `deadline` to the target datetime
  - Change `boardColumnId = 2` (Todo column)
- Three-panel linkage: Optimistic Update (card disappears from Inbox, appears in Planner + Board)

### 5. Drag Animation (@dnd-kit only)
- Drag feedback: `shadow-lg` + `scale(0.95)` on dragged item
- Placeholder: themed border empty box (`border-2 border-dashed border-gray-300`)
- Use `DragOverlay` for natural transitions during drag
- No external animation libraries

### 6. Design System Compliance
- Follow `docs/SPEC/design-system.md`
- Animations: fade-in 150ms ease-out, fade-out 100ms ease-in
- No scale effects for menus (but OK for drag feedback)
- Colors: blue-600 for primary, gray-50 for hover states

---

## Architecture Changes

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

## Implementation Steps

### Phase 1: Infrastructure Setup (3 files)

#### Step 1.1: Create planner directory structure
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

#### Step 1.2: Create TimeAxis component
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

#### Step 1.3: Create CurrentTimeIndicator component
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

---

### Phase 2: Day View Implementation (4 files)

#### Step 2.1: Create HourSlot component
- **File**: `packages/frontend/src/features/todos/planner/HourSlot.tsx`
- **Action**: Create droppable hour slot component
- **Why**: Core building block for day/week timeline
- **Dependencies**: Step 1.1 (planner directory)
- **Risk**: Medium (dnd-kit integration)

**Implementation notes**:
- Accept `hour` (0-23), `date` (Date), and `todos` (TodoItem[])
- Use `useDroppable` with id `planner-hour-{date}-{hour}`
- Pass `date` and `hour` in droppable data for drag handling
- Visual feedback on drag-over: `bg-blue-50 ring-2 ring-blue-300`
- Render `PlannerTodoCard` for each todo in this hour

**Props interface**:
```typescript
interface HourSlotProps {
  date: Date
  hour: number
  todos: TodoItem[]
  onTodoClick?: (todo: TodoItem) => void
  className?: string
}
```

#### Step 2.2: Create PlannerTodoCard component
- **File**: `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx`
- **Action**: Create compact todo card optimized for planner display
- **Why**: Smaller footprint than regular TodoItem for timeline view
- **Dependencies**: None
- **Risk**: Low

**Implementation notes**:
- **CRITICAL: Minimal design for vertical space efficiency**
  - Only render: **color bar (board status indicator) + title (single line, truncate)**
  - **DO NOT render description** - wastes precious vertical space in timeline grid
  - Users can click card to open detail modal for full information
- Color bar: 3-4px width on left edge, color based on boardColumnId
- Title: `truncate` class, single line, max 1 line
- Compact padding: `p-1` or `py-0.5 px-1`
- Click to open detail/edit modal

**Props interface**:
```typescript
interface PlannerTodoCardProps {
  todo: TodoItem
  onClick?: () => void
  className?: string
}
```

#### Step 2.3: Create DayView component
- **File**: `packages/frontend/src/features/todos/planner/DayView.tsx`
- **Action**: Create day view with 24-hour timeline
- **Why**: Default view for Planner panel
- **Dependencies**: Step 1.2 (TimeAxis), Step 1.3 (CurrentTimeIndicator), Step 2.1 (HourSlot), Step 2.2 (PlannerTodoCard)
- **Risk**: Medium

**Implementation notes**:
- Props: `date`, `todos`, `onTodoClick`
- Filter todos by date (matching deadline date)
- Render TimeAxis on left, HourSlots in main area
- Group todos by hour for each HourSlot
- **Container requirements for auto-scroll safety**:
  - Parent container must have `overflow-y-auto` and fixed height
  - This prevents `scrollIntoView` from scrolling the entire page body
- CurrentTimeIndicator overlays the timeline

**Auto-scroll logic**:
```typescript
useEffect(() => {
  if (timelineRef.current) {
    const currentHour = new Date().getHours()
    const targetHour = Math.max(0, currentHour - 2)
    const hourElement = timelineRef.current.querySelector(`[data-hour="${targetHour}"]`)

    // SAFE: Use scrollTop calculation instead of scrollIntoView to avoid page scroll
    if (hourElement && timelineRef.current) {
      const containerHeight = timelineRef.current.clientHeight
      const targetOffset = hourElement.getBoundingClientRect().top - timelineRef.current.getBoundingClientRect().top
      timelineRef.current.scrollTop = targetOffset - containerHeight / 4
    }
  }
}, [])
```

**Alternative safe approach**:
```typescript
// If using scrollIntoView, ensure it stays within container
hourElement?.scrollIntoView({
  behavior: 'smooth',
  block: 'start',
  // Prevent bubbling to outer scroll containers
})
```

#### Step 2.4: Create DayView test file
- **File**: `packages/frontend/src/features/todos/planner/DayView.test.tsx`
- **Action**: Write unit tests for DayView component
- **Why**: Ensure correct rendering and behavior
- **Dependencies**: Step 2.3 (DayView)
- **Risk**: Low

**Test cases**:
- Renders 24 hour slots
- Displays todos in correct hour slots
- Shows empty state when no todos
- Auto-scrolls to current time on mount
- CurrentTimeIndicator renders correctly

---

### Phase 3: Week View Implementation (2 files)

#### Step 3.1: Create WeekView component
- **File**: `packages/frontend/src/features/todos/planner/WeekView.tsx`
- **Action**: Create week view with 7-column grid
- **Why**: Alternative view for planning across multiple days
- **Dependencies**: Step 1.2 (TimeAxis), Step 1.3 (CurrentTimeIndicator), Step 2.1 (HourSlot), Step 2.2 (PlannerTodoCard)
- **Risk**: Medium

**Implementation notes**:
- Props: `weekStart` (Date - Sunday), `todos`, `onTodoClick`
- Header row: day names + dates (Sun-Sat)
- Current day column highlighted
- Grid layout: 1 column for TimeAxis + 7 columns for days
- Each day column has 24 HourSlots stacked vertically
- CurrentTimeIndicator spans all columns

**Layout structure**:
```tsx
<div className="flex flex-col h-full">
  {/* Header: Day names and dates (sticky) */}
  <div className="flex border-b shrink-0 sticky top-0 bg-background z-10">
    <div className="w-16 shrink-0" /> {/* TimeAxis spacer */}
    <div className="flex overflow-x-auto">
      {days.map(day => (
        <div key={day} className="min-w-[140px] flex-1 text-center p-2 border-l">
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
          <div key={day} className="min-w-[140px] border-l overflow-y-auto">
            {Array.from({ length: 24 }).map((_, hour) => (
              <HourSlot key={hour} date={day} hour={hour} todos={todosForDayHour} />
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
</div>
```

#### Step 3.2: Create WeekView test file
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

---

### Phase 4: PlannerPanel Integration (2 files)

#### Step 4.1: Create PlannerViewToggle component
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

#### Step 4.2: Modify PlannerPanel component
- **File**: `packages/frontend/src/features/todos/PlannerPanel.tsx`
- **Action**: Refactor to include view switching logic
- **Why**: Integrate Day/Week views with existing panel structure
- **Dependencies**: Phase 2, Phase 3, Step 4.1
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
export function PlannerPanel({ todos, onTodoClick, className }: PlannerPanelProps) {
  const [view, setView] = useState<'day' | 'week'>('day')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Filter todos for planner (have deadline and boardColumnId === 2)
  const plannerTodos = useMemo(() => {
    return todos.filter(t => t.deadline !== null && t.boardColumnId === 2)
  }, [todos])

  return (
    <div className="flex flex-col bg-background rounded-lg border">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="text-lg font-semibold">Planner</h2>
        <PlannerViewToggle value={view} onChange={setView} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === 'day' ? (
          <DayView date={currentDate} todos={plannerTodos} onTodoClick={onTodoClick} />
        ) : (
          <WeekView weekStart={startOfWeek(currentDate)} todos={plannerTodos} onTodoClick={onTodoClick} />
        )}
      </div>
    </div>
  )
}
```

---

### Phase 5: Drag-Drop Integration (2 files)

#### Step 5.1: Update TodosPage drag handler
- **File**: `packages/frontend/src/pages/TodosPage.tsx`
- **Action**: Update handleDragEnd to support Planner hour-slot drops
- **Why**: Enable drag from Inbox to specific time slots
- **Dependencies**: Phase 2, Phase 3, Phase 4
- **Risk**: High

**Changes to handleDragEnd**:
```typescript
case 'planner':
  // Dropping to Planner: set deadline AND boardColumnId = 2
  if (!overData.date || overData.hour === undefined) return

  // Create ISO datetime from date + hour
  const targetDate = new Date(overData.date)
  targetDate.setHours(overData.hour, 0, 0, 0)

  updatePayload.deadline = targetDate.toISOString()
  updatePayload.boardColumnId = 2 // Move to Todo column
  break
```

#### Step 5.2: Update DroppableZone type definition
- **File**: `packages/frontend/src/features/todos/DroppableZone.tsx`
- **Action**: Add `hour` field to droppable data
- **Why**: Support hour-specific drop targets in Planner
- **Dependencies**: None
- **Risk**: Low

**Changes**:
```typescript
export interface DroppableZoneProps {
  id: string | number
  type: 'inbox' | 'planner' | 'board'
  columnId?: number
  date?: string
  hour?: number  // NEW: For hour-specific planner drops
  children: ReactNode
  className?: string
}
```

---

### Phase 6: DragOverlay Implementation (1 file)

#### Step 6.1: Add DragOverlay to DndProvider
- **File**: `packages/frontend/src/contexts/DndContext.tsx`
- **Action**: Add DragOverlay component for smooth drag animations
- **Why**: Natural drag transitions without external animation libraries
- **Dependencies**: None
- **Risk**: Medium

**CRITICAL: Z-index layering for cross-panel drag**:
- DragOverlay MUST render at highest z-index (`z-50` or `z-[9999]`)
- This prevents clipping by `overflow-hidden` on any panel (Inbox/Planner/Board)
- Dragged card must float above ALL UI elements during drag operation

**Changes**:
```tsx
import { DragOverlay } from '@dnd-kit/core'

export function DndProvider({ children, onDragEnd, ... }: DndProviderProps) {
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null)

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // ... existing logic
    if (activeData?.type === 'todo') {
      setActiveTodo(activeData.todo)
    }
  }, [])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    // ... existing logic
    setActiveTodo(null)
  }, [])

  return (
    <DndKitContext ...>
      <DndContext.Provider value={contextValue}>
        {children}
        {/* CRITICAL: z-[9999] ensures card floats above all panels during drag */}
        <DragOverlay style={{ zIndex: 9999 }}>
          {activeTodo && (
            <div className="shadow-lg scale-95 opacity-90">
              <TodoItem todo={activeTodo} />
            </div>
          )}
        </DragOverlay>
      </DndContext.Provider>
    </DndKitContext>
  )
}
```

---

### Phase 7: Testing & Polish (4 files)

#### Step 7.1: Update PlannerPanel tests
- **File**: `packages/frontend/src/features/todos/PlannerPanel.test.tsx`
- **Action**: Update tests for new PlannerPanel structure
- **Why**: Ensure refactored component works correctly
- **Dependencies**: Phase 4
- **Risk**: Low

**Test cases**:
- Renders DayView by default
- Switches to WeekView on toggle
- Filters todos correctly (deadline + boardColumnId === 2)
- Shows count of scheduled tasks in header

#### Step 7.2: Create HourSlot tests
- **File**: `packages/frontend/src/features/todos/planner/HourSlot.test.tsx`
- **Action**: Write comprehensive tests for HourSlot
- **Why**: Critical component for drag-drop functionality
- **Dependencies**: Step 2.1 (HourSlot)
- **Risk**: Low

**Test cases**:
- Renders correctly with no todos
- Displays todos in correct order
- Shows drag-over visual feedback
- Handles drop event correctly

#### Step 7.3: Create CurrentTimeIndicator tests
- **File**: `packages/frontend/src/features/todos/planner/CurrentTimeIndicator.test.tsx`
- **Action**: Write tests for CurrentTimeIndicator
- **Why**: Ensure correct positioning and updates
- **Dependencies**: Step 1.3 (CurrentTimeIndicator)
- **Risk**: Low

**Test cases**:
- Renders with correct position
- Updates position when time changes
- Hidden when outside visible hours

#### Step 7.4: Integration test for drag-drop flow
- **File**: `packages/frontend/src/features/todos/planner/integration.test.tsx`
- **Action**: Write integration test for complete drag-drop flow
- **Why**: Verify end-to-end functionality
- **Dependencies**: All phases complete
- **Risk**: Medium

**Test cases**:
- Drag from Inbox to Planner DayView hour slot
- Todo updates with deadline + boardColumnId = 2
- Todo appears in Planner and Board (Todo column)
- Todo disappears from Inbox

---

### Phase 8: Cleanup & Refactor (3 files)

#### Step 8.1: Remove deprecated TodoCalendar component
- **File**: `packages/frontend/src/features/todos/TodoCalendar.tsx`
- **Action**: Delete the deprecated calendar component
- **Why**: Replaced by DayView/WeekView, keeping it causes confusion
- **Dependencies**: Phase 4 (PlannerPanel no longer uses it)
- **Risk**: Low

**Pre-deletion checklist**:
- [ ] Verify no imports remain in other files
- [ ] Check for any references in test files
- [ ] Ensure PlannerPanel works without it

#### Step 8.2: Remove TodoCalendar test file
- **File**: `packages/frontend/src/features/todos/TodoCalendar.test.tsx`
- **Action**: Delete the deprecated test file
- **Why**: Tests for removed component, no longer needed
- **Dependencies**: Step 8.1
- **Risk**: Low

#### Step 8.3: Clean up unused imports and dead code
- **File**: Multiple files in `packages/frontend/src/features/todos/`
- **Action**: Run dead code analysis and clean up
- **Why**: Remove unused exports, stale type definitions, and dead branches
- **Dependencies**: Phase 1-7 complete
- **Risk**: Low

**Cleanup tasks**:
1. Run `pnpm dlx knip` or similar tool to detect dead code
2. Remove unused exports from index files
3. Clean up any stale type definitions related to old calendar
4. Remove commented-out code blocks
5. Verify all imports are still used after refactor

**Verification commands**:
```bash
# Check for unused exports
pnpm --filter @nanomail/frontend dlx knip

# Check for unused dependencies
pnpm --filter @nanomail/frontend dlx depcheck

# Verify build still works
pnpm --filter @nanomail/frontend build
```

---

## File Changes Summary

### New Files (11 files)
| File | Purpose |
|------|---------|
| `planner/index.ts` | Barrel export |
| `planner/TimeAxis.tsx` | 24-hour time axis |
| `planner/CurrentTimeIndicator.tsx` | Red line + dot |
| `planner/HourSlot.tsx` | Droppable hour container |
| `planner/PlannerTodoCard.tsx` | Compact todo card |
| `planner/DayView.tsx` | Day view container |
| `planner/WeekView.tsx` | Week view container |
| `planner/PlannerViewToggle.tsx` | View toggle control |
| `planner/DayView.test.tsx` | DayView tests |
| `planner/WeekView.test.tsx` | WeekView tests |
| `planner/integration.test.tsx` | Integration tests |

### Modified Files (4 files)
| File | Changes |
|------|---------|
| `PlannerPanel.tsx` | Add view switching, replace TodoCalendar |
| `TodosPage.tsx` | Update drag handler for hour drops |
| `DroppableZone.tsx` | Add hour field to droppable data |
| `DndContext.tsx` | Add DragOverlay for animations |

### Deprecated Files (2 files)
| File | Reason |
|------|--------|
| `TodoCalendar.tsx` | Replaced by DayView/WeekView - DELETE in Phase 8 |
| `TodoCalendar.test.tsx` | Tests for removed component - DELETE in Phase 8 |

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
- `@/hooks` - React Query hooks
- `@/lib/utils` - Utility functions (cn)
- `@/constants/colors` - Column color mappings

---

## Risks & Mitigations

### Risk 1: Drag-Drop Complexity
- **Description**: Managing drag between three panels (Inbox, Planner, Board) with different drop behaviors
- **Mitigation**: Use clear data types in droppable zones, extensive integration tests

### Risk 2: Performance with Many Todos
- **Description**: Rendering 24 hour slots per day could be slow with many todos
- **Mitigation**: Virtualize long lists, memoize HourSlot components, limit visible hours initially

### Risk 3: Timezone Handling
- **Description**: deadline is stored as ISO string, but display needs local time
- **Mitigation**: Use date-fns with local timezone, test with different timezone scenarios

### Risk 4: DragOverlay State Management
- **Description**: DragOverlay needs access to active todo across component tree
- **Mitigation**: Store active todo in DndContext, use context for state sharing

### Risk 5: Current Time Indicator Performance
- **Description**: Updating indicator position every minute could cause re-renders
- **Mitigation**: Use CSS transforms for position updates, minimize React state updates

---

## Testing Strategy

### Unit Tests
- **TimeAxis**: Renders 24 hour labels correctly
- **HourSlot**: Shows todos, drag-over feedback, drop handling
- **CurrentTimeIndicator**: Position calculation, time updates
- **PlannerTodoCard**: Compact display, click handling
- **DayView**: 24 slots, auto-scroll, empty state
- **WeekView**: 7 columns, date headers, current day highlight
- **PlannerViewToggle**: View switching

### Integration Tests
- **Drag Inbox to Planner DayView**: Verify deadline + boardColumnId update
- **Drag Inbox to Planner WeekView**: Verify cross-day scheduling
- **Three-panel sync**: Todo appears in Planner + Board after drop

### E2E Tests
- **Complete scheduling flow**: Create todo in Inbox, drag to Planner, verify appears in Board
- **View switching**: Toggle between Day/Week views, verify data consistency

---

## Success Criteria

- [ ] Day View displays 24-hour timeline with auto-scroll to current time
- [ ] Week View displays 7-column grid with time axis
- [ ] Current time indicator (red line + dot) updates in real-time
- [ ] Drag from Inbox to Planner sets deadline and boardColumnId = 2
- [ ] Dropped todo appears in Planner and Board (Todo column)
- [ ] Dropped todo disappears from Inbox
- [ ] View toggle (日/周) switches between Day and Week views
- [ ] DragOverlay provides smooth drag animation
- [ ] All tests pass with 80%+ coverage for new components
- [ ] Design system compliance (no scale on menus, correct animation timing)
- [ ] Deprecated TodoCalendar.tsx and TodoCalendar.test.tsx removed
- [ ] No dead code or unused exports remain in todos feature

---

## Implementation Order

1. **Phase 1**: Infrastructure Setup (TimeAxis, CurrentTimeIndicator)
2. **Phase 2**: Day View Implementation (HourSlot, PlannerTodoCard, DayView)
3. **Phase 3**: Week View Implementation (WeekView)
4. **Phase 4**: PlannerPanel Integration (PlannerViewToggle, PlannerPanel refactor)
5. **Phase 5**: Drag-Drop Integration (TodosPage, DroppableZone updates)
6. **Phase 6**: DragOverlay Implementation (DndContext)
7. **Phase 7**: Testing & Polish (All test files)
8. **Phase 8**: Cleanup & Refactor (Remove deprecated files, dead code cleanup)