# Phase 2: Column Background Purification

> Part of: [UI Refactoring Plan 4](./plan_4.md) - Todo Items and Board Components

## Context

This phase focuses on cleaning up the visual appearance of board columns. The goal is to:
1. Remove high-saturation custom colors from column backgrounds
2. Add subtle status indicators (dots) instead of full-column coloring
3. Create a cleaner, more modern Kanban appearance

## Dependencies

- **Phase 1**: Requires `MACARON_COLORS` from `constants/colors.ts`

---

## Requirements

### Priority 1: Board Column Background Purification

| Requirement | Specification |
|-------------|---------------|
| Column background | Fixed to `#F7F8FA` using `bg-[#F7F8FA]` |
| Remove `column.color` binding | No longer applies to column background |
| Status dot | `w-2 h-2 rounded-full` on LEFT side of column title |
| Layout | `flex items-center gap-2` for alignment |
| Status dot color | Bind `column.color` only to this dot |
| Spacing | Adequate margin between header and first card |

---

## Implementation Steps

### Step 2.1: Update BoardColumnDroppable

**File**: `packages/frontend/src/features/todos/BoardColumnDroppable.tsx`

**Action**:
1. Fix background to `bg-[#F7F8FA]`
2. Remove dynamic color binding from column background
3. Add `p-3` internal padding

**Before**:
```tsx
// Old: Dynamic background color
<div className={cn("...", column.color && `bg-${column.color}`)}>
```

**After**:
```tsx
// New: Fixed neutral background
<div className="bg-[#F7F8FA] p-3 rounded-lg min-h-[200px]">
  {/* Column content */}
</div>
```

**Why**: Clean, consistent column appearance across all columns

**Dependencies**: None

**Risk**: Low

---

### Step 2.2: Update ColumnHeader with Status Dot

**File**: `packages/frontend/src/features/todos/ColumnHeader.tsx`

**Action**:
1. Move color dot to LEFT of column name
2. Use smaller dot: `w-2 h-2 rounded-full`
3. Layout: `flex items-center gap-2`
4. Bind `column.color` to dot background

**Implementation**:
```tsx
import { MACARON_COLORS } from '@/constants/colors'

interface ColumnHeaderProps {
  column: {
    id: string
    name: string
    color?: string
  }
  // ... other props
}

export function ColumnHeader({ column, ...props }: ColumnHeaderProps) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {/* Status dot - LEFT of title */}
      <div
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: column.color || MACARON_COLORS[0] }}
      />

      {/* Column title */}
      <h3 className="text-sm font-medium text-[#111827]">
        {column.name}
      </h3>

      {/* Optional: column actions */}
      {/* ... */}
    </div>
  )
}
```

**Why**: Status indicator provides visual differentiation without heavy column coloring

**Dependencies**: Phase 1 (Step 1.1 - `MACARON_COLORS`)

**Risk**: Low

---

## Visual Reference

```
┌─────────────────────────────┐
│  bg-[#F7F8FA]               │
│                             │
│  ┌─────────────────────┐   │
│  │ ● Inbox        (…)  │   │  ← Status dot (w-2 h-2)
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Todo Card 1         │   │
│  └─────────────────────┘   │
│                             │
│  ┌─────────────────────┐   │
│  │ Todo Card 2         │   │
│  └─────────────────────┘   │
│                             │
└─────────────────────────────┘
```

---

## Files Changed

| File | Action |
|------|--------|
| `packages/frontend/src/features/todos/BoardColumnDroppable.tsx` | MODIFY |
| `packages/frontend/src/features/todos/ColumnHeader.tsx` | MODIFY |

---

## Testing Checklist

- [ ] All columns have `#F7F8FA` background
- [ ] Status dot appears on LEFT of column title
- [ ] Dot size is `w-2 h-2 rounded-full`
- [ ] Dot color matches `column.color`
- [ ] Layout uses `flex items-center gap-2`
- [ ] Adequate spacing between header and cards
- [ ] No visual regression in column layout

---

## Next Phase

→ [Phase 3: Card Dropdown Menu](./plan_4_3.md)

---

## Related Phases

- **Phase 1**: Color palette source
- **Phase 4**: Todo card styling builds on clean column background
- **Phase 6**: EmptyState integrates into purified columns