# Phase 3: Card Dropdown Menu

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

This phase creates a new dropdown menu component for todo cards. The menu provides quick access to common actions like edit, delete, and move operations.

The dropdown will be used in:
- TodoCard header (Phase 4)
- Future card-related actions

---

## Requirements

### Priority 4: Card Dropdown Menu

| Requirement | Specification |
|-------------|---------------|
| Trigger | `...` icon (three dots) in top-right corner |
| Container background | `bg-white` |
| Shadow | `shadow-lg` (light, soft) |
| Border | No border (clean edge) |
| Radius | `rounded-md` |
| Enter animation | `fade-in` + `translate-y-[-4px]` → final position, `duration-150 ease-out` |
| Leave animation | `fade-out` + translate down, `duration-100 ease-in` |
| Menu items | `px-3 py-2 text-left text-[#111827] hover:bg-[#F7F8FA] transition-colors` |
| Actions | Edit, Delete, Move to column, Set deadline |

---

## Implementation Steps

### Step 3.1: Create CardDropdownMenu Component

**File**: `packages/frontend/src/features/todos/CardDropdownMenu.tsx` (NEW)

**Action**: Create dropdown menu with specified animations

**Implementation**:
```tsx
import { useState } from 'react'
import { MoreHorizontal, Edit, Trash2, Move, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface CardDropdownMenuProps {
  onEdit?: () => void
  onDelete?: () => void
  onMoveToColumn?: () => void
  onSetDeadline?: () => void
}

export function CardDropdownMenu({
  onEdit,
  onDelete,
  onMoveToColumn,
  onSetDeadline,
}: CardDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const menuItems: MenuItem[] = [
    { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => onEdit?.() },
    { label: 'Set deadline', icon: <Calendar className="w-4 h-4" />, onClick: () => onSetDeadline?.() },
    { label: 'Move to column', icon: <Move className="w-4 h-4" />, onClick: () => onMoveToColumn?.() },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => onDelete?.(), danger: true },
  ]

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1 rounded hover:bg-[#F7F8FA] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
      </button>

      {/* Dropdown container */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div
            className={cn(
              "absolute right-0 top-full mt-1 z-50",
              "w-48 bg-white rounded-md shadow-lg",
              "animate-in fade-in duration-150 ease-out",
              "translate-y-[-4px] data-[state=open]:translate-y-0"
            )}
          >
            {menuItems.map((item, index) => (
              <button
                key={item.label}
                onClick={(e) => {
                  e.stopPropagation()
                  item.onClick()
                  setIsOpen(false)
                }}
                className={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                  item.danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-[#111827] hover:bg-[#F7F8FA]"
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
```

**Dependencies**: None

**Risk**: Low

---

### Step 3.2: Add Animation Styles (if needed)

**File**: `packages/frontend/tailwind.config.js` (if animations not present)

**Action**: Ensure animation utilities are available

```javascript
// Add to tailwind.config.js if needed
module.exports = {
  // ...
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 150ms ease-out',
        'fade-out': 'fadeOut 100ms ease-in',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
      },
    },
  },
}
```

**Dependencies**: None

**Risk**: Low

---

## Usage Example

```tsx
// In TodoCardHeader.tsx
<CardDropdownMenu
  onEdit={() => openEditModal(todo)}
  onDelete={() => deleteTodo(todo.id)}
  onMoveToColumn={() => openMoveDialog(todo)}
  onSetDeadline={() => openDatePicker(todo)}
/>
```

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/CardDropdownMenu.tsx` | CREATE |
| `packages/frontend/tailwind.config.js` | MODIFY (optional) |

---

## Testing Checklist

- [ ] Dropdown renders on trigger click
- [ ] Enter animation: fade + translate from `-4px`
- [ ] Leave animation: fade + translate down
- [ ] Menu items have correct styling
- [ ] Click outside closes dropdown
- [ ] Actions fire correctly
- [ ] Z-index properly layered
- [ ] Works with stopPropagation for drag scenarios

---

## Next Phase

→ [Phase 4: Todo Card Redesign](./plan_4_4.md)

---

## Related Phases

- **Phase 4**: CardDropdownMenu is used in TodoCardHeader
- **Phase 5**: Dropdown must not interfere with drag operations