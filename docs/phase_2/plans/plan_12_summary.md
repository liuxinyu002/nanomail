# Plan 12: AI Assist Reply Refactoring - Summary

**Project**: NanoMail - Email client application
**Date**: 2026-03-16

---

## Testing Strategy

### Unit Tests

#### 1. TipTapEditor
- Test ref methods:
  - `appendContent` adds content
  - `clearContent` clears editor
  - `isEmpty` returns correct state
  - `disabled` prop locks editor correctly

#### 2. useAIAssistStream
- Test hook behavior:
  - Mock fetch for SSE events
  - Test `onChunk` callback is called correctly
  - Test `cancel()` aborts request
  - Test `reset()` clears state
  - Test error handling via `onError`

#### 3. ComposeEmailModal
- Test new features:
  - Props pre-fill instruction/sender
  - Generate button triggers streaming
  - Stop button cancels streaming
  - Editor is locked during drafting
  - Partial content preserved after stop

### Integration Tests

#### 1. TodoItem → InboxPage Flow
- Click "Assist Reply" navigates correctly
- Router state passed correctly
- Modal opens with correct props
- URL remains clean (no query params)

#### 2. Full AI Assist Workflow
- Instruction input → Generate → Streaming → Stop → Edit → Send
- Editor locked during streaming, unlocked after stop/done

---

## Risks & Mitigations

| Risk | Level | Mitigation |
|------|-------|------------|
| TipTapEditor ref breaks existing usage | MEDIUM | Comprehensive unit tests, backward compatible props |
| SSE connection issues | MEDIUM | Robust error handling, retry button, cancel support |
| Router state lost on refresh | LOW | Expected behavior - clean state on refresh |
| Memory leaks from AbortController | LOW | Cleanup in useEffect return |
| Test coverage regression | MEDIUM | Write tests alongside implementation |
| Dragging conflicts with text selection | LOW | Use drag handle on header only, not entire modal |

---

## Verification

### 1. Manual Testing

- [ ] Go to Todos page
- [ ] Click "Assist Reply" on a todo
- [ ] Verify navigation to Inbox with clean URL (no query params)
- [ ] Verify modal opens with instruction pre-filled
- [ ] Verify modal is draggable and doesn't block email view
- [ ] Click Generate, verify editor is locked
- [ ] Click Stop during generation, verify content is preserved
- [ ] Edit the draft after stopping, click Send
- [ ] Verify email sends successfully

### 2. Automated Testing

```bash
# Run frontend tests
pnpm --filter @nanomail/frontend test

# All tests pass including new ones
```

### 3. Build Verification

```bash
# Build all packages
pnpm build

# No errors
```

---

## Implementation Order

Recommended implementation order based on dependencies:

```
Phase 1 (TipTapEditor) ──────────────────────────────┐
                                                      │
Phase 2 (useAIAssistStream) ──────────────────────────┤
                                                      ├──► Phase 3 (ComposeEmailModal)
Phase 4 (InboxPage) ──────────────────────────────────┤
                                                      │
Phase 5 (TodoItem) ───────────────────────────────────┘
                                                      │
                                                      ▼
                                              Phase 6 (Cleanup)
```

**Parallel Development Opportunities:**
- Phase 1, 2, 4, 5 can be developed in parallel
- Phase 3 depends on Phase 1 and 2
- Phase 6 must wait for all others

---

## Quick Reference

| Document | Description |
|----------|-------------|
| [Overview](./plan_12_overview.md) | Context, architecture, file changes |
| [Phase 1](./plan_12_phase1.md) | TipTapEditor refactoring |
| [Phase 2](./plan_12_phase2.md) | useAIAssistStream hook |
| [Phase 3](./plan_12_phase3.md) | ComposeEmailModal integration |
| [Phase 4](./plan_12_phase4.md) | InboxPage state parsing |
| [Phase 5](./plan_12_phase5.md) | TodoItem navigation |
| [Phase 6](./plan_12_phase6.md) | Cleanup |