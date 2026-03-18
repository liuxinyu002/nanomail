# Phase 4: Todo Card Redesign

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

This is the core phase of the UI refactoring. The todo card undergoes a complete visual and structural redesign with:
- Clean white background with soft shadow
- Proper text hierarchy
- Inline expansion capability
- No database schema changes (UI only)

---

## Dependencies

- **Phase 1**: `BRAND_COLORS` for consistent colors
- **Phase 3**: `CardDropdownMenu` component

---

## Requirements

### Priority 2: Todo Card Deep Optimization

| Requirement | Specification |
|-------------|---------------|
| Card background | White `bg-white` |
| Border | No hard borders, soft shadow only |
| Shadow | `shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]` |
| Hover shadow | `shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]` |
| Main title | `text-[#111827] font-medium`, `line-clamp-2` |
| Secondary text | `text-[#6B7280] text-sm` |
| Checkbox checked | Brand Vibrant Blue `#2563EB` |
| Completed state | `line-through` + `opacity-50` |
| Card padding | `p-4` (16px) |
| Element gaps | `gap-2` (8px) |
| Section gaps | `gap-3` (12px) |

### Priority 3: Card Inline Expansion (UI Only)

| Requirement | Specification |
|-------------|---------------|
| Database changes | NONE - only display existing data |
| Expand trigger | Click card body (excluding interactive zones) |
| Animation | `grid-template-rows` for 200-300ms transition |
| Expand area background | `bg-[#F7F8FA]/50` |
| Visual separation | `border-t border-[#E5E7EB]` |

### Priority 5: Information Density

| Element | Spacing |
|---------|---------|
| Card container padding | `p-4` (16px) |
| Element gaps | `gap-2` (8px) |
| Section gaps | `gap-3` (12px) |
| Column internal padding | `p-3` (12px) |
| Card margin bottom | `mb-2` (8px) |
| Title | Default `line-clamp-2`, expand shows full text |

---

## Component Structure

```
packages/frontend/src/features/todos/TodoCard/
├── index.ts                 # Barrel export
├── TodoCard.tsx             # Main card with expansion
├── TodoCardHeader.tsx       # Checkbox + title + dropdown trigger
├── TodoCardContent.tsx      # Metadata + expand area
├── DeadlineChip.tsx         # Deadline display with icon
├── EmailLinkIcon.tsx        # Email link with hover color
└── TodoCard.test.tsx        # Tests
```

---

## Implementation Steps

### Step 4.1: Create TodoCard Component Structure

**File**: `packages/frontend/src/features/todos/TodoCard/index.ts`

**Action**: Create barrel export file

```typescript
export { TodoCard } from './TodoCard'
export { TodoCardHeader } from './TodoCardHeader'
export { TodoCardContent } from './TodoCardContent'
export { DeadlineChip } from './DeadlineChip'
export { EmailLinkIcon } from './EmailLinkIcon'
```

**Dependencies**: None

**Risk**: Low

---

### Step 4.2: Create TodoCardHeader Component

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx`

**Action**: Create header with checkbox, title, and dropdown trigger

```tsx
import { Checkbox } from '@/components/ui/checkbox'
import { CardDropdownMenu } from '../CardDropdownMenu'
import { cn } from '@/lib/utils'

interface TodoCardHeaderProps {
  id: string
  description: string
  completed: boolean
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  isExpanded?: boolean
}

export function TodoCardHeader({
  id,
  description,
  completed,
  onToggle,
  onEdit,
  onDelete,
  isExpanded,
}: TodoCardHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      {/* Checkbox with brand color */}
      <Checkbox
        checked={completed}
        onCheckedChange={onToggle}
        className={cn(
          "mt-0.5 border-[#6B7280]",
          "data-[state=checked]:bg-[#2563EB]",
          "data-[state=checked]:border-[#2563EB]"
        )}
      />

      {/* Title with line-clamp-2 */}
      <p
        className={cn(
          "flex-1 text-[#111827] font-medium",
          !isExpanded && "line-clamp-2",
          completed && "line-through opacity-50"
        )}
      >
        {description}
      </p>

      {/* Dropdown trigger */}
      <CardDropdownMenu
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  )
}
```

> **Note**: "Set deadline" and "Move to column" options were removed from the dropdown menu. Deadline setting should be integrated into the Edit functionality, and column movement is handled via drag-and-drop in the Kanban view.

**Dependencies**: Phase 3 (CardDropdownMenu)

**Risk**: Low

---

### Step 4.3: Create Supporting Components

#### DeadlineChip

**File**: `packages/frontend/src/features/todos/TodoCard/DeadlineChip.tsx`

```tsx
import { Calendar } from 'lucide-react'

interface DeadlineChipProps {
  deadline: Date | string
}

export function DeadlineChip({ deadline }: DeadlineChipProps) {
  const formatted = formatDate(deadline)

  return (
    <span className="flex items-center gap-1 text-[#6B7280] text-sm">
      <Calendar className="w-3.5 h-3.5" />
      {formatted}
    </span>
  )
}

