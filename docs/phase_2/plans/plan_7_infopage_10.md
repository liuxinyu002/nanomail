# Plan 7 - Phase 10: Tests

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 10 of 10
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
- **All previous phases (1-9)** - All components must be implemented

### Risk Level
- **Medium** - Requires comprehensive test coverage

### What This Phase Enables
- Confidence in implementation correctness
- Regression prevention
- Documentation through tests

---

## 3. Task Description

**Action**: Create comprehensive tests for the Email Detail feature.

**Why**: Ensure reliability and prevent regressions.

---

## 4. Test Files Overview

| File | Description |
|------|-------------|
| `useEmailDetail.test.ts` | Hook unit tests |
| `EmailDetailPanel.test.tsx` | Panel component tests |
| `EmailCard.test.tsx` | Card integration tests |
| `InboxPage.test.tsx` | URL params validation tests |

---

## 5. Implementation Details

### 5.1 useEmailDetail Hook Test

**File**: `/packages/frontend/src/features/inbox/EmailDetail/useEmailDetail.test.ts`

**Test Cases**:
```typescript
describe('useEmailDetail', () => {
  it('returns null when emailId is null', () => {
    // Query should be disabled
  })

  it('fetches email when emailId is provided', () => {
    // Should call EmailService.getEmail
  })

  it('caches result and refetches on stale', () => {
    // Test staleTime behavior
  })

  it('handles error responses correctly', () => {
    // Test error handling
  })
})
```

### 5.2 EmailDetailPanel Test

**File**: `/packages/frontend/src/features/inbox/EmailDetail/EmailDetailPanel.test.tsx`

**Test Cases**:
```typescript
describe('EmailDetailPanel', () => {
  it('shows empty state when emailId is null', () => {
    // Render with emailId=null, expect EmailDetailEmpty
  })

  it('shows skeleton when loading', () => {
    // Mock loading state, expect EmailDetailSkeleton
  })

  it('shows error state with retry on error', () => {
    // Mock error state, expect EmailDetailError with retry
  })

  it('shows custom empty message on 404 error', () => {
    // Mock 404 error, expect custom message
  })

  it('renders all sections on success', () => {
    // Mock success, expect Header, Body, Attachments
  })
})
```

### 5.3 EmailCard Integration Test

**File**: `/packages/frontend/src/features/inbox/EmailCard.test.tsx`

**Test Cases**:
```typescript
describe('EmailCard', () => {
  describe('Active State Styling', () => {
    it('applies active styling when email.id === activeId', () => {
      // Expect blue background and left border
    })

    it('does not apply active styling when activeId is undefined', () => {
      // Expect default styling
    })

    it('does not apply active styling for invalid activeId (NaN)', () => {
      // Expect default styling
    })
  })

  describe('Active and Selected Coexistence', () => {
    it('shows selected background when both active and selected', () => {
      // bg-primary/10 takes priority
    })

    it('shows active left border when both active and selected', () => {
      // border-l-4 border-l-blue-600
    })
  })

  describe('Click Handling', () => {
    it('click card triggers onCardClick', () => {
      // Simulate card click
    })

    it('click checkbox does NOT trigger onCardClick', () => {
      // Simulate checkbox click, expect no navigation
    })
  })

  describe('Keyboard Navigation', () => {
    it('Tab focuses card when canExpand is true', () => {
      // Test tabIndex
    })

    it('Enter triggers onCardClick when card is focused', () => {
      // Simulate keydown
    })
  })
})
```

### 5.4 URL Params Validation Test

**File**: `/packages/frontend/src/pages/InboxPage.test.tsx`

**Test Cases**:
```typescript
describe('InboxPage URL Params', () => {
  it('valid emailId in URL: activeId is correctly parsed', () => {
    // Navigate to /inbox/123
    // Expect activeId === 123
  })

  it('invalid emailId (non-numeric): activeId is null, shows empty state', () => {
    // Navigate to /inbox/invalid
    // Expect activeId === null
    // Expect empty state shown
  })

  it('empty emailId: activeId is null', () => {
    // Navigate to /inbox
    // Expect activeId === null
  })

  it('close button in detail view: navigates to /inbox', () => {
    // Navigate to /inbox/123
    // Click close button
    // Expect URL to be /inbox
  })
})
```

---

## 6. Test Coverage Requirements

### Target: 80%+ Coverage

| Component | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| `useEmailDetail` | 90% | All query states |
| `Avatar` | 90% | Hash consistency, sizes |
| `ClassificationBadge` | 90% | All classification types |
| `EmailDetailEmpty` | 80% | Default and custom messages |
| `EmailDetailSkeleton` | 80% | All skeleton elements |
| `EmailDetailError` | 80% | Retry callback |
| `EmailDetailHeader` | 85% | Date formatting, all fields |
| `EmailDetailBody` | 80% | Text rendering, edge cases |
| `EmailDetailAttachments` | 80% | Conditional rendering |
| `EmailDetailPanel` | 90% | State transitions |
| `EmailCard` | 85% | Active state, click handling |
| `InboxPage` | 80% | URL params, layout |

---

## 7. Testing Utilities

### Mock Data

```typescript
// test-utils/mockEmail.ts
import type { Email } from '@nanomail/shared'

export const mockEmail: Email = {
  id: 1,
  subject: 'Test Subject',
  senderName: 'John Doe',
  senderEmail: 'john@example.com',
  receivedAt: new Date().toISOString(),
  bodyText: 'Test body content\nWith multiple lines.',
  classification: 'IMPORTANT',
  hasAttachments: true,
  isRead: false,
  // ... other fields
}
```

### Test Wrapper

```typescript
// test-utils/TestWrapper.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'

export function createTestWrapper(initialRoute = '/inbox') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  })

  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[initialRoute]}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}
```

---

## 8. Acceptance Criteria

### Test Files
- [ ] `useEmailDetail.test.ts` created with all test cases
- [ ] `EmailDetailPanel.test.tsx` created with all test cases
- [ ] `EmailCard.test.tsx` updated with new test cases
- [ ] `InboxPage.test.tsx` updated with URL params tests

### Coverage
- [ ] Overall coverage ≥ 80%
- [ ] All critical paths tested
- [ ] Edge cases covered (NaN, null, empty)
- [ ] Error states tested

### Test Quality
- [ ] Tests are readable and maintainable
- [ ] Mock data is consistent
- [ ] No flaky tests

---

## 9. Completion Checklist

After Phase 10, the entire Plan 7 implementation is complete. Verify:

### Functional Requirements
- [ ] Click email card navigates to `/inbox/:emailId`
- [ ] Checkbox click only toggles selection
- [ ] Active email shows blue background + left border
- [ ] Active and selected states can coexist
- [ ] Empty state shown when no email selected
- [ ] Skeleton shown during loading
- [ ] Error state with retry on failure
- [ ] Header displays all required fields
- [ ] Date uses smart formatting
- [ ] Body preserves line breaks
- [ ] Attachments section conditional
- [ ] Both panes scroll independently
- [ ] Invalid URL params handled gracefully
- [ ] Keyboard accessible (Tab + Enter)

### Non-Functional Requirements
- [ ] Left and right panes scroll independently
- [ ] Avatar background color derived from sender name hash
- [ ] Date display uses smart formatting

### Tests
- [ ] All unit tests pass
- [ ] Integration tests cover core flows
- [ ] 80%+ coverage achieved