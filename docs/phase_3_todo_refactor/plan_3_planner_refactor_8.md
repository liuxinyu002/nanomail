# Plan 3 Phase 8: Cleanup & Refactor

> Part of: Planner Component Refactor
> Previous: Phase 7 (Testing & Polish)
> Next: None (Complete)

---

## Project Overview

Refactor the PlannerPanel component from a monthly calendar view to a dual-view scheduler with Day View (default) and Week View. Implement 24-hour timeline visualization with drag-drop support for scheduling tasks from Inbox to Planner.

---

## Requirements Summary

### Cleanup Goals
- Remove deprecated components (TodoCalendar)
- Remove deprecated test files
- Clean up unused imports and dead code
- Verify no broken references remain
- Final build verification

---

## Phase 8 Tasks (3 files / categories)

### Step 8.1: Remove deprecated TodoCalendar component

- **File**: `packages/frontend/src/features/todos/TodoCalendar.tsx`
- **Action**: Delete the deprecated calendar component
- **Why**: Replaced by DayView/WeekView, keeping it causes confusion
- **Dependencies**: Phase 4 (PlannerPanel no longer uses it)
- **Risk**: Low

**Pre-deletion checklist**:
- [ ] Verify no imports remain in other files
- [ ] Check for any references in test files
- [ ] Ensure PlannerPanel works without it

**Search for references**:
```bash
# Search for imports of TodoCalendar
grep -r "TodoCalendar" packages/frontend/src --include="*.tsx" --include="*.ts"

# Search for file path references
grep -r "TodoCalendar" packages/frontend/src --include="*.tsx" --include="*.ts"
```

**If references found**, update them to use new components:
```tsx
// Before
import { TodoCalendar } from './TodoCalendar'

// After
import { DayView, WeekView } from './planner'
```

**Delete the file**:
```bash
rm packages/frontend/src/features/todos/TodoCalendar.tsx
```

---

### Step 8.2: Remove TodoCalendar test file

- **File**: `packages/frontend/src/features/todos/TodoCalendar.test.tsx`
- **Action**: Delete the deprecated test file
- **Why**: Tests for removed component, no longer needed
- **Dependencies**: Step 8.1
- **Risk**: Low

**Delete the file**:
```bash
rm packages/frontend/src/features/todos/TodoCalendar.test.tsx
```

---

### Step 8.3: Clean up unused imports and dead code

- **File**: Multiple files in `packages/frontend/src/features/todos/`
- **Action**: Run dead code analysis and clean up
- **Why**: Remove unused exports, stale type definitions, and dead branches
- **Dependencies**: Phase 1-7 complete
- **Risk**: Low

**Cleanup tasks**:

1. **Run dead code detection**:
```bash
# Check for unused exports
pnpm --filter @nanomail/frontend dlx knip

# Check for unused dependencies
pnpm --filter @nanomail/frontend dlx depcheck
```

2. **Review and remove unused exports**:
```typescript
// In planner/index.ts - ensure only exported components are used
export { DayView } from './DayView'
export { WeekView } from './WeekView'
export { TimeAxis } from './TimeAxis'
export { HourSlot } from './HourSlot'
export { CurrentTimeIndicator } from './CurrentTimeIndicator'
export { PlannerTodoCard } from './PlannerTodoCard'
export { PlannerViewToggle } from './PlannerViewToggle' // Added in Phase 4
```

3. **Clean up stale type definitions**:
```bash
# Search for types related to old calendar
grep -r "CalendarMode\|CalendarView\|MonthView" packages/frontend/src --include="*.ts" --include="*.tsx"
```

4. **Remove commented-out code blocks**:
```bash
# Find large comment blocks
grep -rn "// TODO\|// FIXME\|// HACK\|/\*" packages/frontend/src/features/todos/planner --include="*.tsx"
```

5. **Verify all imports are used**:
```bash
# Check for unused imports in planner components
pnpm --filter @nanomail/frontend lint
```

**Common cleanup items**:

| Item | Action |
|------|--------|
| Unused imports | Remove from file |
| Unused exports | Remove from index.ts |
| Commented code | Delete entirely |
| TODO comments | Resolve or create issue |
| Dead type definitions | Remove from shared schemas |

