# Plan 5.3: Delete Icon Replacement

> Part of: Plan 5 - Todo Card Detail Expansion
> Phase: 3 of 6

## Context

This phase replaces the settings dropdown menu with a simple delete icon in the TodoCard header. The delete action requires a confirmation dialog to prevent accidental deletions.

### Overall Feature Requirements

| View | Editable | Delete Icon | Empty Field Display |
|------|----------|-------------|---------------------|
| INBOX | Yes | Yes | Placeholder |
| Board | Yes | Yes | Placeholder |
| Planner | No | No | Hide or "-" |

### Delete Icon Specification

- Use `Trash2` icon from `lucide-react`
- Show confirmation dialog (AlertDialog) before delete
- Red color on hover to indicate destructive action
- Hidden in Planner view (readonly mode)

---

## Dependencies

- **No prerequisites**: This phase is independent and can be done in parallel with Phase 2
- **Blocks**: Plan 5.4 (TodoCard Integration)

---

## Tasks

### Task 3.1: Create DeleteIconButton Component

**File**: `packages/frontend/src/features/todos/TodoCard/DeleteIconButton.tsx`

**Action**: Create delete button with confirmation dialog

```tsx
import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

interface DeleteIconButtonProps {
  onDelete: () => void
}

export function DeleteIconButton({ onDelete }: DeleteIconButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleDelete = () => {
    onDelete()
    setIsOpen(false)
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'p-1 rounded',
            'text-[#9CA3AF] hover:text-[#EF4444] hover:bg-red-50',
            'transition-colors'
          )}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>确认删除</AlertDialogTitle>
          <AlertDialogDescription>
            确定要删除这个待办事项吗？此操作无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600"
          >
            删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

**Verification**: Delete button shows confirmation dialog on click.

**Risk**: Low

---

### Task 3.2: Update TodoCardHeader

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx`

**Action**: Replace CardDropdownMenu with DeleteIconButton

```tsx
import { Checkbox } from '@/components/ui/checkbox'
import { DeleteIconButton } from './DeleteIconButton'
import { cn } from '@/lib/utils'

interface TodoCardHeaderProps {
  description: string
  completed: boolean
  onToggle: () => void
  onDelete?: () => void
  isExpanded?: boolean
  showDelete?: boolean
}

export function TodoCardHeader({
  description,
  completed,
  onToggle,
  onDelete,
  isExpanded,
  showDelete = true,
}: TodoCardHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <Checkbox
        checked={completed}
        onCheckedChange={onToggle}
        className={cn(
          'mt-0.5 border-[#6B7280]',
          'data-[state=checked]:bg-[#2563EB]',
          'data-[state=checked]:border-[#2563EB]'
        )}
      />

      <p
        className={cn(
          'flex-1 text-[#111827] font-medium',
          !isExpanded && 'line-clamp-2',
          completed && 'line-through opacity-50'
        )}
      >
        {description}
      </p>

      {showDelete && onDelete && (
        <DeleteIconButton onDelete={onDelete} />
      )}
    </div>
  )
}
```

**Verification**: Header shows delete icon, dropdown menu is removed.

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/TodoCard/DeleteIconButton.tsx` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx` | MODIFY |

---

## Testing Checklist

### Delete Icon
- [ ] Trash2 icon appears in header
- [ ] Icon shows red color on hover
- [ ] Confirmation dialog shows on click
- [ ] Delete executes after confirmation
- [ ] Click outside cancels deletion
- [ ] Click on card doesn't trigger dialog (stopPropagation)

### TodoCardHeader
- [ ] Delete icon appears when `showDelete=true` and `onDelete` provided
- [ ] Delete icon hidden when `showDelete=false`
- [ ] Existing checkbox and description functionality unchanged

---

## Next Phase

After completing this phase, proceed to [Plan 5.4: TodoCard Integration](./plan_5_4.md).