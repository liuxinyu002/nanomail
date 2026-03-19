# Plan 5.2: TaskDetailExpand Component

> Part of: Plan 5 - Todo Card Detail Expansion
> Phase: 2 of 6

## Context

This phase creates the core expandable detail component for Todo cards. The `TaskDetailExpand` component allows users to view and edit description, notes, and deadline fields with a smooth expand/collapse animation.

### Overall Feature Requirements

| Field | Type | Max Length | Edit Mode | Save Trigger |
|-------|------|------------|-----------|--------------|
| `description` | text | 2000 | Instant edit | Blur (if changed) |
| `notes` | text | 2000 | Instant edit | Blur (if changed) |
| `deadline` | datetime | - | Date picker | Selection (onChange) |

### View-Specific Behavior

| View | Editable | Delete Icon | Empty Field Display |
|------|----------|-------------|---------------------|
| INBOX | Yes | Yes | Placeholder |
| Board | Yes | Yes | Placeholder |
| Planner | No | No | Hide or "-" |

### Key Design Decisions

1. **Local State with Refs**: Use local state for controlled inputs, refs to track initial values for change detection
2. **CSS Grid Animation**: Use `grid-template-rows` transition for smooth expand/collapse
3. **Read-only Mode**: Prop `readonly` switches between editable and display-only rendering

---

## Dependencies

- **Requires**: [Plan 5.1: Schema & Entity Updates](./plan_5_1.md) - Todo type must have `notes` field
- **Blocks**: Plan 5.4 (TodoCard Integration)

---

## Tasks

### Task 2.1: Create TaskDetailExpand Component

**File**: `packages/frontend/src/features/todos/TodoCard/TaskDetailExpand.tsx`

**Action**: Create expandable detail area with edit capability

```tsx
import { useState, useRef, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TaskDetailExpandProps {
  description: string
  notes: string | null
  deadline: string | null
  isExpanded: boolean
  readonly?: boolean
  onSaveDescription: (value: string) => void
  onSaveNotes: (value: string | null) => void
  onSaveDeadline: (value: string | null) => void
}

export function TaskDetailExpand({
  description,
  notes,
  deadline,
  isExpanded,
  readonly = false,
  onSaveDescription,
  onSaveNotes,
  onSaveDeadline,
}: TaskDetailExpandProps) {
  // Local state for controlled inputs
  const [localDescription, setLocalDescription] = useState(description)
  const [localNotes, setLocalNotes] = useState(notes ?? '')
  const [isSaving, setIsSaving] = useState(false)

  // Refs for tracking initial values
  const descriptionRef = useRef(description)
  const notesRef = useRef(notes)

  // Sync local state when props change
  useEffect(() => {
    setLocalDescription(description)
    descriptionRef.current = description
  }, [description])

  useEffect(() => {
    setLocalNotes(notes ?? '')
    notesRef.current = notes
  }, [notes])

  // Save handlers with change detection
  const handleDescriptionBlur = async () => {
    if (localDescription !== descriptionRef.current) {
      setIsSaving(true)
      try {
        await onSaveDescription(localDescription)
        descriptionRef.current = localDescription
      } catch (error) {
        // Revert on error
        setLocalDescription(descriptionRef.current)
        // TODO: Show toast error
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleNotesBlur = async () => {
    const newNotes = localNotes.trim() || null
    if (newNotes !== notesRef.current) {
      setIsSaving(true)
      try {
        await onSaveNotes(newNotes)
        notesRef.current = newNotes
      } catch (error) {
        setLocalNotes(notesRef.current ?? '')
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleDeadlineChange = async (value: string | null) => {
    setIsSaving(true)
    try {
      await onSaveDeadline(value)
    } catch (error) {
      // TODO: Show toast error
    } finally {
      setIsSaving(false)
    }
  }

  // Read-only rendering
  if (readonly) {
    return (
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isExpanded ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-3 mt-3 border-t border-[#E5E7EB] bg-[#F7F8FA]/50 -mx-4 px-4 pb-2 space-y-3">
            {description && (
              <div>
                <label className="text-xs text-[#6B7280] uppercase tracking-wide">描述</label>
                <p className="text-sm text-[#111827] mt-1 whitespace-pre-wrap">{description}</p>
              </div>
            )}
            {notes && (
              <div>
                <label className="text-xs text-[#6B7280] uppercase tracking-wide">笔记</label>
                <p className="text-sm text-[#111827] mt-1 whitespace-pre-wrap">{notes}</p>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Calendar className="w-4 h-4" />
                <span>{formatDeadline(deadline)}</span>
              </div>
            )}
            {!description && !notes && !deadline && (
              <p className="text-sm text-[#9CA3AF]">无详细信息</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Editable rendering
  return (
    <div
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        isExpanded ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
      )}
    >
      <div className="overflow-hidden">
        <div className="pt-3 mt-3 border-t border-[#E5E7EB] bg-[#F7F8FA]/50 -mx-4 px-4 pb-2 space-y-3">
          {/* Description */}
          <div>
            <label className="text-xs text-[#6B7280] uppercase tracking-wide">描述</label>
            <textarea
              value={localDescription}
              onChange={(e) => {
                setLocalDescription(e.target.value)
                // Auto-resize: reset to auto first to get accurate scrollHeight
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onBlur={handleDescriptionBlur}
              placeholder="添加描述..."
              rows={2}
              className={cn(
                'w-full mt-1 text-sm text-[#111827] resize-y',
                'bg-transparent border-none outline-none',
                'placeholder:text-[#9CA3AF]',
                'focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:rounded px-1 -mx-1',
                'min-h-[2.5rem] max-h-[12rem] overflow-y-auto'
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs text-[#6B7280] uppercase tracking-wide">笔记</label>
            <textarea
              value={localNotes}
              onChange={(e) => {
                setLocalNotes(e.target.value)
                // Auto-resize: reset to auto first to get accurate scrollHeight
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onBlur={handleNotesBlur}
              placeholder="添加笔记..."
              rows={3}
              className={cn(
                'w-full mt-1 text-sm text-[#111827] resize-y',
                'bg-transparent border-none outline-none',
                'placeholder:text-[#9CA3AF]',
                'focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:rounded px-1 -mx-1',
                'min-h-[3.75rem] max-h-[12rem] overflow-y-auto'
              )}
            />
          </div>

          {/* Deadline */}
          <div>
            <label className="text-xs text-[#6B7280] uppercase tracking-wide">截止时间</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <input
                type="date"
                value={deadline ? deadline.split('T')[0] : ''}
                onChange={(e) => {
                  const value = e.target.value
                  handleDeadlineChange(value ? `${value}T23:59:59.999Z` : null)
                }}
                className={cn(
                  'text-sm text-[#111827]',
                  'bg-transparent border-none outline-none',
                  'focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:rounded px-1'
                )}
              />
              {deadline && (
                <button
                  onClick={() => handleDeadlineChange(null)}
                  className="text-xs text-[#6B7280] hover:text-[#EF4444]"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* Saving indicator */}
          {isSaving && (
            <div className="text-xs text-[#9CA3AF]">保存中...</div>
          )}
        </div>
      </div>
    </div>
  )
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline)
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
```