function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}
```

#### EmailLinkIcon

**File**: `packages/frontend/src/features/todos/TodoCard/EmailLinkIcon.tsx`

```tsx
import { ExternalLink } from 'lucide-react'
import { Link } from 'react-router-dom'

interface EmailLinkIconProps {
  emailId: string
}

export function EmailLinkIcon({ emailId }: EmailLinkIconProps) {
  return (
    <Link
      to={`/emails/${emailId}`}
      onClick={(e) => e.stopPropagation()}
      className="text-[#6B7280] hover:text-[#2563EB] transition-colors"
    >
      <ExternalLink className="w-3.5 h-3.5" />
    </Link>
  )
}
```

**Dependencies**: None

**Risk**: Low

---

### Step 4.4: Create TodoCardContent Component

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCardContent.tsx`

**Action**: Create content area with metadata and expansion

```tsx
import { cn } from '@/lib/utils'
import { DeadlineChip } from './DeadlineChip'
import { EmailLinkIcon } from './EmailLinkIcon'

interface TodoCardContentProps {
  deadline?: Date | string | null
  emailId?: string | null
  details?: string | null
  isExpanded: boolean
}

export function TodoCardContent({
  deadline,
  emailId,
  details,
  isExpanded,
}: TodoCardContentProps) {
  return (
    <>
      {/* Metadata row - always visible */}
      <div className="flex items-center gap-3 pt-2">
        {deadline && <DeadlineChip deadline={deadline} />}
        {emailId && <EmailLinkIcon emailId={emailId} />}
      </div>

      {/* Expandable details area */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          isExpanded ? "[grid-template-rows:1fr]" : "[grid-template-rows:0fr]"
        )}
      >
        <div className="overflow-hidden">
          {details && (
            <div className="pt-3 mt-3 border-t border-[#E5E7EB] bg-[#F7F8FA]/50 -mx-4 px-4 pb-2">
              <p className="text-sm text-[#6B7280] whitespace-pre-wrap">
                {details}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
```

**Dependencies**: DeadlineChip, EmailLinkIcon

**Risk**: Low

---

### Step 4.5: Create Main TodoCard Component

**File**: `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx`

**Action**: Compose card with header and content

```tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TodoCardHeader } from './TodoCardHeader'
import { TodoCardContent } from './TodoCardContent'
import type { Todo } from '@nanomail/shared'

interface TodoCardProps {
  todo: Todo
  onToggle: () => void
  onEdit?: () => void
  onDelete?: () => void
  onMoveToColumn?: () => void
  onSetDeadline?: () => void
  className?: string
}

export function TodoCard({
  todo,
  onToggle,
  onEdit,
  onDelete,
  onMoveToColumn,
  onSetDeadline,
  className,
}: TodoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on interactive elements
    const target = e.target as HTMLElement
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="checkbox"]')
    ) {
      return
    }
    setIsExpanded(!isExpanded)
  }

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "bg-white rounded-md cursor-pointer",
        "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]",
        "hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]",
        "transition-shadow",
        "p-4 mb-2",
        className
      )}
    >
      <TodoCardHeader
        id={todo.id}
        description={todo.description}
        completed={todo.completed}
        onToggle={onToggle}
        onEdit={onEdit}
        onDelete={onDelete}
        onMoveToColumn={onMoveToColumn}
        onSetDeadline={onSetDeadline}
        isExpanded={isExpanded}
      />

      <TodoCardContent
        deadline={todo.deadline}
        emailId={todo.emailId}
        details={todo.details}
        isExpanded={isExpanded}
      />
    </div>
  )
}
```

**Dependencies**: TodoCardHeader, TodoCardContent

**Risk**: Medium (composition complexity)

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/TodoCard/index.ts` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/TodoCard.tsx` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/TodoCardHeader.tsx` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/TodoCardContent.tsx` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/DeadlineChip.tsx` | CREATE |
| `packages/frontend/src/features/todos/TodoCard/EmailLinkIcon.tsx` | CREATE |

---

## Testing Checklist

- [ ] Card renders with white background and soft shadow
- [ ] Checkbox uses brand blue `#2563EB` when checked
- [ ] Title uses `line-clamp-2` by default
- [ ] Title expands to full text when card is expanded
- [ ] Completed state shows `line-through` + `opacity-50`
- [ ] Card padding is `p-4`, gaps are `gap-2` and `gap-3`
- [ ] Expansion animation is smooth (200-300ms)
- [ ] Click on interactive elements doesn't trigger expand
- [ ] Hover shadow increases on hover

---

## Next Phase

→ [Phase 5: Drag vs Expand Conflict Resolution](./plan_4_5.md)

---

## Related Phases

- **Phase 3**: CardDropdownMenu integration
- **Phase 5**: Expand/drag conflict resolution
- **Phase 7**: Legacy TodoItem migration to new TodoCard