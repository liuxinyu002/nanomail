# Implementation Plan: Email Detail Page

> **Status**: Ready for Implementation
> **Created**: 2026-03-15
> **Related Discussion**: Inbox Page Email Detail View with Split-Pane Layout

---

## 1. Overview

Add an email detail page feature to the Inbox page using a split-pane layout. The left pane displays the email list (fixed width 350px), while the right pane shows the selected email's full content with header, body, and attachments sections.

**Key Design Decisions**:
- Split-pane layout using CSS Flexbox (left: 350px fixed, right: flex: 1)
- URL routing: `/inbox/:emailId` path parameter
- React Query cache-first strategy for data fetching
- Independent scroll for each pane

---

## 2. Requirements

### Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1 | Click email card to navigate to `/inbox/:emailId` and show detail | High |
| FR-2 | Checkbox click only toggles selection, does not trigger detail view | High |
| FR-3 | Display email header (subject, badge, sender avatar, date, attachments icon) | High |
| FR-4 | Display email body text with proper formatting | High |
| FR-5 | Display attachments placeholder section | Medium |
| FR-6 | Show empty state when no email selected | High |
| FR-7 | Show skeleton loading state | High |
| FR-8 | Show error state with retry option | High |
| FR-9 | Active email card visual highlighting | Medium |

### Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Left and right panes scroll independently |
| NFR-2 | Active state and Checked state can coexist on same email |
| NFR-3 | Avatar background color derived from sender name hash |
| NFR-4 | Date display uses smart formatting based on recency |

---

## 3. Architecture Changes

### 3.1 File Structure

```
packages/frontend/src/
├── pages/
│   └── InboxPage.tsx           # Modified: split-pane layout (page-level container)
├── features/inbox/
│   ├── EmailCard.tsx           # Modified: add Active state, click handler
│   └── EmailDetail/            # New directory
│       ├── index.ts            # Export entry point
│       ├── EmailDetailPanel.tsx   # Main panel component
│       ├── EmailDetailHeader.tsx  # Header section
│       ├── EmailDetailBody.tsx    # Body section
│       ├── EmailDetailAttachments.tsx  # Attachments section
│       ├── EmailDetailSkeleton.tsx     # Skeleton loading state
│       ├── EmailDetailEmpty.tsx        # Empty state
│       ├── EmailDetailError.tsx        # Error state
│       ├── Avatar.tsx             # Avatar with first letter + hash color
│       ├── ClassificationBadge.tsx # AI classification badge
│       └── useEmailDetail.ts      # React Query hook
```

### 3.2 Route Configuration

```typescript
// packages/frontend/src/App.tsx
// Keep single route, use useParams in InboxPage
<Route path="inbox" element={<InboxPage />} />
<Route path="inbox/:emailId" element={<InboxPage />} />
```

### 3.3 Component Hierarchy

```
InboxPage
├── (Header: Title + Sync Button + Classification Filter)
├── div.flex (split pane container)
│   ├── div.left-pane (width: 350px, border-right, overflow-y-auto)
│   │   └── EmailCard[] (with activeId prop)
│   └── div.right-pane (flex: 1, overflow-y-auto)
│       └── EmailDetailPanel
│           ├── EmailDetailHeader
│           │   ├── Subject
│           │   ├── ClassificationBadge
│           │   ├── Avatar + Sender
│           │   ├── Date
│           │   └── AttachmentsIcon
│           ├── hr (divider)
│           ├── EmailDetailBody
│           └── EmailDetailAttachments
```

---

## 4. Implementation Steps

### Phase 1: React Query Hook for Email Detail

**File**: `/packages/frontend/src/features/inbox/EmailDetail/useEmailDetail.ts`

**Action**: Create a React Query hook for fetching single email detail.

**Why**: Centralized data fetching logic with caching support.

**Dependencies**: None

**Risk**: Low