---

## Verification Commands

After cleanup, run these verification commands:

```bash
# 1. TypeScript compilation check
pnpm --filter @nanomail/frontend build

# 2. Lint check
pnpm --filter @nanomail/frontend lint

# 3. Run all tests
pnpm --filter @nanomail/frontend test

# 4. Check for remaining references to deleted files
grep -r "TodoCalendar" packages/frontend/src --include="*.tsx" --include="*.ts" || echo "No references found"

# 5. Dead code check
pnpm --filter @nanomail/frontend dlx knip --production
```

---

## Files Removed

| File | Reason |
|------|--------|
| `TodoCalendar.tsx` | Replaced by DayView/WeekView |
| `TodoCalendar.test.tsx` | Tests for removed component |

---

## Files Created (All Phases Summary)

| File | Phase | Purpose |
|------|-------|---------|
| `planner/index.ts` | 1 | Barrel export |
| `planner/TimeAxis.tsx` | 1 | 24-hour time axis |
| `planner/CurrentTimeIndicator.tsx` | 1 | Red line + dot |
| `planner/HourSlot.tsx` | 2 | Droppable hour container |
| `planner/PlannerTodoCard.tsx` | 2 | Compact todo card |
| `planner/DayView.tsx` | 2 | Day view container |
| `planner/WeekView.tsx` | 3 | Week view container |
| `planner/PlannerViewToggle.tsx` | 4 | View toggle control |
| `planner/DayView.test.tsx` | 2 | DayView tests |
| `planner/WeekView.test.tsx` | 3 | WeekView tests |
| `planner/HourSlot.test.tsx` | 7 | HourSlot tests |
| `planner/CurrentTimeIndicator.test.tsx` | 7 | CurrentTimeIndicator tests |
| `planner/integration.test.tsx` | 7 | Integration tests |

---

## Files Modified (All Phases Summary)

| File | Phase | Changes |
|------|-------|---------|
| `PlannerPanel.tsx` | 4 | Add view switching, replace TodoCalendar |
| `TodosPage.tsx` | 5 | Update drag handler for hour drops |
| `DroppableZone.tsx` | 5 | Add hour field to droppable data |
| `DndContext.tsx` | 6 | Add DragOverlay for animations |
| `PlannerPanel.test.tsx` | 7 | Update tests for new structure |

---

## Final Checklist

### Build Verification
- [ ] `pnpm build` completes without errors
- [ ] `pnpm lint` completes without errors
- [ ] `pnpm test` passes all tests
- [ ] No TypeScript errors in IDE

### Dead Code Verification
- [ ] `knip` reports no unused exports
- [ ] `depcheck` reports no unused dependencies
- [ ] No references to TodoCalendar in codebase

### Functionality Verification
- [ ] DayView renders correctly
- [ ] WeekView renders correctly
- [ ] View toggle works
- [ ] Drag-drop from Inbox to Planner works
- [ ] Drag-drop from Planner to Board works
- [ ] Current time indicator updates

### Documentation
- [ ] Code comments are accurate
- [ ] Component props have JSDoc comments
- [ ] README updated if needed

---

## Success Criteria (Phase 8 & Overall)

### Phase 8 Specific
- [ ] `TodoCalendar.tsx` deleted
- [ ] `TodoCalendar.test.tsx` deleted
- [ ] No references to deleted files remain
- [ ] Dead code cleanup complete
- [ ] Build passes without errors
- [ ] All tests pass

### Overall Project Success Criteria
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

## Project Complete!

All phases of the Planner Component Refactor are now complete. The feature is ready for:

1. **Code Review**: Submit PR for team review
2. **QA Testing**: Manual testing by QA team
3. **Merge**: Merge to main branch after approval
4. **Deploy**: Deploy to staging/production

### Next Steps After Merge

1. Monitor for any bug reports
2. Gather user feedback on the new scheduler UI
3. Consider enhancements:
   - Date navigation (prev/next day/week)
   - Mini calendar for date picker
   - Task duration support
   - Recurring tasks
   - Drag-to-resize task duration