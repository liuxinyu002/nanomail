# Plan 12 Phase 6: Cleanup

**Dependencies:** All previous phases complete

---

## Objective

Remove obsolete components and update exports after the AI Assist Reply refactoring.

---

## Files to DELETE

| File | Reason |
|------|--------|
| `packages/frontend/src/features/todos/AssistReplySheet.tsx` | Replaced by ComposeEmailModal with AI assist |
| `packages/frontend/src/features/todos/AssistReplySheet.test.tsx` | Test file for deleted component |
| `packages/frontend/src/features/todos/DraftEditor.tsx` | Logic moved to useAIAssistStream hook |
| `packages/frontend/src/features/todos/DraftEditor.test.tsx` | Test file for deleted component |

---

## Files to UPDATE

### `packages/frontend/src/features/todos/index.ts`

Remove exports for deleted components:

```typescript
// REMOVE these exports
export { AssistReplySheet } from './AssistReplySheet'
export { DraftEditor } from './DraftEditor'
```

### `packages/frontend/src/hooks/index.ts`

Add export for new hook:

```typescript
// ADD this export
export { useAIAssistStream } from './useAIAssistStream'
export type { UseAIAssistStreamOptions, UseAIAssistStreamReturn } from './useAIAssistStream'
```

---

## Verification Checklist

- [ ] No imports of deleted files remain in codebase
- [ ] No TypeScript errors after deletion
- [ ] All exports are updated correctly
- [ ] Build passes (`pnpm build`)
- [ ] Tests pass (`pnpm --filter @nanomail/frontend test`)

---

## Commands to Execute

```bash
# Delete obsolete files
rm packages/frontend/src/features/todos/AssistReplySheet.tsx
rm packages/frontend/src/features/todos/AssistReplySheet.test.tsx
rm packages/frontend/src/features/todos/DraftEditor.tsx
rm packages/frontend/src/features/todos/DraftEditor.test.tsx

# Verify no imports remain
grep -r "AssistReplySheet" packages/frontend/src/ || echo "No references found"
grep -r "DraftEditor" packages/frontend/src/ || echo "No references found"

# Run build
pnpm build

# Run tests
pnpm --filter @nanomail/frontend test
```