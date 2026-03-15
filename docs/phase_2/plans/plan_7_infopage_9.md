# Plan 7 - Phase 9: Export Index

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 9 of 10
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
- **All previous phases (1-8)** - All components must be created

### Risk Level
- **Low** - Simple barrel export file

### What This Phase Enables
- Clean imports from feature directory
- Better code organization
- Easier refactoring in the future

---

## 3. Task Description

**Action**: Create barrel export file for the EmailDetail feature.

**Why**: Provide clean import paths and encapsulate feature exports.

**File**: `/packages/frontend/src/features/inbox/EmailDetail/index.ts`

---

## 4. Implementation Details

### 4.1 Barrel Export File

```typescript
// Main panel component
export { EmailDetailPanel } from './EmailDetailPanel'

// Section components
export { EmailDetailHeader } from './EmailDetailHeader'
export { EmailDetailBody } from './EmailDetailBody'
export { EmailDetailAttachments } from './EmailDetailAttachments'

// State components
export { EmailDetailSkeleton } from './EmailDetailSkeleton'
export { EmailDetailEmpty } from './EmailDetailEmpty'
export { EmailDetailError } from './EmailDetailError'

// Utility components
export { Avatar } from './Avatar'
export { ClassificationBadge } from './ClassificationBadge'

// Hooks
export { useEmailDetail } from './useEmailDetail'
```

### 4.2 Import Usage Examples

**Before (individual imports)**:
```typescript
import { EmailDetailPanel } from '@/features/inbox/EmailDetail/EmailDetailPanel'
import { useEmailDetail } from '@/features/inbox/EmailDetail/useEmailDetail'
import { Avatar } from '@/features/inbox/EmailDetail/Avatar'
```

**After (barrel imports)**:
```typescript
import {
  EmailDetailPanel,
  useEmailDetail,
  Avatar
} from '@/features/inbox/EmailDetail'
```

---

## 5. Integration Notes

### Directory Structure

```
packages/frontend/src/features/inbox/EmailDetail/
├── index.ts                    # Barrel export (this file)
├── EmailDetailPanel.tsx
├── EmailDetailHeader.tsx
├── EmailDetailBody.tsx
├── EmailDetailAttachments.tsx
├── EmailDetailSkeleton.tsx
├── EmailDetailEmpty.tsx
├── EmailDetailError.tsx
├── Avatar.tsx
├── ClassificationBadge.tsx
└── useEmailDetail.ts
```

### Type Exports

If any types need to be exported, add them:
```typescript
export type { EmailDetailPanelProps } from './EmailDetailPanel'
```

---

## 6. Acceptance Criteria

- [ ] `index.ts` file created at correct path
- [ ] All components are exported
- [ ] `useEmailDetail` hook is exported
- [ ] Imports work correctly using barrel path
- [ ] No circular dependency issues

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### Import Verification
- All exports are accessible from barrel import
- No runtime errors from circular dependencies
- Tree-shaking works correctly (no unused code imported)

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 10**: Tests

### What Phase 10 Needs
- All components from Phase 1-9
- Testing setup and utilities