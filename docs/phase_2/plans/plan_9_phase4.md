# Plan 9 - Phase 4: Rename and Update Test Files

> **Parent Plan**: [plan_9.md](./plan_9.md)
> **Status**: Ready for Implementation
> **Dependencies**: [Phase 2: TodoDayModal Component](./plan_9_phase2.md)

---

## Objective

Rename test file and update imports. Add new test cases for modal-specific behavior.

---

## File Operations

1. Rename `TodoDayDrawer.test.tsx` to `TodoDayModal.test.tsx`
2. Update imports: `TodoDayDrawer` -> `TodoDayModal`

---

## Risk Level

**Low**

---

## Test Cases to Add

### Modal Behavior Tests

```typescript
describe('modal behavior', () => {
  it('renders as centered modal (not side drawer)', () => {
    // Verify modal is centered, not positioned on the side
  })

  it('closes when clicking outside', async () => {
    // Click outside the modal (on overlay)
    // Verify modal closes
  })

  it('closes when pressing Escape', async () => {
    // Press Escape key
    // Verify modal closes
  })

  it('resets expand state when modal closes', async () => {
    // Open modal, expand it
    // Close modal
    // Wait for animation
    // Reopen modal
    // Verify modal is in compact state
  })
})
```

### Expand/Collapse Tests

```typescript
describe('expand/collapse functionality', () => {
  it('shows expand button in header', () => {
    // Verify expand toggle button is visible
  })

  it('toggles between compact and expanded width', async () => {
    // Click expand button
    // Verify modal has max-w-xl class (576px)
    // Click collapse button
    // Verify modal has max-w-md class (448px)
  })

  it('expands modal when entering edit mode', async () => {
    // Click edit button on a todo
    // Verify modal is expanded (max-w-xl class)
  })

  it('optional: collapses when canceling edit', async () => {
    // Enter edit mode
    // Cancel edit
    // Verify modal collapses back (if this behavior is desired)
  })
})
```

### State Reset Tests

```typescript
describe('state reset on close', () => {
  it('resets editing state after close animation completes', async () => {
    // Open modal, enter edit mode
    // Close modal
    // Wait for animation duration
    // Reopen modal
    // Verify not in edit mode
  })

  it('does not crash when date becomes null during exit animation', async () => {
    // Open modal with a date
    // Close modal (parent sets date to null immediately)
    // Verify no TypeError crash during exit animation
    // Verify modal still shows cached date during fade-out
  })
})
```

### Accessibility Tests

```typescript
describe('accessibility', () => {
  it('has DialogTitle in DOM', () => {
    // Verify DialogTitle element exists
  })

  it('has DialogDescription in DOM (may be visually hidden)', () => {
    // Verify DialogDescription element exists
    // May have sr-only class or be inside VisuallyHidden
  })
})
```

### Scroll Behavior Tests

```typescript
describe('scroll behavior', () => {
  it('scrolls content area when todos overflow', async () => {
    // Render modal with many todos
    // Verify content area has overflow
    // Verify scrolling works
  })

  it('keeps header sticky while scrolling', async () => {
    // Scroll content area
    // Verify header remains visible and fixed at top
  })
})
```

---

## Acceptance Criteria

- [ ] Test file renamed from `TodoDayDrawer.test.tsx` to `TodoDayModal.test.tsx`
- [ ] All imports updated
- [ ] Existing tests still pass
- [ ] Modal behavior tests added
- [ ] Expand/collapse tests added
- [ ] State reset tests added
- [ ] Accessibility tests added
- [ ] Scroll behavior tests added
- [ ] Test coverage maintained at 80%+

---

## Next Phase

[Phase 5: Cleanup Old Files](./plan_9_phase5.md)