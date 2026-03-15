# Plan 7 - Phase 2: Utility Components

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 2 of 10
> **Status**: Ready for Implementation
> **Created**: 2026-03-15

---

## 1. Project Overview

Add an email detail page feature to the Inbox page using a split-pane layout. The left pane displays the email list (fixed width 350px), while the right pane shows the selected email's full content with header, body, and attachments sections.

**Key Design Decisions**:
- Split-pane layout using CSS Flexbox (left: 350px fixed, right: flex: 1)
- URL routing: `/inbox/:emailId` path parameter
- React Query cache-first strategy for data fetching
- Independent scroll for each pane

---

## 2. Phase Context

### Dependencies
- **None** - These are foundational components with no dependencies

### Risk Level
- **Low** - Simple presentational components

### What This Phase Enables
- Provides reusable components for Phase 4 (EmailDetailHeader)
- Ensures consistent sender visualization across the application

---

## 3. Task Description

**Action**: Create two utility components: `Avatar` and `ClassificationBadge`.

**Why**: Reusable components for consistent UI across email cards and detail view.

---

## 4. Implementation Details

### 4.1 Avatar Component

**File**: `/packages/frontend/src/features/inbox/EmailDetail/Avatar.tsx`

**Design**:
- Display first letter of sender name (uppercase)
- Background color: hash sender string to one of 8 preset colors
- Size variants: 'sm' (32px), 'md' (40px), 'lg' (48px)

```typescript
import { cn } from '@/lib/utils'

const COLORS = [
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500',
  'bg-lime-500', 'bg-green-500', 'bg-teal-500', 'bg-cyan-500'
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

interface AvatarProps {
  name: string | null
  size?: 'sm' | 'md' | 'lg'
}

export function Avatar({ name, size = 'md' }: AvatarProps) {
  const initial = (name?.[0] || '?').toUpperCase()
  const colorIndex = name ? hashString(name) % COLORS.length : 0

  const sizeClasses = {
    sm: 'h-8 w-8 text-sm',
    md: 'h-10 w-10 text-base',
    lg: 'h-12 w-12 text-lg'
  }

  return (
    <div className={cn(
      'rounded-full flex items-center justify-center text-white font-medium',
      sizeClasses[size],
      COLORS[colorIndex]
    )}>
      {initial}
    </div>
  )
}
```

### 4.2 ClassificationBadge Component

**File**: `/packages/frontend/src/features/inbox/EmailDetail/ClassificationBadge.tsx`

**Design**: Light background colors as specified:

| Classification | Background | Text Color |
|----------------|------------|------------|
| IMPORTANT | `bg-red-100` | `text-red-700` |
| NEWSLETTER | `bg-blue-100` | `text-blue-700` |
| SPAM | `bg-gray-100` | `text-gray-600` |

```typescript
import { cn } from '@/lib/utils'
import type { EmailClassification } from '@nanomail/shared'

interface ClassificationBadgeProps {
  classification: EmailClassification
  className?: string
}

const STYLES: Record<EmailClassification, string> = {
  IMPORTANT: 'bg-red-100 text-red-700',
  NEWSLETTER: 'bg-blue-100 text-blue-700',
  SPAM: 'bg-gray-100 text-gray-600',
}

const LABELS: Record<EmailClassification, string> = {
  IMPORTANT: 'Important',
  NEWSLETTER: 'Newsletter',
  SPAM: 'Spam',
}

export function ClassificationBadge({ classification, className }: ClassificationBadgeProps) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded-full text-xs font-medium',
      STYLES[classification],
      className
    )}>
      {LABELS[classification]}
    </span>
  )
}
```

---

## 5. Integration Notes

### EmailClassification Type

Import the classification type from shared:

```typescript
import type { EmailClassification } from '@nanomail/shared'
```

### Reference Existing Component

For styling consistency, reference:
- `/packages/frontend/src/components/ClassificationTag.tsx`

### Utility Function

Ensure `cn()` utility exists:
- `/packages/frontend/src/lib/utils.ts`

---

## 6. Acceptance Criteria

### Avatar
- [ ] Displays first letter of sender name (uppercase)
- [ ] Shows '?' when name is null
- [ ] Background color is consistent for same name
- [ ] Supports three size variants (sm, md, lg)

### ClassificationBadge
- [ ] Displays correct label for each classification type
- [ ] Uses correct color scheme for each type
- [ ] Accepts optional className prop for customization

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### Avatar
- First letter extraction works correctly
- Color hash is consistent for same input
- '?' displayed when name is null
- Size variants apply correct classes

### ClassificationBadge
- All classification types render correct labels
- All classification types have correct colors
- Custom className is applied

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 3**: State Components (Empty, Skeleton, Error)