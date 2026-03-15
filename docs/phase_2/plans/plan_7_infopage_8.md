# Plan 7 - Phase 8: Route Configuration Update

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 8 of 10
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
- **Phase 7** - InboxPage with split-pane layout and URL parameter handling

### Risk Level
- **Low** - Simple route configuration update

### What This Phase Enables
- Enables URL-based email navigation
- Allows deep linking to specific emails
- Browser history navigation support

---

## 3. Task Description

**Action**: Add email detail route to `App.tsx`.

**Why**: Support both `/inbox` (list only) and `/inbox/:emailId` (list + detail) URLs.

**File**: `/packages/frontend/src/App.tsx`

---

## 4. Implementation Details

### 4.1 Route Configuration

```typescript
import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from '@/layouts/MainLayout'
import { InboxPage } from '@/pages/InboxPage'
// ... other imports

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Navigate to="/inbox" replace />} />
        <Route path="inbox" element={<InboxPage />} />
        <Route path="inbox/:emailId" element={<InboxPage />} />
        {/* ... other routes */}
      </Route>
    </Routes>
  )
}
```

### 4.2 Route Behavior

| URL | Behavior |
|-----|----------|
| `/` | Redirects to `/inbox` |
| `/inbox` | Shows email list with empty detail panel |
| `/inbox/123` | Shows email list with email #123 in detail panel |
| `/inbox/invalid` | Shows email list with empty state (NaN handling) |

### 4.3 Design Decision: Single Component

Both routes use the same `InboxPage` component because:
1. The component handles both cases internally with `useParams`
2. Avoids code duplication
3. Maintains list state when navigating between emails

---

## 5. Integration Notes

### React Router Version

Using `react-router-dom` v6:
- `Routes` replaces `Switch`
- `element` prop replaces `component` and `render`
- Nested routes with `Route` inside `Route`

### Path Matching

- `path="inbox"` matches exactly `/inbox`
- `path="inbox/:emailId"` matches `/inbox/123`, `/inbox/abc`, etc.
- The `:emailId` parameter is accessed via `useParams()`

### Alternative Pattern (Not Recommended)

You could use a single route with optional parameter:
```typescript
// NOT recommended for this case
<Route path="inbox/:emailId?" element={<InboxPage />} />
```

**Why not**: Explicit routes make the URL structure clearer and allow for different metadata (like page titles) in the future.

---

## 6. Acceptance Criteria

- [ ] Both `/inbox` and `/inbox/:emailId` routes are defined
- [ ] Root path redirects to `/inbox`
- [ ] Navigation to `/inbox` shows list with empty detail
- [ ] Navigation to `/inbox/:emailId` shows list with email detail
- [ ] Invalid emailId in URL is handled gracefully

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### Route Configuration
- `/inbox` route renders InboxPage
- `/inbox/:emailId` route renders InboxPage
- Root `/` redirects to `/inbox`
- Route params are correctly passed to component

### Navigation
- Direct URL access works (deep linking)
- Browser back/forward buttons work correctly
- URL updates when clicking email cards

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 9**: Export Index

### What Phase 9 Needs
- All components from Phase 1-5 ready for export
- Create barrel export for clean imports