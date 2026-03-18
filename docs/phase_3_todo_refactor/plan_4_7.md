# Phase 7: Legacy Component Migration(todo)

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

This is the final phase that brings together all previous work. The legacy `TodoItem` component will be updated to use the new card design, ensuring all consumers receive the improved UI.

---

## Dependencies

- **Phase 1-6**: All components and styles from previous phases
- **Phase 4**: TodoCard component
- **Phase 5**: DraggableTodoItem with conflict resolution

---

## Implementation Steps

### Step 7.1: Update Old TodoItem

**File**: `packages/frontend/src/features/todos/TodoItem.tsx`

**Action**: Refactor to use new card design

**Option A: Replace with TodoCard (Recommended)**

```tsx
// TodoItem.tsx - Simplified wrapper
import { TodoCard } from './TodoCard'
import type { Todo } from '@nanomail/shared'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onUpdate?: (id: string, updates: Partial<Todo>) => void
  onDelete?: (id: string) => void
}

export function TodoItem({
  todo,
  onToggle,
  onUpdate,
  onDelete,
}: TodoItemProps) {
  return (
    <TodoCard
      todo={todo}
      onToggle={() => onToggle(todo.id)}
      onEdit={() => onUpdate?.(todo.id, {})}
      onDelete={() => onDelete?.(todo.id)}
      onMoveToColumn={() => {/* Open move dialog */}}
      onSetDeadline={() => {/* Open date picker */}}
    />
  )
}
```

**Option B: Keep as separate component with shared styles**

If `TodoItem` has unique behavior not in `TodoCard`:

```tsx
// TodoItem.tsx - Keep but use shared styles
import { cn } from '@/lib/utils'
import { CardDropdownMenu } from './CardDropdownMenu'

export function TodoItem({ todo, onToggle, ... }: TodoItemProps) {
  // Unique TodoItem logic here

  return (
    <div className={cn(
      "bg-white rounded-md",
      "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]",
      "hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]",
      "transition-shadow p-4 mb-2"
    )}>
      {/* Use shared sub-components where possible */}
      {/* ... */}
    </div>
  )
}
```

**Dependencies**: Phase 4

**Risk**: Medium (breaking change)

---

### Step 7.2: Update All Imports

**Action**: Verify all consumers use updated components

**Files to check**:
- `packages/frontend/src/features/todos/DraggableTodoItem.tsx`
- `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`
- `packages/frontend/src/pages/TodoPage.tsx`
- Any other files importing `TodoItem`

**Migration checklist**:
```tsx
// Before
import { TodoItem } from './TodoItem'

// After (if using TodoCard directly)
import { TodoCard } from './TodoCard'

// OR keep using TodoItem (now wraps TodoCard)
import { TodoItem } from './TodoItem'
```

**Dependencies**: Step 7.1

**Risk**: Low

---

### Step 7.3: Remove Dead Code

**Action**: Clean up unused styles and components

**Check for removal**:
- Old color presets in `ColorPicker.tsx`
- Unused CSS classes
- Old inline styles
- Unused props in legacy components

**Dependencies**: Step 7.2

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/TodoItem.tsx` | MODIFY |
| `packages/frontend/src/features/todos/DraggableTodoItem.tsx` | MODIFY |
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | MODIFY |
| `packages/frontend/src/pages/TodoPage.tsx` | MODIFY (if needed) |

---

## Testing Checklist

- [ ] All pages render correctly with new components
- [ ] Drag and drop works
- [ ] Expand/collapse works
- [ ] Dropdown menu works
- [ ] Checkbox toggle works
- [ ] All callbacks fire correctly
- [ ] No console errors
- [ ] No TypeScript errors
- [ ] Visual regression tests pass

---

## Success Criteria (Full Plan)

- [x] Phase 1: Color palette established
- [x] Phase 2: Column background fixed to `bg-[#F7F8FA]`
- [x] Phase 3: Dropdown menu created with animations
- [x] Phase 4: Todo card has white background with soft shadow
- [x] Phase 5: Drag vs expand conflict resolved
- [x] Phase 6: EmptyState uses SVG-based flat illustration
- [x] Phase 7: Legacy components migrated

### Final Verification

- [ ] Column background fixed to `bg-[#F7F8FA]`
- [ ] Status dot (w-2 h-2) shows on left of column title
- [ ] Todo card has white background with soft shadow `shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]`
- [ ] No hard borders on cards
- [ ] Cards expand inline with smooth animation
- [ ] Title uses `line-clamp-2` by default, full text on expand
- [ ] Text hierarchy: main `text-[#111827] font-medium`, secondary `text-[#6B7280] text-sm`
- [ ] Card padding `p-4`, element gaps `gap-2`, section gaps `gap-3`
- [ ] Dropdown menu has white background, soft shadow, fade + translate animation
- [ ] Checkbox uses brand Vibrant Blue `#2563EB`
- [ ] Drag vs expand conflict resolved with proper event handling
- [ ] All tests pass with 80%+ coverage

---

## Rollback Plan

If issues arise after migration:

1. **Git revert**: `git revert <commit-hash>`
2. **Feature flag**: Wrap new components in conditional render
   ```tsx
   {USE_NEW_CARD ? <TodoCard {...props} /> : <LegacyTodoItem {...props} />}
   ```
3. **Gradual rollout**: Migrate one column at a time

---

## Post-Implementation

After successful migration:

1. Run full test suite: `pnpm test`
2. Run E2E tests: `pnpm e2e`
3. Visual regression check
4. Performance audit (Lighthouse)
5. Update documentation if needed