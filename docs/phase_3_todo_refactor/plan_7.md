# Implementation Plan: Popover-Based Todo Detail Viewing in Planner

## Overview

Implement a Popover overlay pattern for viewing todo details in the Planner component (DayView/WeekView). The current inline expansion causes UI overlap issues in the compact scheduler view. The solution uses Radix UI's Popover component to display todo details in a floating overlay with smart positioning and collision detection.

## Requirements

- **R1**: Popover Pattern - Use floating overlay instead of inline expansion for todo details
- **R2**: Read-only Mode - Detail content in popover must be read-only, NOT editable
- **R3**: Smart Positioning - Priority right placement with collision detection to flip left/top/bottom
- **R4**: Existing Infrastructure - Reuse existing Popover, TaskDetailExpand, and PlannerTodoCard components

## Implementation Phases

| Phase | File | Description | Risk |
|-------|------|-------------|------|
| [Phase 1](./plan_7_1.md) | `TodoDetailPopover.tsx` | Create new wrapper component | Low |
| [Phase 2](./plan_7_2.md) | `PlannerTodoCard.tsx` | Replace onClick with Popover.Trigger | Medium |
| [Phase 3](./plan_7_3.md) | `TodoCard/index.ts` | Add export for TodoDetailPopover | Low |
| [Phase 4](./plan_7_4.md) | `*.test.tsx` | Update tests for Popover mode | Medium |

## Architecture Changes

| Change | File | Description |
|--------|------|-------------|
| New component | `packages/frontend/src/features/todos/TodoCard/TodoDetailPopover.tsx` | Wrapper component for popover display |
| Export update | `packages/frontend/src/features/todos/TodoCard/index.ts` | Export TodoDetailPopover |
| Integration | `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx` | Replace onClick with Popover.Trigger |
| Test updates | `packages/frontend/src/features/todos/planner/*.test.tsx` | Update tests for Popover mode |

## Component Relationships

```
PlannerPanel
├── DayView / WeekView
│   └── HourSlot
│       └── PlannerTodoCard
│           └── TodoDetailPopover (NEW)
│               ├── Popover.Trigger → TodoCard (compact, readonly)
│               └── Popover.Content
│                   └── TaskDetailExpand (readonly=true)
```

## Risks and Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Checkbox triggers popover unexpectedly | Medium | Use `stopPropagation()` + `preventDefault()` combo; restructure DOM if needed |
| Popover positioning collisions | Low | Radix handles collision detection automatically |
| Test flakiness with Popover portal | Medium | Use `waitFor` and proper async testing |
| Z-index conflicts with other overlays | Low | Use high z-index (1000+) and verify with existing modals |
| Missing close button accessibility | Low | Add `aria-label="Close details"` to close button; Escape key support via Radix |
| Content overflow without scroll | Low | Add `overflow-y-auto` to content container for long descriptions/notes |
| Mobile responsiveness issues | Low | Consider bottom sheet/dialog for small screens if mobile support needed |
| Arrow color mismatch with background | Low | Use shared CSS variables or ensure arrow `fill` class matches content `bg` class in both light/dark modes |

## Success Criteria

- [ ] Clicking PlannerTodoCard opens popover on the right side
- [ ] Clicking checkbox toggles completion WITHOUT opening popover
- [ ] Popover displays TaskDetailExpand content in read-only mode
- [ ] Popover has close button (X icon) and responds to Escape key
- [ ] Popover flips to left/top/bottom when right side collision detected
- [ ] Popover has arrow pointing to the trigger element (visual "bubble" appearance)
- [ ] Arrow color matches popover background in both light and dark modes
- [ ] All existing tests pass after updates
- [ ] New tests cover Popover behavior

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `packages/frontend/src/features/todos/TodoCard/TodoDetailPopover.tsx` | CREATE | 1 |
| `packages/frontend/src/features/todos/TodoCard/index.ts` | MODIFY | 3 |
| `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx` | MODIFY | 2 |
| `packages/frontend/src/features/todos/planner/PlannerTodoCard.test.tsx` | MODIFY | 4 |
| `packages/frontend/src/features/todos/planner/DayView.test.tsx` | MODIFY | 4 |
| `packages/frontend/src/features/todos/planner/WeekView.test.tsx` | MODIFY | 4 |
| `packages/frontend/src/features/todos/planner/integration.test.tsx` | MODIFY | 4 |
| `packages/frontend/src/features/todos/TodoCard/TodoDetailPopover.test.tsx` | CREATE | 4 |

## Related Documents

- [Plan 5: Todo Card Detail Expansion](./plan_5.md)
- [Plan 6: Todo Group Color Synchronization](./plan_6.md)
- [Design System](../../SPEC/design-system.md)
- [Radix Popover Documentation](https://www.radix-ui.com/docs/primitives/components/popover)