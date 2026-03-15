# Plan 9 - Phase 5: Cleanup Old Files

> **Parent Plan**: [plan_9.md](./plan_9.md)
> **Status**: Ready for Implementation
> **Dependencies**: [Phase 4: Test Files Updated](./plan_9_phase4.md)

---

## Objective

Delete old TodoDayDrawer.tsx after all tests pass.

---

## Prerequisites

- All tests in Phase 4 must pass
- TodoCalendar must be using TodoDayModal
- Application must be fully functional with the new modal

---

## Files to Delete

1. `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/todos/TodoDayDrawer.tsx`

> **Note**: The test file `TodoDayDrawer.test.tsx` was already renamed in Phase 4.

---

## Risk Level

**Low**

---

## Verification Steps

1. Ensure all tests pass
2. Verify application works correctly
3. Check that no other files import TodoDayDrawer
4. Delete the old file
5. Run tests again to confirm no regression

---

## Acceptance Criteria

- [ ] All tests pass before deletion
- [ ] No other files reference TodoDayDrawer
- [ ] Old TodoDayDrawer.tsx deleted
- [ ] All tests pass after deletion
- [ ] Application functions correctly with only TodoDayModal

---

## Completion

After this phase, the plan is complete. Return to [Parent Plan](./plan_9.md) for final acceptance criteria checklist.