```typescript
import { useQuery } from '@tanstack/react-query'
import { EmailService } from '@/services'

export function useEmailDetail(emailId: number | null) {
  return useQuery({
    queryKey: ['email', emailId],
    queryFn: () => EmailService.getEmail(emailId!),
    enabled: emailId !== null,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

---

### Phase 2: Utility Components (2 files)

#### 2.1 Avatar Component

**File**: `/packages/frontend/src/features/inbox/EmailDetail/Avatar.tsx`

**Action**: Create avatar component with first letter and hash-based background color.

**Why**: Consistent sender visualization across email cards and detail view.

**Dependencies**: None

**Risk**: Low

**Design**:
- Display first letter of sender name (uppercase)
- Background color: hash sender string to one of 8 preset colors
- Size variants: 'sm' (32px), 'md' (40px), 'lg' (48px)

```typescript
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

#### 2.2 ClassificationBadge Component

**File**: `/packages/frontend/src/features/inbox/EmailDetail/ClassificationBadge.tsx`

**Action**: Create badge component for email classification display.

**Why**: Reuse existing ClassificationTag patterns with detail-view-specific styling.

**Dependencies**: None

**Risk**: Low

**Design**: Light background colors as specified:
- IMPORTANT: Red/orange light background (`bg-red-100 text-red-700`)
- NEWSLETTER: Blue light background (`bg-blue-100 text-blue-700`)
- SPAM: Gray light background (`bg-gray-100 text-gray-600`)

---

### Phase 3: State Components (3 files)

#### 3.1 Empty State

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailEmpty.tsx`

**Action**: Create empty state component.

**Dependencies**: None

**Risk**: Low

**Design**:
- Centered layout
- Envelope icon (48px, `text-gray-300`)
- Default text: "Select an email from the list" (`text-gray-400`)
- Optional `message` prop for custom text (e.g., 404 case)

**Props**:
```typescript
interface EmailDetailEmptyProps {
  message?: string  // Optional custom message
}
```

#### 3.2 Skeleton Loading State

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailSkeleton.tsx`

**Action**: Create skeleton component matching real layout structure.

**Dependencies**: None

**Risk**: Low

**Design**:
- Title skeleton (w-3/4 h-8)
- Avatar skeleton (h-10 w-10 rounded-full)
- Sender skeleton (w-32 h-4)
- Date skeleton (w-20 h-4)
- Body skeleton lines (3-4 lines with varying widths)
- Pulse animation

#### 3.3 Error State

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailError.tsx`

**Action**: Create error state component with retry button.

**Dependencies**: None

**Risk**: Low

**Design**:
- Centered layout
- Alert triangle icon (low saturation)
- Text: "Failed to load email" (`text-gray-500`)
- Ghost button: "Retry"

---

### Phase 4: Detail Section Components (3 files)

#### 4.1 EmailDetailHeader

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailHeader.tsx`

**Action**: Create header section component.

**Dependencies**: Phase 2 (Avatar, ClassificationBadge)

**Risk**: Low

**Layout**:
```
[Subject - Large Bold] [ClassificationBadge]                    [Close (X)]
[Avatar] [Sender Name]                    [Date] [Attachment Icon]
────────────────────────────────────────────────────────────────
```

**Props**:
```typescript
interface EmailDetailHeaderProps {
  email: Email
  onClose?: () => void  // Optional: close detail panel
}
```

**Close Button** (top-right corner):
```tsx
// In EmailDetailHeader.tsx
import { X } from 'lucide-react'  // Don't forget to import!

<button
  onClick={onClose}
  className="p-2 rounded-md hover:bg-gray-100 transition-colors"
  aria-label="Close email detail"
>
  <X className="h-5 w-5 text-gray-500" />
</button>
```

> **UX Note**: The close button allows users to dismiss the email detail view
> and return to `/inbox` without using browser back button. This is especially
> important for keyboard and mobile users.

