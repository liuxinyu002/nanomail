# Plan 7 - Phase 3: State Components

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 3 of 10
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
- **None** - These are foundational state components with no dependencies

### Risk Level
- **Low** - Simple presentational components

### What This Phase Enables
- Provides UI states for Phase 5 (EmailDetailPanel)
- Ensures consistent user feedback for loading, empty, and error states

---

## 3. Task Description

**Action**: Create three state components: `EmailDetailEmpty`, `EmailDetailSkeleton`, and `EmailDetailError`.

**Why**: Consistent UX for different data states in the detail panel.

---

## 4. Implementation Details

### 4.1 Empty State

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailEmpty.tsx`

**Design**:
- Centered layout
- Envelope icon (48px, `text-gray-300`)
- Default text: "Select an email from the list" (`text-gray-400`)
- Optional `message` prop for custom text (e.g., 404 case)

```typescript
import { Mail } from 'lucide-react'

interface EmailDetailEmptyProps {
  message?: string
}

export function EmailDetailEmpty({ message }: EmailDetailEmptyProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <Mail className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-gray-400">
        {message || 'Select an email from the list'}
      </p>
    </div>
  )
}
```

### 4.2 Skeleton Loading State

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailSkeleton.tsx`

**Design**:
- Title skeleton (w-3/4 h-8)
- Avatar skeleton (h-10 w-10 rounded-full)
- Sender skeleton (w-32 h-4)
- Date skeleton (w-20 h-4)
- Body skeleton lines (3-4 lines with varying widths)
- Pulse animation

```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function EmailDetailSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Subject */}
        <Skeleton className="h-8 w-3/4" />

        {/* Sender info row */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-200" />

      {/* Body Section */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    </div>
  )
}
```

### 4.3 Error State

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailError.tsx`

**Design**:
- Centered layout
- Alert triangle icon (low saturation)
- Text: "Failed to load email" (`text-gray-500`)
- Ghost button: "Retry"

```typescript
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailDetailErrorProps {
  onRetry: () => void
}

export function EmailDetailError({ onRetry }: EmailDetailErrorProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-gray-500 mb-4">Failed to load email</p>
      <Button variant="ghost" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}
```

---

## 5. Integration Notes

### Required UI Components

Ensure these components exist:
- `/packages/frontend/src/components/ui/skeleton.tsx`
- `/packages/frontend/src/components/ui/button.tsx`

### Icons

Using `lucide-react` icons:
- `Mail` - for empty state
- `AlertTriangle` - for error state

---

## 6. Acceptance Criteria

### EmailDetailEmpty
- [ ] Centered layout with icon and text
- [ ] Shows default message when no message prop
- [ ] Shows custom message when message prop provided
- [ ] Proper spacing and colors

### EmailDetailSkeleton
- [ ] Matches real layout structure (header + body)
- [ ] Pulse animation on skeletons
- [ ] Proper spacing and sizing
- [ ] Avatar skeleton is circular

### EmailDetailError
- [ ] Centered layout with icon, text, and button
- [ ] Retry button triggers onRetry callback
- [ ] Proper styling with low-saturation icon

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### EmailDetailEmpty
- Renders default message
- Renders custom message
- Centered layout

### EmailDetailSkeleton
- Renders all skeleton elements
- Avatar skeleton is circular

### EmailDetailError
- Renders error message and retry button
- Retry button triggers callback

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 4**: Detail Section Components (Header, Body, Attachments)

### Dependencies for Phase 4
- Avatar component from Phase 2
- ClassificationBadge component from Phase 2