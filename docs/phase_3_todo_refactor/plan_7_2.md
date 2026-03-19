# Phase 2: Update PlannerTodoCard Integration

> Part of [Plan 7: Popover-Based Todo Detail Viewing in Planner](./plan_7.md)

## Project Overview

Implement a Popover overlay pattern for viewing todo details in the Planner component (DayView/WeekView). The current inline expansion causes UI overlap issues in the compact scheduler view. The solution uses Radix UI's Popover component to display todo details in a floating overlay with smart positioning and collision detection.

## Requirements Reference

- **R1**: Popover Pattern - Use floating overlay instead of inline expansion for todo details
- **R2**: Read-only Mode - Detail content in popover must be read-only, NOT editable
- **R3**: Smart Positioning - Priority right placement with collision detection to flip left/top/bottom
- **R4**: Existing Infrastructure - Reuse existing Popover, TaskDetailExpand, and PlannerTodoCard components

## Task: Update PlannerTodoCard Integration

**File**: `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx`

**Action**: Replace div onClick with Popover.Trigger wrapping TodoCard

**Why**: Enable popover display on card click while preserving checkbox functionality

**Dependencies**: Phase 1 (TodoDetailPopover component must exist)

**Risk**: Medium - must ensure checkbox doesn't trigger popover

---

## Changes Required

1. Import `TodoDetailPopover` from `../TodoCard`
2. Remove outer div's `onClick` and `role`/`tabIndex` props
3. Wrap TodoCard with `TodoDetailPopover` using `asChild` trigger
4. The checkbox already has `stopPropagation()` (line 123 in TodoCard.tsx) - will NOT trigger popover

## Event Propagation Considerations

Radix UI's `Popover.Trigger` intercepts and manages click events by default. If the checkbox is a child of the trigger element, `e.stopPropagation()` alone may not fully prevent the popover from opening. Apply these safeguards:

1. **Primary defense**: Ensure `e.stopPropagation()` is called on checkbox click
2. **Secondary defense**: Add `e.preventDefault()` to checkbox click handler if `stopPropagation` proves insufficient
3. **Fallback**: If issues persist, restructure DOM to visually overlay the checkbox on the trigger using absolute positioning, without making it a DOM child of `Popover.Trigger`

```tsx
// Example: Combined stopPropagation + preventDefault
const handleCheckboxClick = (e: React.MouseEvent) => {
  e.stopPropagation()
  e.preventDefault() // Add if popover still opens on checkbox click
  onToggle?.()
}
```

## Code Changes

### Current Structure (lines 33-54)

```tsx
<div onClick={onClick} role={...} tabIndex={...}>
  <TodoCard todo={todo} onToggle={handleToggle} readonly compact colorBar={...} />
</div>
```

### New Structure

```tsx
<TodoDetailPopover todo={todo}>
  <div data-testid={`planner-todo-card-${todo.id}`}>
    <TodoCard todo={todo} onToggle={handleToggle} readonly compact colorBar={...} />
  </div>
</TodoDetailPopover>
```

## Component Relationships

```
PlannerPanel
├── DayView / WeekView
│   └── HourSlot
│       └── PlannerTodoCard (MODIFIED IN THIS PHASE)
│           └── TodoDetailPopover
│               ├── Popover.Trigger → TodoCard (compact, readonly)
│               └── Popover.Content
│                   └── TaskDetailExpand (readonly=true)
```

## Test Requirements

Update `PlannerTodoCard.test.tsx` with the following tests:

- Popover opens when card clicked (not checkbox)
- Checkbox toggle still works without triggering popover
- Popover shows correct todo details
- onTodoClick callback is NO LONGER called (removed)

## Risks and Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Checkbox triggers popover unexpectedly | Medium | Use `stopPropagation()` + `preventDefault()` combo; restructure DOM if needed |
| Popover positioning collisions | Low | Radix handles collision detection automatically |
| Z-index conflicts with other overlays | Low | Use high z-index (1000+) and verify with existing modals |

## Related Phases

- **Previous**: [Phase 1: Create TodoDetailPopover Component](./plan_7_1.md)
- **Next**: [Phase 3: Update Index Exports](./plan_7_3.md)

## Related Documents

- [Plan 5: Todo Card Detail Expansion](./plan_5.md)
- [Plan 6: Todo Group Color Synchronization](./plan_6.md)
- [Design System](../../SPEC/design-system.md)