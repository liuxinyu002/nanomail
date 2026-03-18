# Plan 3 Phase 6: DragOverlay Implementation

> Part of: Planner Component Refactor
> Previous: Phase 5 (Drag-Drop Integration)
> Next: Phase 7 (Testing & Polish)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### Drag Animation (@dnd-kit only)
- Drag feedback: `shadow-lg` + `scale(0.95)` on dragged item
- Placeholder: themed border empty box (`border-2 border-dashed border-gray-300`)
- Use `DragOverlay` for natural transitions during drag
- No external animation libraries

### Cross-Panel Drag Behavior
When dragging a todo card from one panel to another:
1. **Original card stays in place** (with placeholder styling)
2. **Dragged card floats above all UI** (via DragOverlay)
3. **No clipping by panel overflow:hidden**

---

## Architecture

### DragOverlay Position in Component Tree

```
DndProvider (TodosPage level)
  ├── DndContext.Provider
  │     ├── InboxPanel
  │     ├── PlannerPanel
  │     │     ├── DayView / WeekView
  │     │     │     └── HourSlot (overflow-y-auto)
  │     │     └── ...
  │     └── BoardPanel
  │           └── BoardColumn (overflow-y-auto)
  └── DragOverlay (z-index: 9999) ← CRITICAL: Outside all panels
        └── TodoItem (active drag)
```

**Key insight**: DragOverlay must be a sibling of the panel containers, not inside them. This prevents clipping by `overflow-hidden` or `overflow-auto` on any panel.

---

## Phase 6 Tasks (1 file)

### Step 6.1: Add DragOverlay to DndProvider

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
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import {
  DndContext as DndKitContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import type { TodoItem } from '@nanomail/shared'
import { TodoItem } from '@/features/todos/TodoItem'

interface DndContextValue {
  // ... existing context value
}

interface DndProviderProps {
  children: ReactNode
  onDragEnd: (event: DragEndEvent) => void
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  const [activeTodo, setActiveTodo] = useState<TodoItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before starting drag
      },
    })
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const activeData = active.data.current

    if (activeData?.type === 'todo') {
      setActiveTodo(activeData.todo)
    }
  }, [])

  const handleDragEndWrapper = useCallback((event: DragEndEvent) => {
    setActiveTodo(null)
    onDragEnd(event)
  }, [onDragEnd])

  const handleDragCancel = useCallback(() => {
    setActiveTodo(null)
  }, [])

  return (
    <DndKitContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndWrapper}
      onDragCancel={handleDragCancel}
    >
      {/* Panel containers - may have overflow: hidden/auto */}
      {children}

      {/* CRITICAL: z-[9999] ensures card floats above all panels during drag */}
      <DragOverlay style={{ zIndex: 9999 }}>
        {activeTodo && (
          <div
            className="shadow-lg scale-95 opacity-90 pointer-events-none"
            style={{
              transform: 'scale(0.95)',
              opacity: 0.9,
            }}
          >
            <TodoItem todo={activeTodo} />
          </div>
        )}
      </DragOverlay>
    </DndKitContext>
  )
}
```

---

## Implementation Details

### DragOverlay Styling

The DragOverlay wrapper applies drag feedback:

```tsx
<div
  className="shadow-lg scale-95 opacity-90 pointer-events-none"
  style={{
    transform: 'scale(0.95)',
    opacity: 0.9,
  }}
>
  <TodoItem todo={activeTodo} />
</div>
```

| Style | Purpose |
|-------|---------|
| `shadow-lg` | Elevation effect to show dragged state |
| `scale(0.95)` / `scale-95` | Slight shrink for visual feedback |
| `opacity-90` | Slight transparency for visual feedback |
| `pointer-events-none` | Prevent interaction with overlay element |

### Activation Constraint

The `PointerSensor` with `activationConstraint` prevents accidental drags:

```tsx
useSensor(PointerSensor, {
  activationConstraint: {
    distance: 8, // Require 8px movement before starting drag
  },
})
```

This means users can click on a todo item without triggering a drag. They must move the pointer 8 pixels before the drag starts.

### Alternative: Create DndContext file if not exists

If `DndContext.tsx` doesn't exist yet, create it:

```tsx
// packages/frontend/src/contexts/DndContext.tsx
import { createContext, useContext, ReactNode } from 'react'
import {
  DndContext as DndKitContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  useSensor,
  useSensors,
  PointerSensor,
} from '@dnd-kit/core'
import type { TodoItem } from '@nanomail/shared'

