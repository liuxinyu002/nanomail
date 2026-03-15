# Plan 7 - Phase 5: Main Panel Component

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 5 of 10
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
- **Phase 1** - `useEmailDetail` hook
- **Phase 3** - `EmailDetailEmpty`, `EmailDetailSkeleton`, `EmailDetailError`
- **Phase 4** - `EmailDetailHeader`, `EmailDetailBody`, `EmailDetailAttachments`

### Risk Level
- **Low** - Orchestration component with clear state handling

### What This Phase Enables
- Provides the complete detail panel for Phase 7 (InboxPage integration)

---

## 3. Task Description

**Action**: Create main panel that orchestrates all detail components.

**Why**: Single entry point for email detail rendering with proper state management.

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailPanel.tsx`

---

## 4. Implementation Details

### 4.1 Component Structure

```typescript
import { useEmailDetail } from './useEmailDetail'
import { EmailDetailHeader } from './EmailDetailHeader'
import { EmailDetailBody } from './EmailDetailBody'
import { EmailDetailAttachments } from './EmailDetailAttachments'
import { EmailDetailSkeleton } from './EmailDetailSkeleton'
import { EmailDetailEmpty } from './EmailDetailEmpty'
import { EmailDetailError } from './EmailDetailError'

interface EmailDetailPanelProps {
  emailId: number | null
  onClose?: () => void
}

export function EmailDetailPanel({ emailId, onClose }: EmailDetailPanelProps) {
  const { data: email, isLoading, isError, error, refetch } = useEmailDetail(emailId)

  // No email selected - show empty state
  if (emailId === null) {
    return <EmailDetailEmpty />
  }

  // Loading state
  if (isLoading) {
    return <EmailDetailSkeleton />
  }

  // Error handling with 404 special case
  if (isError) {
    // Handle 404 specifically - email may have been deleted on another device
    if (error?.response?.status === 404) {
      return <EmailDetailEmpty message="The requested email does not exist or has been deleted." />
    }
    return <EmailDetailError onRetry={() => refetch()} />
  }

  // Success - render email detail
  return (
    <div className="h-full flex flex-col">
      <EmailDetailHeader email={email} onClose={onClose} />
      <hr className="border-gray-200" />
      <EmailDetailBody bodyText={email.bodyText} />
      {email.hasAttachments && <EmailDetailAttachments />}
    </div>
  )
}
```

### 4.2 State Machine

```
┌─────────────────┐
│ emailId === null │──► EmailDetailEmpty
└────────┬────────┘
         │ emailId !== null
         ▼
┌─────────────────┐
│    isLoading    │──► EmailDetailSkeleton
└────────┬────────┘
         │ !isLoading
         ▼
┌─────────────────┐
│    isError      │──► 404? EmailDetailEmpty (custom msg)
└────────┬────────┘       : EmailDetailError
         │ !isError
         ▼
┌─────────────────┐
│    Success      │──► EmailDetailHeader + Body + Attachments
└─────────────────┘
```

### 4.3 404 Error Handling

The special 404 handling accounts for edge cases:
- Email deleted on another device
- URL manipulation with non-existent ID
- Race condition during sync

---

## 5. Integration Notes

### Props Interface

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `emailId` | `number \| null` | Yes | The email ID to fetch, or null for empty state |
| `onClose` | `() => void` | No | Callback to close the detail panel |

### Layout Structure

```
EmailDetailPanel
├── EmailDetailHeader
│   ├── Subject + ClassificationBadge
│   └── Avatar + Sender + Date + AttachmentsIcon
├── hr (divider)
├── EmailDetailBody (flex-1)
└── EmailDetailAttachments (conditional)
```

---

## 6. Acceptance Criteria

- [ ] Shows `EmailDetailEmpty` when `emailId` is `null`
- [ ] Shows `EmailDetailSkeleton` during loading
- [ ] Shows `EmailDetailError` with retry on general error
- [ ] Shows custom empty message on 404 error
- [ ] Renders all sections on successful fetch
- [ ] `onClose` prop is passed to `EmailDetailHeader`
- [ ] Attachments section renders conditionally based on `hasAttachments`
- [ ] Full height layout with proper flex structure

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### EmailDetailPanel
- Shows empty state when emailId is null
- Shows skeleton when loading
- Shows error state with retry on error
- Shows custom empty message on 404 error
- Renders all sections on success
- onClose callback is passed to header
- Attachments conditionally rendered

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 6**: EmailCard Modification (Active state + a11y)

### What Phase 6 Needs
- Understanding of `activeId` prop concept
- Knowledge of `onCardClick` callback pattern