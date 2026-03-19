# Phase 4: Update Tests for Popover Mode

> Part of [Plan 7: Popover-Based Todo Detail Viewing in Planner](./plan_7.md)

## Project Overview

Implement a Popover overlay pattern for viewing todo details in the Planner component (DayView/WeekView). The current inline expansion causes UI overlap issues in the compact scheduler view. The solution uses Radix UI's Popover component to display todo details in a floating overlay with smart positioning and collision detection.

## Requirements Reference

- **R1**: Popover Pattern - Use floating overlay instead of inline expansion for todo details
- **R2**: Read-only Mode - Detail content in popover must be read-only, NOT editable
- **R3**: Smart Positioning - Priority right placement with collision detection to flip left/top/bottom
- **R4**: Existing Infrastructure - Reuse existing Popover, TaskDetailExpand, and PlannerTodoCard components

## Task: Update Tests for Popover Mode

**Files**:

1. `packages/frontend/src/features/todos/planner/PlannerTodoCard.test.tsx`
2. `packages/frontend/src/features/todos/planner/DayView.test.tsx`
3. `packages/frontend/src/features/todos/planner/WeekView.test.tsx`
4. `packages/frontend/src/features/todos/planner/integration.test.tsx`

**Action**: Update tests to verify Popover behavior instead of onClick callbacks

**Why**: Interaction pattern changed from callback to popover display

**Dependencies**: Phases 1-3 (All implementation must be complete)

**Risk**: Medium - test patterns need adjustment

---

## Test Strategy

### Unit Tests - TodoDetailPopover (New File)

Create `TodoDetailPopover.test.tsx`:

| Test Case | Description |
|-----------|-------------|
| Renders with correct testid | Component mounts without errors |
| Shows TaskDetailExpand content in readonly mode | Verify `readonly` prop is passed |
| Close button dismisses popover | Click X button closes popover |
| Close button accessibility | Has `aria-label="Close details"` |
| Positioning attributes applied correctly | Verify `side="right"`, `align="start"`, `sideOffset={8}` |
| Animation classes present | Verify fade-in/fade-out classes |
| Arrow renders with correct fill colors | Verify `<Popover.Arrow>` has `fill-white` / `dark:fill-gray-800` |

### Unit Tests - PlannerTodoCard Updates

| Test Case | Description |
|-----------|-------------|
| Popover opens when card clicked | Click card body opens popover |
| Checkbox toggle works | Click checkbox toggles completion |
| Checkbox does NOT trigger popover | `stopPropagation()` prevents popover |
| Popover shows correct todo details | Verify todo data in popover |
| onTodoClick callback NOT called | Callback removed, should not be invoked |

### Integration Tests - DayView/WeekView Updates

| Test Case | Description |
|-----------|-------------|
| Click todo opens popover | Click in hour slot opens popover |
| Multiple todos work independently | Each todo shows its own popover |
| Popover positioning in hour slots | Verify positioning within calendar layout |

### E2E Tests

| Test Case | Description |
|-----------|-------------|
| Full popover flow | Click todo → see popover → verify readonly content |
| Checkbox interaction | Click checkbox → toggle completion → popover NOT triggered |

---

## Test Implementation Details

### Testing Radix Popover with React Testing Library

Radix UI components render in portals, which requires special handling in tests:

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('TodoDetailPopover', () => {
  it('opens popover on trigger click', async () => {
    const user = userEvent.setup()

    render(
      <TodoDetailPopover todo={mockTodo}>
        <button>Trigger</button>
      </TodoDetailPopover>
    )

    // Click trigger
    await user.click(screen.getByRole('button', { name: 'Trigger' }))

    // Wait for portal content to appear
    await waitFor(() => {
      expect(screen.getByText(mockTodo.title)).toBeInTheDocument()
    })
  })

  it('closes popover with close button', async () => {
    const user = userEvent.setup()

    render(
      <TodoDetailPopover todo={mockTodo}>
        <button>Trigger</button>
      </TodoDetailPopover>
    )

    // Open popover
    await user.click(screen.getByRole('button', { name: 'Trigger' }))
    await waitFor(() => {
      expect(screen.getByText(mockTodo.title)).toBeInTheDocument()
    })

    // Close with X button
    const closeButton = screen.getByRole('button', { name: /close details/i })
    await user.click(closeButton)

    // Verify popover closed
    await waitFor(() => {
      expect(screen.queryByText(mockTodo.title)).not.toBeInTheDocument()
    })
  })
})
```

### Testing Checkbox vs Popover Interaction

```typescript
describe('PlannerTodoCard', () => {
  it('checkbox toggles without opening popover', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <TodoDetailPopover todo={mockTodo}>
        <TodoCard todo={mockTodo} onToggle={onToggle} readonly compact />
      </TodoDetailPopover>
    )

    // Click checkbox
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)

    // Toggle should be called
    expect(onToggle).toHaveBeenCalledTimes(1)

    // Popover should NOT be open
    await waitFor(() => {
      expect(screen.queryByText(mockTodo.description)).not.toBeInTheDocument()
    })
  })
})
```

## Component Relationships

```
PlannerPanel
├── DayView / WeekView
│   └── HourSlot
│       └── PlannerTodoCard
│           └── TodoDetailPopover
│               ├── Popover.Trigger → TodoCard (compact, readonly)
│               └── Popover.Content
│                   └── TaskDetailExpand (readonly=true)
```

## Risks and Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Test flakiness with Popover portal | Medium | Use `waitFor` and proper async testing |
| Testing library queries not finding portal content | Medium | Use `screen.getByText` without container queries |
| Animation timing issues | Low | Use `waitFor` with appropriate timeout |
| User event setup differences | Low | Use `userEvent.setup()` for each test |

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `TodoDetailPopover.test.tsx` | CREATE | New test file for popover component |
| `PlannerTodoCard.test.tsx` | MODIFY | Update for popover mode |
| `DayView.test.tsx` | MODIFY | Update for popover integration |
| `WeekView.test.tsx` | MODIFY | Update for popover integration |
| `integration.test.tsx` | MODIFY | Update for full flow |

## Related Phases

- **Previous**: [Phase 3: Update Index Exports](./plan_7_3.md)
- **Next**: None (This is the final phase)

## Related Documents

- [Plan 5: Todo Card Detail Expansion](./plan_5.md)
- [Plan 6: Todo Group Color Synchronization](./plan_6.md)
- [Design System](../../SPEC/design-system.md)
- [Radix Popover Documentation](https://www.radix-ui.com/docs/primitives/components/popover)