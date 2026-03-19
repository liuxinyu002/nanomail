# Phase 3: Update Index Exports

> Part of [Plan 7: Popover-Based Todo Detail Viewing in Planner](./plan_7.md)

## Project Overview

Implement a Popover overlay pattern for viewing todo details in the Planner component (DayView/WeekView). The current inline expansion causes UI overlap issues in the compact scheduler view. The solution uses Radix UI's Popover component to display todo details in a floating overlay with smart positioning and collision detection.

## Requirements Reference

- **R1**: Popover Pattern - Use floating overlay instead of inline expansion for todo details
- **R2**: Read-only Mode - Detail content in popover must be read-only, NOT editable
- **R3**: Smart Positioning - Priority right placement with collision detection to flip left/top/bottom
- **R4**: Existing Infrastructure - Reuse existing Popover, TaskDetailExpand, and PlannerTodoCard components

## Task: Update Index Exports

**File**: `packages/frontend/src/features/todos/TodoCard/index.ts`

**Action**: Add export for TodoDetailPopover

**Why**: Enable imports from `../TodoCard`

**Dependencies**: Phase 1 (TodoDetailPopover component must exist)

**Risk**: Low

---

## Changes Required

Add the export for the new `TodoDetailPopover` component to the index file.

### Current Exports (example structure)

```typescript
export { TodoCard } from './TodoCard'
export { TaskDetailExpand } from './TaskDetailExpand'
// ... other exports
```

### New Export

```typescript
export { TodoCard } from './TodoCard'
export { TaskDetailExpand } from './TaskDetailExpand'
export { TodoDetailPopover } from './TodoDetailPopover'
// ... other exports
```

## Import Usage

After this update, `TodoDetailPopover` can be imported from the TodoCard module:

```typescript
// Before (would fail)
import { TodoDetailPopover } from '../TodoCard' // Error: not exported

// After (works correctly)
import { TodoDetailPopover } from '../TodoCard' // Success
```

## Component Relationships

```
PlannerPanel
├── DayView / WeekView
│   └── HourSlot
│       └── PlannerTodoCard
│           └── TodoDetailPopover (EXPORTED IN THIS PHASE)
│               ├── Popover.Trigger → TodoCard (compact, readonly)
│               └── Popover.Content
│                   └── TaskDetailExpand (readonly=true)
```

## Risks and Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| Export typo causing import errors | Low | Verify import works after adding export |
| Circular dependency | Low | TodoDetailPopover only imports types, not components from index |

## Related Phases

- **Previous**: [Phase 2: Update PlannerTodoCard Integration](./plan_7_2.md)
- **Next**: [Phase 4: Update Tests for Popover Mode](./plan_7_4.md)

## Related Documents

- [Plan 5: Todo Card Detail Expansion](./plan_5.md)
- [Plan 6: Todo Group Color Synchronization](./plan_6.md)