**Smart Date Formatting** (requires `date-fns` already installed):
```typescript
import { format, isSameDay, subDays, isThisYear } from 'date-fns'

function formatSmartDate(date: Date): string {
  const now = new Date()

  // Today: show specific time (isSameDay ignores time internally)
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
```

> **Note**: `isSameDay` internally compares only year/month/day, so `startOfDay()` is not needed.
> This simplifies the code and reduces unnecessary computation.
```

#### 4.2 EmailDetailBody

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailBody.tsx`

**Action**: Create body section component.

**Dependencies**: None

**Risk**: Low

**Design**:
- Pure text rendering (no HTML parsing)
- CSS: `white-space: pre-wrap` preserves line breaks
- Font: sans-serif, color `#374151`, line-height `1.6`
- Padding: `24px`
- Container: `overflow-y-auto` for long content

#### 4.3 EmailDetailAttachments

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailAttachments.tsx`

**Action**: Create attachments placeholder section.

**Dependencies**: None

**Risk**: Low

**Design**:
- Only render if `hasAttachments` is true
- Gray placeholder rows (future: real attachment list)
- Paperclip icon + "Attachments" label

---

### Phase 5: Main Panel Component

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailPanel.tsx`

**Action**: Create main panel that orchestrates all detail components.

**Dependencies**: Phase 1-4

**Risk**: Low

**Logic**:
```typescript
interface EmailDetailPanelProps {
  emailId: number | null
  onClose?: () => void  // Close detail panel callback
}

export function EmailDetailPanel({ emailId, onClose }: EmailDetailPanelProps) {
  const { data: email, isLoading, isError, error, refetch } = useEmailDetail(emailId)

  if (emailId === null) {
    return <EmailDetailEmpty />
  }

  if (isLoading) {
    return <EmailDetailSkeleton />
  }

  if (isError) {
    // Handle 404 specifically - email may have been deleted on another device
    if (error?.response?.status === 404) {
      return <EmailDetailEmpty message="The requested email does not exist or has been deleted." />
    }
    return <EmailDetailError onRetry={() => refetch()} />
  }

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

---

### Phase 6: EmailCard Modification

**File**: `/packages/frontend/src/features/inbox/EmailCard.tsx`

**Action**: Add active state styling and click-to-view-detail behavior.

**Dependencies**: None

**Risk**: Medium (must not break existing selection functionality)

**Changes**:

1. **Add `activeId` prop**:
```typescript
export interface EmailCardProps {
  // ... existing props
  activeId?: number  // Currently viewed email ID
  onCardClick?: (id: number) => void  // Navigate to detail
}
```

2. **Update styling** (with proper state priority):
```typescript
// Active state: blue background + left border
// Selected state: primary color background + border
// Priority: selected background > active background (when not selected)
const isActive = email.id === activeId

className={cn(
  'p-4 rounded-lg transition-colors',
  canExpand && 'cursor-pointer hover:bg-muted',

  // Background color: selected takes priority over active
  selected ? 'bg-primary/10' : (isActive ? 'bg-blue-50' : 'bg-transparent'),

  // Border styling
  selected ? 'border border-primary' : 'border border-transparent',

  // Active state: always show left border indicator
  isActive && 'border-l-4 border-l-blue-600',

  isSpam && 'opacity-60'
)}
```

> **CSS Conflict Note**: When `selected` and `isActive` are both true:
> - Background: Uses `bg-primary/10` (selected priority)
> - Left border: Shows blue `border-l-blue-600` (active indicator)
> - This ensures visual hierarchy: selection is primary, active is secondary
```

3. **Click handler separation** (with a11y support):
```tsx
<div
  role="button"
  tabIndex={canExpand ? 0 : undefined}
  onKeyDown={(e) => {
    if (e.key === 'Enter' && canExpand) {
      onCardClick?.(email.id)
    }
  }}
  onClick={() => onCardClick?.(email.id)}
  className={cn(
    'flex items-start gap-3',
    canExpand && 'cursor-pointer hover:bg-muted'
  )}
>
  {/* Checkbox with higher z-index to prevent click-through */}
  <div className="relative z-10" onClick={(e) => e.stopPropagation()}>
    <Checkbox
      onCheckedChange={() => onSelect(email.id)}
      // ...
    />
  </div>
  {/* Rest of card content */}
</div>
```

