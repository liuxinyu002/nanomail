# Plan 7 - Phase 7: InboxPage Split-Pane Layout

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 7 of 10
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
- **Phase 5** - `EmailDetailPanel` component
- **Phase 6** - `EmailCard` with `activeId` and `onCardClick` props

### Risk Level
- **High** - Major refactor of existing page

### What This Phase Enables
- Complete split-pane UI implementation
- URL-based email selection
- Integration of all previous phases

---

## 3. Task Description

**Action**: Refactor `InboxPage` to split-pane layout with routing support.

**Why**: Enable email detail view alongside the email list.

**File**: `/packages/frontend/src/pages/InboxPage.tsx`

---

## 4. Implementation Details

### 4.1 URL Parameter Parsing

```typescript
import { useParams, useNavigate } from 'react-router-dom'

const { emailId } = useParams<{ emailId: string }>()
const navigate = useNavigate()

// Parse with NaN protection to prevent invalid URL params
const parsedId = emailId ? parseInt(emailId, 10) : null
const activeId = !Number.isNaN(parsedId) ? parsedId : null
```

**NaN Protection**:
- URL like `/inbox/invalid-id` would result in `NaN`
- Check with `Number.isNaN()` to show empty state instead of error

### 4.2 Split-Pane Layout

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
      {/* min-w-0 prevents flex-1 from being pushed by long unbreakable content */}
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

### 4.3 Layout Structure Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│ Header: Title + Sync Button + Classification Filter              │
├────────────────────┬─────────────────────────────────────────────┤
│                    │                                             │
│  Email List        │  Email Detail Panel                         │
│  (350px fixed)     │  (flex: 1)                                  │
│                    │                                             │
│  ┌──────────────┐  │  ┌───────────────────────────────────────┐  │
│  │ EmailCard    │  │  │ Header (Subject, Badge, Avatar, etc.) │  │
│  │ (active)     │  │  ├───────────────────────────────────────┤  │
│  └──────────────┘  │  │                                       │  │
│                    │  │ Body (scrollable)                     │  │
│  ┌──────────────┐  │  │                                       │  │
│  │ EmailCard    │  │  ├───────────────────────────────────────┤  │
│  └──────────────┘  │  │ Attachments (optional)                │  │
│                    │  └───────────────────────────────────────┘  │
│  (scrollable)      │  (scrollable)                              │
│                    │                                             │
└────────────────────┴─────────────────────────────────────────────┘
```

### 4.4 Key CSS Properties

| Property | Purpose |
|----------|---------|
| `h-full flex flex-col` | Full height container |
| `flex-1 flex min-h-0` | Split pane container with flex |
| `min-h-0` | Prevents flex overflow issues |
| `w-[350px]` | Fixed width for left pane |
| `flex-1 min-w-0` | Flexible right pane |
| `overflow-y-auto` | Independent scrolling |
| `min-w-0` | Prevents content from pushing layout |

---

## 5. Integration Notes

### Navigation Flow

```
User clicks email card
        │
        ▼
navigate(`/inbox/${emailId}`)
        │
        ▼
URL updates to /inbox/:emailId
        │
        ▼
useParams() gets emailId
        │
        ▼
activeId parsed (with NaN check)
        │
        ▼
EmailDetailPanel fetches email
        │
        ▼
Detail view shown
```

### Close Button Flow

```
User clicks close (X) in detail header
        │
        ▼
onClose() called
        │
        ▼
navigate('/inbox')
        │
        ▼
URL updates to /inbox
        │
        ▼
emailId becomes undefined
        │
        ▼
activeId becomes null
        │
        ▼
Empty state shown
```

---

## 6. Acceptance Criteria

### Layout
- [ ] InboxPage displays split-pane layout (350px left, fluid right)
- [ ] Both panes scroll independently
- [ ] Left pane has right border separator
- [ ] Right pane has white background

### Routing
- [ ] Click email card navigates to `/inbox/:emailId`
- [ ] URL param correctly parsed to `activeId`
- [ ] Invalid URL params (NaN) show empty state
- [ ] Close button navigates to `/inbox`

### EmailCard Integration
- [ ] `activeId` prop passed to EmailCard
- [ ] `onCardClick` callback navigates to detail
- [ ] Active email shows visual highlighting
- [ ] Selection functionality still works

### EmailDetailPanel Integration
- [ ] Panel renders in right pane
- [ ] `emailId` prop correctly passed
- [ ] `onClose` callback navigates back

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### URL Parameters
- Valid emailId in URL: activeId is correctly parsed
- Invalid emailId (non-numeric): activeId is null, shows empty state
- Empty emailId: activeId is null

### Navigation
- Click email card updates URL to `/inbox/:emailId`
- Close button navigates to `/inbox`
- Browser back button works correctly

### Layout
- Split pane renders correctly
- Both panes scroll independently
- Responsive considerations (future)

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 8**: Route Configuration Update

### What Phase 8 Needs
- Understanding of the route structure needed
- Verify both `/inbox` and `/inbox/:emailId` routes work