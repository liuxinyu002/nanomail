# Plan 9 - Phase 3: Update TodoCalendar Component

> **Parent Plan**: [plan_9.md](./plan_9.md)
> **Status**: ✅ Completed
> **Dependencies**: [Phase 2: TodoDayModal Component](./plan_9_phase2.md)

---

## Objective

Replace TodoDayDrawer import and usage with TodoDayModal.

## Why

Connect the new modal to the calendar component.

---

## Target File

`/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoCalendar.tsx`

---

## Risk Level

**Low**

---

## Changes Required

### 1. Update Import

```diff
- import { TodoDayDrawer } from './TodoDayDrawer'
+ import { TodoDayModal } from './TodoDayModal'
```

### 2. Update JSX

```diff
- <TodoDayDrawer
+ <TodoDayModal
    open={!!selectedDate}
    onOpenChange={handleDrawerClose}
    date={selectedDate}
    todos={drawerTodos}
    onTodoClick={onTodoClick}
  />
```

---

## Acceptance Criteria

- [x] Import updated from TodoDayDrawer to TodoDayModal
- [x] JSX updated to use TodoDayModal component
- [x] All props correctly passed to new component
- [x] Calendar functionality still works correctly
- [x] Clicking date with todos opens centered modal

---

## Next Phase

[Phase 4: Rename and Update Test Files](./plan_9_phase4.md)