> **a11y Note**: Using `role="button"` and `tabIndex={0}` makes the card keyboard-accessible.
> The `onKeyDown` handler allows keyboard users to activate the card with Enter key.
> The checkbox is wrapped in a `z-10` container with `stopPropagation` to isolate its click behavior.

4. **Remove or hide collapsible summary** when active (summary not shown in detail view)

---

### Phase 7: InboxPage Split-Pane Layout

**File**: `/packages/frontend/src/pages/InboxPage.tsx`

**Action**: Refactor to split-pane layout with routing support.

**Dependencies**: Phase 5, Phase 6

**Risk**: High (major refactor of existing page)

**Changes**:

1. **Add useParams for emailId** (with NaN protection):
```typescript
import { useParams, useNavigate } from 'react-router-dom'

const { emailId } = useParams<{ emailId: string }>()
const navigate = useNavigate()

// Parse with NaN protection to prevent invalid URL params
const parsedId = emailId ? parseInt(emailId, 10) : null
const activeId = !Number.isNaN(parsedId) ? parsedId : null
```

2. **Split-pane layout**:
```typescript
return (
  <div className="h-full flex flex-col">
    {/* Header */}
    <div className="p-6 pb-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inbox</h1>
        {/* ... filters and sync button */}
      </div>
    </div>

    {/* Split Pane */}
    <div className="flex-1 flex min-h-0">
      {/* Left Pane: Email List */}
      <div className="w-[350px] border-r border-gray-200 overflow-y-auto">
        <div className="p-4 space-y-2">
          {data.emails.map((email) => (
            <EmailCard
              key={email.id}
              email={email}
              selected={selectedIds.has(email.id)}
              onSelect={handleSelect}
              activeId={activeId}
              onCardClick={(id) => navigate(`/inbox/${id}`)}
              selectionDisabled={isSelectionDisabled(email.id)}
            />
          ))}
        </div>
      </div>

      {/* Right Pane: Email Detail */}
      {/* min-w-0 prevents flex-1 from being pushed by long unbreakable content (e.g., URLs, code) */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-white">
        <EmailDetailPanel
          emailId={activeId}
          onClose={() => navigate('/inbox')}
        />
      </div>
    </div>

    {/* Floating Action Button */}
    {/* ... */}
  </div>
)
```

---

### Phase 8: Route Configuration Update

**File**: `/packages/frontend/src/App.tsx`

**Action**: Add email detail route.

**Dependencies**: Phase 7

**Risk**: Low

**Changes**:
```typescript
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<Navigate to="/inbox" replace />} />
    <Route path="inbox" element={<InboxPage />} />
    <Route path="inbox/:emailId" element={<InboxPage />} />
    {/* ... other routes */}
  </Route>
</Routes>
```

---

### Phase 9: Export Index

**File**: `/packages/frontend/src/features/inbox/EmailDetail/index.ts`

**Action**: Create barrel export file.

**Dependencies**: All previous phases

**Risk**: Low

```typescript
export { EmailDetailPanel } from './EmailDetailPanel'
export { EmailDetailHeader } from './EmailDetailHeader'
export { EmailDetailBody } from './EmailDetailBody'
export { EmailDetailAttachments } from './EmailDetailAttachments'
export { EmailDetailSkeleton } from './EmailDetailSkeleton'
export { EmailDetailEmpty } from './EmailDetailEmpty'
export { EmailDetailError } from './EmailDetailError'
export { Avatar } from './Avatar'
export { ClassificationBadge } from './ClassificationBadge'
export { useEmailDetail } from './useEmailDetail'
```

---

### Phase 10: Tests (3 files)

