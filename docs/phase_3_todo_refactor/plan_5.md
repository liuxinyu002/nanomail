# Plan 5: Todo Card Detail Expansion

> Part of: Phase 3 Todo Refactor

## Overview

Implement expandable detail component for Todo cards that allows users to view and edit description, notes, and deadline. Different views have different capabilities:

| View | Editable | Delete Icon | Empty Field Display |
|------|----------|-------------|---------------------|
| INBOX | Yes | Yes | Placeholder |
| Board | Yes | Yes | Placeholder |
| Planner | No | No | Hide or "-" |

---

## Implementation Phases

| Phase | File | Description | Risk |
|-------|------|-------------|------|
| 1 | [plan_5_1.md](./plan_5_1.md) | Schema & Entity Updates | Low |
| 2 | [plan_5_2.md](./plan_5_2.md) | TaskDetailExpand Component | Medium |
| 3 | [plan_5_3.md](./plan_5_3.md) | Delete Icon Replacement | Low |
| 4 | [plan_5_4.md](./plan_5_4.md) | TodoCard Integration | Medium |
| 5 | [plan_5_5.md](./plan_5_5.md) | View Integration | Medium |
| 6 | [plan_5_6.md](./plan_5_6.md) | API Updates | Low |

---

## Recommended Implementation Order

1. **Phase 1**: Schema & Entity (foundation)
2. **Phase 3**: Delete Icon (simple, independent)
3. **Phase 2**: TaskDetailExpand (core component)
4. **Phase 4**: TodoCard Integration
5. **Phase 5**: View Integration
6. **Phase 6**: API verification

---

## Dependencies Graph

```
Phase 1 (Schema) ──┬──► Phase 2 (TaskDetailExpand) ──► Phase 4 (TodoCard) ──► Phase 5 (Views) ──► Phase 6 (API)
                   │
                   └──► Phase 3 (DeleteIcon) ─────────► Phase 4 (TodoCard)
```

---

## Files Changed Summary

| File | Action | Phase |
|------|--------|-------|
| `packages/shared/src/schemas/todo.ts` | MODIFY | 1 |
| `packages/backend/src/entities/Todo.entity.ts` | MODIFY | 1 |
| `packages/frontend/src/features/todos/TodoCard/TaskDetailExpand.tsx` | CREATE | 2 |
| `packages/frontend/src/features/todos/TodoCard/TodoCardContent.tsx` | MODIFY | 2 |
| `packages/frontend/src/features/todos/TodoCard/DeleteIconButton.tsx` | CREATE | 3 |
| `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx` | MODIFY | 3 |
| `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx` | MODIFY | 4 |
| `packages/frontend/src/features/todos/TodoCard/index.ts` | MODIFY | 4 |
| `packages/frontend/src/features/todos/InboxPanel.tsx` | MODIFY | 5 |
| `packages/frontend/src/features/todos/planner/PlannerTodoCard.tsx` | MODIFY | 5 |
| `packages/frontend/src/features/todos/DraggableTodoItem.tsx` | MODIFY | 5 |
| `packages/backend/src/routes/todo.routes.ts` | VERIFY | 6 |

---

## Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| State management complexity | Medium | Use local state with refs for comparison |
| API update failures | Low | Revert local state on error |
| Layout shift on expand | Low | Use CSS grid for smooth animation |
| Drag vs click conflict | Low | Already addressed in Phase 5 |

---

## Related Documents

- [Plan 4: Todo Card Redesign](./plan_4_4.md)
- [Plan 5: Drag vs Expand Conflict](./plan_4_5.md)
- [Design System](../../SPEC/design-system.md)