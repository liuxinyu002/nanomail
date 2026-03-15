# Plan 7 - Phase 4: Detail Section Components

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 4 of 10
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
- **Phase 2** - Requires `Avatar` and `ClassificationBadge` components

### Risk Level
- **Low** - Straightforward presentational components

### What This Phase Enables
- Provides the actual content display components for Phase 5 (EmailDetailPanel)

---

## 3. Task Description

**Action**: Create three detail section components: `EmailDetailHeader`, `EmailDetailBody`, and `EmailDetailAttachments`.

**Why**: Separate concerns for header, body, and attachments sections.

---

## 4. Implementation Details

### 4.1 EmailDetailHeader

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailHeader.tsx`

**Layout**:
```
[Subject - Large Bold] [ClassificationBadge]                    [Close (X)]
[Avatar] [Sender Name]                    [Date] [Attachment Icon]
────────────────────────────────────────────────────────────────
```

```typescript
import { X, Paperclip } from 'lucide-react'
import { format, isSameDay, subDays, isThisYear } from 'date-fns'
import type { Email } from '@nanomail/shared'
import { Avatar } from './Avatar'
import { ClassificationBadge } from './ClassificationBadge'

interface EmailDetailHeaderProps {
  email: Email
  onClose?: () => void
}

function formatSmartDate(date: Date): string {
  const now = new Date()

  // Today: show specific time
  if (isSameDay(date, now)) {
    return format(date, 'HH:mm')
  }

  // Yesterday
  if (isSameDay(date, subDays(now, 1))) {
    return `Yesterday ${format(date, 'HH:mm')}`
  }

  // This year: "Mar 15"
  if (isThisYear(date)) {
    return format(date, 'MMM d')
  }

  // Cross-year: "Nov 2, 2023"
  return format(date, 'MMM d, yyyy')
}

export function EmailDetailHeader({ email, onClose }: EmailDetailHeaderProps) {
  return (
    <div className="p-6">
      {/* Top row: Subject + Badge + Close button */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 truncate">
            {email.subject || '(No Subject)'}
          </h1>
          {email.classification && (
            <ClassificationBadge classification={email.classification} />
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close email detail"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        )}
      </div>

      {/* Bottom row: Avatar + Sender + Date + Attachment icon */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar name={email.senderName} size="md" />
          <div>
            <p className="font-medium text-gray-900">
              {email.senderName || email.senderEmail}
            </p>
            <p className="text-sm text-gray-500">{email.senderEmail}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-500">
          <span className="text-sm">
            {formatSmartDate(new Date(email.receivedAt))}
          </span>
          {email.hasAttachments && (
            <Paperclip className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  )
}
```

### 4.2 EmailDetailBody

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailBody.tsx`

**Design**:
- Pure text rendering (no HTML parsing)
- CSS: `white-space: pre-wrap` preserves line breaks
- Font: sans-serif, color `#374151`, line-height `1.6`
- Padding: `24px`
- Container: `overflow-y-auto` for long content

```typescript
interface EmailDetailBodyProps {
  bodyText: string
}

export function EmailDetailBody({ bodyText }: EmailDetailBodyProps) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div
        className="text-gray-700 leading-relaxed whitespace-pre-wrap"
        style={{ fontFamily: 'system-ui, sans-serif' }}
      >
        {bodyText || '(No content)'}
      </div>
    </div>
  )
}
```

### 4.3 EmailDetailAttachments

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailAttachments.tsx`

**Design**:
- Only render if `hasAttachments` is true
- Gray placeholder rows (future: real attachment list)
- Paperclip icon + "Attachments" label

```typescript
import { Paperclip } from 'lucide-react'

export function EmailDetailAttachments() {
  return (
    <div className="p-6 border-t border-gray-200">
      <div className="flex items-center gap-2 text-gray-600 mb-4">
        <Paperclip className="h-4 w-4" />
        <span className="font-medium">Attachments</span>
      </div>
      {/* Placeholder for future attachment list */}
      <div className="space-y-2">
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
        <div className="h-12 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  )
}
```

---

## 5. Integration Notes

### Required Dependencies

- `date-fns` - Already installed, for smart date formatting
- `lucide-react` - For icons (X, Paperclip)

### Email Type

Import from shared:
```typescript
import type { Email } from '@nanomail/shared'
```

### Smart Date Formatting Logic

| Condition | Format | Example |
|-----------|--------|---------|
| Today | `HH:mm` | "14:30" |
| Yesterday | `Yesterday HH:mm` | "Yesterday 09:15" |
| This year | `MMM d` | "Mar 15" |
| Cross-year | `MMM d, yyyy` | "Nov 2, 2023" |

> **Note**: `isSameDay` internally compares only year/month/day, so `startOfDay()` is not needed.

---

## 6. Acceptance Criteria

### EmailDetailHeader
- [ ] Subject displays correctly (with fallback for empty)
- [ ] ClassificationBadge shows when classification exists
- [ ] Avatar shows sender initial with hash color
- [ ] Sender name and email display correctly
- [ ] Date uses smart formatting
- [ ] Attachment icon shows when hasAttachments is true
- [ ] Close button triggers onClose callback
- [ ] Close button has proper aria-label

### EmailDetailBody
- [ ] Text renders with preserved line breaks
- [ ] Handles empty body with fallback
- [ ] Container scrolls for long content
- [ ] Proper text styling (color, line-height)

### EmailDetailAttachments
- [ ] Section renders placeholder content
- [ ] Paperclip icon and label present
- [ ] Proper styling and spacing

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### EmailDetailHeader
- Subject with fallback renders correctly
- ClassificationBadge conditionally renders
- Smart date formatting for all conditions
- Close button triggers callback
- All fields rendered from email object

### EmailDetailBody
- Line break preservation
- Empty body fallback
- Scrolling behavior for long content

### EmailDetailAttachments
- Renders when hasAttachments is true
- Proper layout and styling

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 5**: Main Panel Component (EmailDetailPanel)

### Dependencies for Phase 5
- useEmailDetail hook from Phase 1
- All state components from Phase 3
- All section components from Phase 4