#### 10.1 useEmailDetail Hook Test

**File**: `/packages/frontend/src/features/inbox/EmailDetail/useEmailDetail.test.ts`

**Test Cases**:
- Returns null when emailId is null
- Fetches email when emailId is provided
- Caches result and refetches on stale

#### 10.2 EmailDetailPanel Test

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailPanel.test.tsx`

**Test Cases**:
- Shows empty state when emailId is null
- Shows skeleton when loading
- Shows error state with retry on error
- Shows custom empty message on 404 error
- Renders all sections on success

#### 10.3 EmailCard Integration Test

**File**: `/packages/frontend/src/features/inbox/EmailCard.test.tsx`

**Test Cases**:
- Active state styling applied correctly
- Click card triggers onCardClick
- Click checkbox does NOT trigger onCardClick
- Active and selected states can coexist (correct styling priority)
- Keyboard navigation: Tab focuses card, Enter triggers onCardClick
- Invalid activeId (NaN) does not apply active styling

#### 10.4 URL Params Validation Test

**File**: `/packages/frontend/src/pages/InboxPage.test.tsx`

**Test Cases**:
- Valid emailId in URL: activeId is correctly parsed
- Invalid emailId (non-numeric): activeId is null, shows empty state
- Empty emailId: activeId is null
- Close button in detail view: navigates to `/inbox`

---

## 5. Dependencies Between Phases

```
Phase 1 (useEmailDetail) ──────────────────────────────────────┐
                                                                │
Phase 2.1 (Avatar) ────────────────────┐                        │
Phase 2.2 (ClassificationBadge) ───────┤                        │
                                       ▼                        │
Phase 3.1 (Empty) ─────────────────────┐                        │
Phase 3.2 (Skeleton) ──────────────────┤                        │
Phase 3.3 (Error) ─────────────────────┤                        │
                                       ▼                        │
Phase 4.1 (Header + Close Button) ◄────┤                        │
Phase 4.2 (Body) ──────────────────────┤                        │
Phase 4.3 (Attachments) ───────────────┤                        │
                                       ▼                        │
Phase 5 (Panel + onClose) ◄────────────┴────────────────────────┘
                                       │
Phase 6 (EmailCard + a11y) ────────────┤
                                       ▼
Phase 7 (InboxPage + NaN validation) ◄─┘
                                       │
Phase 8 (Routes) ◄─────────────────────┘
                                       │
Phase 9 (Index) ◄──────────────────────┤
                                       │