interface DndContextValue {
  // Add any shared drag context here
}

const DndContext = createContext<DndContextValue | null>(null)

export function useDndContext() {
  const context = useContext(DndContext)
  if (!context) {
    throw new Error('useDndContext must be used within DndProvider')
  }
  return context
}

interface DndProviderProps {
  children: ReactNode
  onDragEnd: (event: DragEndEvent) => void
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  // ... implementation from above
}
```

---

## Common Issues & Solutions

### Issue 1: DragOverlay clipped by panel overflow

**Symptoms**: Dragged card disappears when crossing panel boundaries

**Solution**: Ensure DragOverlay is rendered at the top level of DndKitContext, not inside any panel

```tsx
// ❌ WRONG: DragOverlay inside panel
<DndKitContext>
  <InboxPanel>
    <DragOverlay>...</DragOverlay>
  </InboxPanel>
</DndKitContext>

// ✅ CORRECT: DragOverlay as sibling of panels
<DndKitContext>
  <InboxPanel />
  <PlannerPanel />
  <BoardPanel />
  <DragOverlay>...</DragOverlay>
</DndKitContext>
```

### Issue 2: DragOverlay not showing

**Symptoms**: No visual feedback when dragging

**Solution**: Check that `activeTodo` state is being set correctly in `handleDragStart`

```tsx
const handleDragStart = useCallback((event: DragStartEvent) => {
  const { active } = event
  const activeData = active.data.current

  // Ensure this condition matches your draggable data structure
  if (activeData?.type === 'todo') {
    setActiveTodo(activeData.todo)
  }
}, [])
```

### Issue 3: Card not updating after drop

**Symptoms**: DragOverlay card shows stale data after drop

**Solution**: Clear `activeTodo` state in `handleDragEnd` and `handleDragCancel`

```tsx
const handleDragEnd = useCallback((event: DragEndEvent) => {
  setActiveTodo(null) // Clear overlay
  onDragEnd(event)
}, [onDragEnd])

const handleDragCancel = useCallback(() => {
  setActiveTodo(null) // Clear overlay on cancel
}, [])
```

---

## Dependencies

### External Dependencies (already installed)
- `@dnd-kit/core` - DragOverlay component
- `@dnd-kit/utilities` - CSS utilities (optional)

### Internal Dependencies
- `@nanomail/shared` - Todo types
- `TodoItem` component - For rendering dragged card

---

## Risks & Mitigations

### Risk 1: Z-index Conflicts
- **Description**: Other UI elements (modals, dropdowns) may have high z-index
- **Mitigation**: Use very high z-index (9999) and document the layering

### Risk 2: Performance with Complex TodoItem
- **Description**: Rendering full TodoItem in overlay could be slow
- **Mitigation**: Consider using a simplified version for the overlay

### Risk 3: Styling Mismatch
- **Description**: Overlay card may look different from original
- **Mitigation**: Use same TodoItem component, apply only overlay-specific styles

---

## Testing Checklist

### Manual Testing
- [ ] Drag from Inbox to Planner - overlay visible during drag
- [ ] Drag from Planner to Board - overlay visible during drag
- [ ] Drag across panel boundaries - no clipping
- [ ] Release drop - overlay disappears smoothly
- [ ] Cancel drag (press Escape) - overlay disappears
- [ ] Drag feedback (shadow, scale) visible

### Automated Testing
- [ ] Unit test for DndProvider context value
- [ ] Test handleDragStart sets activeTodo
- [ ] Test handleDragEnd clears activeTodo
- [ ] Test handleDragCancel clears activeTodo

---

## Success Criteria (Phase 6)

- [ ] DragOverlay renders at z-index 9999
- [ ] DragOverlay is outside all panel containers
- [ ] Dragged card floats above all UI during drag
- [ ] No clipping when dragging across panels
- [ ] Shadow and scale effects applied to dragged card
- [ ] Overlay clears on drop and cancel
- [ ] Activation constraint prevents accidental drags
- [ ] No TypeScript errors

---

## Next Phase

Proceed to **Phase 7: Testing & Polish** after completing Phase 6.