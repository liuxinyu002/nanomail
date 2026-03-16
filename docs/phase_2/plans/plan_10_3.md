# Plan 10 - Phase 3: Frontend Service Updates

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 3 of 8
> **Depends on**: Phase 1 (Shared Schema Updates), Phase 2 (Backend Updates)

---

## Objective

Update the frontend email service to match the new array-based recipient schema.

---

## Context

Phases 1 and 2 updated the shared schema and backend to support arrays for `to`, `cc`, and `bcc`. The frontend service interface needs to be updated to maintain type consistency.

---

## Target File

| File | Action |
|------|--------|
| `packages/frontend/src/services/email.service.ts` | Modify |

---

## Implementation Details

### Update SendEmailRequest Interface

```typescript
export interface SendEmailRequest {
  to: string[]       // Changed from string to string[]
  cc?: string[]      // Added cc field
  bcc?: string[]     // Added bcc field
  subject: string
  body: string
  replyTo?: string
  isHtml?: boolean
}
```

### Key Points

1. **Type consistency**: Interface must match the `SendEmail` type from shared schema
2. **Optional fields**: `cc` and `bcc` are optional arrays
3. **Backward compatibility**: Existing `replyTo` and `isHtml` fields remain unchanged

---

## Alternative Approach

**Recommended**: Import type from shared package instead of defining locally:

```typescript
import type { SendEmail } from '@nanomail/shared'

// Use SendEmail directly as the request type
// This ensures single source of truth and automatic sync
```

---

## Dependencies

- Phase 1 must be completed and shared package rebuilt
- Run `pnpm --filter @nanomail/shared build` before proceeding

---

## Verification

1. Verify TypeScript compilation without errors
2. Ensure `SendEmailRequest` matches `SendEmail` from shared
3. Check that existing email service methods work with updated types

---

## Next Phase

After completing this phase, proceed to **Phase 4: Settings Hook** to create a hook for fetching SMTP settings.