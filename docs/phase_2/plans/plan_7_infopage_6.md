# Plan 7 - Phase 6: EmailCard Modification

> **Parent Plan**: Email Detail Page Implementation
> **Phase**: 6 of 10
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
- **None** - Modifies existing component, no new dependencies

### Risk Level
- **Medium** - Must not break existing selection functionality

### What This Phase Enables
- Provides clickable cards for Phase 7 (InboxPage integration)
- Enables active state visual feedback
- Adds keyboard accessibility

---

## 3. Task Description

**Action**: Add active state styling and click-to-view-detail behavior to `EmailCard`.

**Why**: Enable navigation to email detail view while preserving selection functionality.

**File**: `/packages/frontend/src/features/inbox/EmailCard.tsx`

---

## 4. Implementation Details

### 4.1 Updated Props Interface

```typescript
export interface EmailCardProps {
  email: Email
  selected: boolean
  onSelect: (id: number) => void
  // New props for active state and click handling
  activeId?: number           // Currently viewed email ID
  onCardClick?: (id: number) => void  // Navigate to detail
  selectionDisabled?: boolean  // Existing prop
}
```

### 4.2 Active State Styling

**CSS Priority Rules**:
1. Selected state: `bg-primary/10` + `border border-primary`
2. Active state (not selected): `bg-blue-50` + `border-l-4 border-l-blue-600`
3. Both states can coexist: selected background takes priority, but active left border still shows

```typescript
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

### 4.3 Click Handler Separation

**Problem**: Checkbox click should not trigger card click (navigation).

**Solution**: Use event propagation control with accessibility support.

```tsx
import { X } from 'lucide-react'  // If needed for icons

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
      // ... existing checkbox props
    />
  </div>
  {/* Rest of card content */}
</div>
```

### 4.4 Keyboard Accessibility

| Key | Action |
|-----|--------|
| Tab | Focus on card (when `canExpand` is true) |
| Enter | Trigger `onCardClick` (navigate to detail) |

### 4.5 Summary Visibility

Remove or hide collapsible summary when the card is active (summary is shown in detail view instead).

---

## 5. Integration Notes

### State Coexistence Visual Example

```
┌─────────────────────────────────────┐
│ ▌ [✓] sender@example.com           │  ← Active + Selected
│    Subject line here...             │     bg-primary/10, blue left border
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ▌ [ ] sender@example.com           │  ← Active only
│    Subject line here...             │     bg-blue-50, blue left border
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│   [✓] sender@example.com           │  ← Selected only
│    Subject line here...             │     bg-primary/10, no left border
└─────────────────────────────────────┘
```

### Existing Component Reference

- File: `/packages/frontend/src/features/inbox/EmailCard.tsx`
- Understand existing props and behavior before modifying

---

## 6. Acceptance Criteria

### Active State
- [ ] `activeId` prop added with correct type
- [ ] Active email shows blue background + left border
- [ ] Active and selected states can coexist (selected background priority)
- [ ] Active state doesn't interfere with selection checkbox

### Click Handling
- [ ] `onCardClick` prop added with correct type
- [ ] Card click triggers `onCardClick` callback
- [ ] Checkbox click does NOT trigger `onCardClick`
- [ ] Click handlers are properly separated

### Accessibility
- [ ] Card has `role="button"` when clickable
- [ ] Card has `tabIndex={0}` when clickable
- [ ] Enter key triggers `onCardClick` callback
- [ ] Tab focuses on clickable cards

### Edge Cases
- [ ] Invalid `activeId` (NaN) does not apply active styling
- [ ] Empty `activeId` (undefined/null) works correctly

---

## 7. Testing Notes

**Test Cases** (to be implemented in Phase 10):

### Active State Styling
- Active state styling applied correctly when `email.id === activeId`
- Active and selected states can coexist with correct styling priority
- Invalid activeId (NaN) does not apply active styling

### Click Handling
- Click card triggers `onCardClick`
- Click checkbox does NOT trigger `onCardClick`
- Event propagation is properly stopped on checkbox

### Keyboard Navigation
- Tab focuses card when `canExpand` is true
- Enter triggers `onCardClick` when card is focused

---

## 8. Next Phase

After completing this phase, proceed to:
- **Phase 7**: InboxPage Split-Pane Layout

### What Phase 7 Needs
- EmailCard with `activeId` and `onCardClick` props
- Understanding of URL parameter parsing for `activeId`