**Verification**: Component renders without errors, expand/collapse animation works smoothly.

**Risk**: Medium (state management complexity)

---

### Task 2.2: Update TodoCardContent

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCardContent.tsx`

**Action**: Integrate TaskDetailExpand component

```tsx
import { TaskDetailExpand } from './TaskDetailExpand'
import { DeadlineChip } from './DeadlineChip'
import { EmailLinkIcon } from './EmailLinkIcon'

interface TodoCardContentProps {
  todo: {
    id: number
    description: string
    notes: string | null
    deadline: string | null
    emailId?: number | null
  }
  isExpanded: boolean
  readonly?: boolean
  onSaveDescription: (value: string) => void
  onSaveNotes: (value: string | null) => void
  onSaveDeadline: (value: string | null) => void
}

export function TodoCardContent({
  todo,
  isExpanded,
  readonly = false,
  onSaveDescription,
  onSaveNotes,
  onSaveDeadline,
}: TodoCardContentProps) {
  return (
    <>
      {/* Metadata row - visible when collapsed */}
      {!isExpanded && (todo.deadline || todo.emailId) && (
        <div className="flex items-center gap-3 pt-2">
          {todo.deadline && <DeadlineChip deadline={todo.deadline} />}
          {todo.emailId && <EmailLinkIcon emailId={todo.emailId} />}
        </div>
      )}

      {/* Expandable detail area */}
      <TaskDetailExpand
        description={todo.description}
        notes={todo.notes}
        deadline={todo.deadline}
        isExpanded={isExpanded}
        readonly={readonly}
        onSaveDescription={onSaveDescription}
        onSaveNotes={onSaveNotes}
        onSaveDeadline={onSaveDeadline}
      />
    </>
  )
}
```

**Verification**: TodoCardContent integrates TaskDetailExpand correctly.

**Risk**: Low

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/TodoCard/TaskDetailExpand.tsx` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/TodoCardContent.tsx` | MODIFY |

---

## Testing Checklist

### TaskDetailExpand
- [ ] Description field shows placeholder when empty
- [ ] Notes field shows placeholder when empty
- [ ] Deadline picker works correctly
- [ ] Blur saves changes (if modified)
- [ ] Deadline change saves immediately
- [ ] Local state prevents cursor jumping
- [ ] Readonly mode hides placeholders and edit capability
- [ ] Expand/collapse animation is smooth

### TodoCardContent
- [ ] Metadata row visible when collapsed
- [ ] TaskDetailExpand receives correct props

---

## Next Phase

After completing this phase, proceed to [Plan 5.4: TodoCard Integration](./plan_5_4.md).