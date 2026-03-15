# Plan 7 - Phase 1: React Query Hook for Email Detail

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 1 of 10
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
- **None** - This is the first phase, no prior phase dependencies

### Risk Level
- **Low** - Simple hook creation with standard React Query patterns

### What This Phase Enables
- Provides data fetching foundation for all subsequent phases
- Enables email detail caching and stale-while-revalidate behavior

---

## 3. Task Description

**Action**: Create a React Query hook for fetching single email detail.

**Why**: Centralized data fetching logic with caching support.

**File**: `/packages/frontend/src/features/inbox/EmailDetail/useEmailDetail.ts`

---

## 4. Implementation Details

### 4.1 Hook Interface

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

### 4.2 Key Design Points

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| `enabled` condition | `emailId !== null` | Prevents unnecessary API calls when no email is selected |
| `staleTime` | 5 minutes | Balance between freshness and performance |
| `queryKey` | `['email', emailId]` | Unique key per email for proper caching |

### 4.3 Return Values

The hook returns standard React Query result:
- `data` - Email object when fetch succeeds
- `isLoading` - True during initial fetch
- `isError` - True if fetch failed
- `error` - Error object if fetch failed
- `refetch` - Function to manually refetch

---

## 5. Integration Notes

### EmailService Requirement

Ensure `EmailService.getEmail(id)` exists in `/packages/frontend/src/services/email.service.ts`:

```typescript
// Expected method signature
async getEmail(id: number): Promise<Email>
```

### Email Type

The `Email` type should be imported from `@nanomail/shared`:

```typescript
import type { Email } from '@nanomail/shared'
```

---

## 6. Acceptance Criteria

- [ ] Hook file created at correct path
- [ ] Hook accepts `number | null` as parameter
- [ ] Hook returns React Query result object
- [ ] Query is disabled when `emailId` is `null`
- [ ] Stale time is set to 5 minutes
- [ ] Query key includes `emailId` for cache isolation

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):
- Returns correct query result when emailId is valid
- Query is disabled when emailId is null
- Caches result and refetches on stale
- Handles error responses correctly

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 2**: Utility Components (Avatar, ClassificationBadge)