Phase 10 (Tests + URL validation) ◄────┘
```

---

## 6. Risk Assessment

| Risk | Level | Impact | Mitigation |
|------|-------|--------|------------|
| EmailCard click/checkbox conflict | Medium | User experience | Stop propagation on checkbox, separate handlers, z-index isolation |
| Active state CSS conflicts with selected | Low | Visual | Conditional styling with clear priority: selected > active |
| Route transition flicker | Low | UX | React Query cache-first strategy |
| Long email body performance | Low | Performance | Virtual scrolling not needed initially, monitor |
| Mobile layout not supported | Known | Scope | Document as future work |
| Missing bodyText field | Medium | Data integrity | Backend already returns bodyText, verify |
| Invalid URL params (NaN) | Medium | UX/Error | Validate parsed ID with `Number.isNaN()`, show empty state |
| Keyboard accessibility | Medium | a11y | Use `role="button"`, `tabIndex={0}`, and `onKeyDown` handler |

---

## 7. Testing Strategy

### Unit Tests

| Component | Test Focus |
|-----------|------------|
| useEmailDetail | Query enabled/disabled, caching, error handling |
| Avatar | First letter extraction, color hash consistency |
| ClassificationBadge | All classification types, correct colors |
| EmailDetailHeader | Smart date formatting, all fields rendered |
| EmailDetailBody | Line break preservation, scrolling |

### Integration Tests

| Scenario | Test Focus |
|----------|------------|
| InboxPage load | Split pane renders, list loads |
| Email selection | URL updates, detail loads |
| Checkbox vs card click | Selection and navigation independent |
| Error recovery | Retry refetches email |
| Invalid URL params | Non-numeric ID shows empty state |
| Close button | Clicking close navigates to /inbox |
| Keyboard navigation | Tab + Enter activates card |

### E2E Tests (Optional)

| Flow | Steps |
|------|-------|
| View email detail | Load inbox -> click email -> verify detail |
| Navigate between emails | Click email A -> click email B -> verify update |
| Back navigation | View detail -> navigate back -> verify list |

---

## 8. Work Estimate

| Phase | Content | Complexity | Time |
|-------|---------|------------|------|
| Phase 1 | useEmailDetail hook | Low | 0.5h |
| Phase 2 | Avatar + ClassificationBadge | Low | 0.5h |
| Phase 3 | Empty/Skeleton/Error states | Low | 0.5h |
| Phase 4 | Header (with close button) + Body + Attachments | Medium | 1.25h |
| Phase 5 | EmailDetailPanel (with onClose) | Low | 0.5h |
| Phase 6 | EmailCard modification (with a11y) | Medium | 1.25h |
| Phase 7 | InboxPage refactor (with NaN validation) | High | 1.5h |
| Phase 8 | Route configuration | Low | 0.25h |
| Phase 9 | Export index | Low | 0.1h |
| Phase 10 | Tests (including URL validation tests) | Medium | 2h |
| **Total** | | | **8.35h** |

---

## 9. Acceptance Criteria

### Backend (Already Complete)

- [x] GET /api/emails/:id returns email with bodyText field

### Frontend

- [ ] InboxPage displays split-pane layout (350px left, fluid right)
- [ ] Click email card navigates to `/inbox/:emailId`
- [ ] Checkbox click only toggles selection, does not navigate
- [ ] Active email card shows blue background + left border
- [ ] Active and selected states can coexist on same email (selected background priority)
- [ ] EmailDetailPanel shows empty state when no email selected
- [ ] EmailDetailPanel shows skeleton during loading
- [ ] EmailDetailPanel shows error state with retry on failure
- [ ] Header displays: subject (large), badge, avatar, sender, date, attachment icon
- [ ] Header has close button (X) to dismiss detail view
- [ ] Date uses smart formatting (today/yesterday/this year/cross-year)
- [ ] Body displays text with preserved line breaks
- [ ] Attachments section shows when hasAttachments is true
- [ ] Both panes scroll independently
- [ ] Invalid URL params (e.g., `/inbox/invalid-id`) gracefully show empty state
- [ ] EmailCard is keyboard accessible (Tab + Enter to select)

### Tests

- [ ] All unit tests pass
- [ ] Integration tests cover core flows
- [ ] 80%+ coverage on new components

---

## 10. Future Work (Out of Scope)

1. **Mobile responsive layout**: Stack layout or drawer-based detail view
2. **Action buttons**: Reply, Forward, Delete
3. **HTML email rendering**: Sanitized HTML body display
4. **Attachment list**: Real attachment download functionality
5. **Email threading**: Conversation view

---

## 11. Key Files Reference

| File | Description |
|------|-------------|
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/pages/InboxPage.tsx` | Inbox page container, will be refactored with split-pane layout |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/features/inbox/EmailCard.tsx` | Email card component, will be modified for active state and a11y |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/services/email.service.ts` | Email service, already has getEmail method |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/backend/src/routes/email.routes.ts` | Backend routes, GET /:id already exists |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/shared/src/schemas/email.ts` | Email type definitions |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/App.tsx` | Route configuration |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/components/ClassificationTag.tsx` | Reference for badge styling |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/components/ui/button.tsx` | Button component for close button |
| `/Volumes/xiaoyu_pan/MyApp/NanoMail/packages/frontend/src/components/ui/checkbox.tsx` | Checkbox component for selection |