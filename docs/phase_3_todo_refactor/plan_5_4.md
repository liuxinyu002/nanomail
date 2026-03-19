# Plan 5.4: TodoCard Integration

> Part of: Plan 5 - Todo Card Detail Expansion
> Phase: 4 of 6

## Context

This phase integrates all previously created components (TaskDetailExpand, DeleteIconButton, TodoCardHeader, TodoCardContent) into the main TodoCard component. The TodoCard now supports expand/collapse, detail editing, and delete functionality.

### Overall Feature Requirements

| View | Editable | Delete Icon | Empty Field Display |
|------|----------|-------------|---------------------|
| INBOX | Yes | Yes | Placeholder |
| Board | Yes | Yes | Placeholder |
| Planner | No | No | Hide or "-" |

### Component Architecture

```
TodoCard
├── TodoCardHeader (checkbox + description + DeleteIconButton)
└── TodoCardContent
    ├── DeadlineChip + EmailLinkIcon (collapsed state)
    └── TaskDetailExpand (expanded state)
        ├── Description textarea
        ├── Notes textarea
        └── Deadline date picker
```

### Key Behavior

1. **Click to Expand**: Click anywhere on card (except interactive elements) toggles expand/collapse
2. **Blur to Save**: Description and notes save on blur if changed
3. **Readonly Mode**: Disables editing, hides delete icon, hides placeholders

---

## Dependencies

- **Requires**:
  - [Plan 5.1: Schema & Entity Updates](./plan_5_1.md) - Todo type with `notes` field
  - [Plan 5.2: TaskDetailExpand Component](./plan_5_2.md) - TaskDetailExpand component
  - [Plan 5.3: Delete Icon Replacement](./plan_5_3.md) - DeleteIconButton component

---

## Tasks

### Task 4.1: Update TodoCard Props and Integration

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx`

**Action**: Add new props and integrate detail editing

```tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TodoCardHeader } from './TodoCardHeader'
import { TodoCardContent } from './TodoCardContent'
import type { Todo } from '@nanomail/shared'

interface TodoCardProps {
  todo: Todo
  onToggle: () => void
  onDelete?: () => void
  onSaveDescription?: (value: string) => void
  onSaveNotes?: (value: string | null) => void
  onSaveDeadline?: (value: string | null) => void
  readonly?: boolean
  className?: string
}

export function TodoCard({
  todo,
  onToggle,
  onDelete,
  onSaveDescription,
  onSaveNotes,
  onSaveDeadline,
  readonly = false,
  className,
}: TodoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const completed = todo.status === 'completed'

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="checkbox"]') ||
      target.closest('textarea') ||
      target.closest('input')
    ) {
      return
    }
    setIsExpanded(!isExpanded)
  }

  // Default no-op handlers for readonly mode
  const handleSaveDescription = (value: string) => {
    onSaveDescription?.(value)
  }

  const handleSaveNotes = (value: string | null) => {
    onSaveNotes?.(value)
  }

  const handleSaveDeadline = (value: string | null) => {
    onSaveDeadline?.(value)
  }

  return (
    <div
      data-testid="todo-card"
      onClick={handleCardClick}
      className={cn(
        'bg-white rounded-md cursor-pointer',
        'shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]',
        'hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]',
        'transition-shadow',
        'p-4 mb-2',
        className
      )}
    >
      <TodoCardHeader
        description={todo.description}
        completed={completed}
        onToggle={onToggle}
        onDelete={onDelete}
        isExpanded={isExpanded}
        showDelete={!readonly}
      />

      <TodoCardContent
        todo={todo}
        isExpanded={isExpanded}
        readonly={readonly}
        onSaveDescription={handleSaveDescription}
        onSaveNotes={handleSaveNotes}
        onSaveDeadline={handleSaveDeadline}
      />
    </div>
  )
}
```

**Verification**: TodoCard compiles and renders with new props.

**Risk**: Medium

---

### Task 4.2: Update TodoCard Index Export

**File**: `packages/frontend/src/features/todos/TodoCard/index.ts`

**Action**: Export new components

```typescript
export { TodoCard } from './TodoCard'
export { TodoCardHeader } from './TodoCardHeader'
export { TodoCardContent } from './TodoCardContent'
export { TaskDetailExpand } from './TaskDetailExpand'
export { DeleteIconButton } from './DeleteIconButton'
export { DeadlineChip } from './DeadlineChip'
export { EmailLinkIcon } from './EmailLinkIcon'
```

**Verification**: All components can be imported from index.

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx` | MODIFY |
| `packages/frontend/src/features/todos/TodoCard/index.ts` | MODIFY |

---

## Testing Checklist

### TodoCard
- [ ] Card expands/collapses on click
- [ ] Click on checkbox doesn't toggle expand
- [ ] Click on delete button doesn't toggle expand
- [ ] Click on textarea/input doesn't toggle expand
- [ ] `readonly` prop hides delete icon
- [ ] `readonly` prop disables editing in TaskDetailExpand
- [ ] Save handlers are called correctly
- [ ] Completed todos show strikethrough style

---

## Next Phase

After completing this phase, proceed to [Plan 5.5: View Integration](./plan_5_5.md).