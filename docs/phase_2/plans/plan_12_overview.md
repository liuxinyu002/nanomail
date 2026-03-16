# Plan 12: AI Assist Reply Refactoring - Overview

**Project**: NanoMail - Email client application
**Date**: 2026-03-16

## Context

**Problem:** Current AI Assist Reply feature uses a side sheet (`AssistReplySheet`) that's disconnected from the actual email context. Users can't see the original email or easily send the AI-generated reply.

**Solution:** Refactor to use the existing `ComposeEmailModal` with AI streaming integration. When users click "Assist Reply" in Todos, navigate to Inbox with the email selected, auto-open the compose modal with AI assist enabled.

**Outcome:** Seamless workflow where users can see the original email, watch AI generate content in real-time, edit the draft, and send directly.

---

## Architecture Overview

```
TodoItem (click "Assist Reply")
    ↓ navigate with state
/inbox/:emailId (with router state: { action, instruction })
    ↓ parse state
InboxPage
    ↓ props
ComposeEmailModal(emailId, initialInstruction, sender)
    ↓ uses
useAIAssistStream(emailId, instruction, callbacks)
    ↓ SSE stream
onChunk callback → TipTapEditor.appendContent(chunk) → typing effect
```

---

## Implementation Phases

| Phase | File | Description |
|-------|------|-------------|
| [Phase 1](./plan_12_phase1.md) | TipTapEditor.tsx | Add forwardRef + useImperativeHandle + disabled prop |
| [Phase 2](./plan_12_phase2.md) | useAIAssistStream.ts | New SSE streaming hook with callback-based API |
| [Phase 3](./plan_12_phase3.md) | ComposeEmailModal.tsx | Integrate AI assist UI, draggable modal, stop button |
| [Phase 4](./plan_12_phase4.md) | InboxPage.tsx | Parse router state, pass to modal |
| [Phase 5](./plan_12_phase5.md) | TodoItem.tsx | Change to navigation with router state |
| [Phase 6](./plan_12_phase6.md) | Cleanup | Remove obsolete components |

---

## File Change Summary

| File | Action | Description |
|------|--------|-------------|
| `components/email/TipTapEditor.tsx` | MODIFY | Add forwardRef + useImperativeHandle + disabled prop |
| `hooks/useAIAssistStream.ts` | CREATE | New SSE streaming hook with callback-based API |
| `components/email/ComposeEmailModal.tsx` | MODIFY | Integrate AI assist UI, draggable modal, stop button, editor lock |
| `features/inbox/InboxPage.tsx` | MODIFY | Parse router state, pass to modal |
| `features/todos/TodoItem.tsx` | MODIFY | Change to navigation with router state |
| `features/todos/AssistReplySheet.tsx` | DELETE | No longer needed |
| `features/todos/DraftEditor.tsx` | DELETE | Logic moved to hook |
| `hooks/index.ts` | MODIFY | Export new hook |