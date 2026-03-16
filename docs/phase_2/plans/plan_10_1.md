# Plan 10 - Phase 1: Shared Schema Updates

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 1 of 8

---

## Objective

Update the `SendEmailSchema` in the shared package to support arrays for `to`, `cc`, and `bcc` fields, enabling multi-recipient email composition.

---

## Context

NanoMail is adding a compose email feature. This requires updating the shared schema to support:
- Multiple recipients in the `to` field (array instead of single string)
- Carbon copy (`cc`) support with multiple recipients
- Blind carbon copy (`bcc`) support with multiple recipients

The shared schema is the single source of truth for types used by both frontend and backend.

---

## Target File

| File | Action |
|------|--------|
| `packages/shared/src/schemas/email.ts` | Modify |

---

## Implementation Details

### Schema Definition

```typescript
import { z } from 'zod'

// Email validation
const EmailSchema = z.string().email('Invalid email address')

// Email array validation with safe coercion
const EmailArraySchema = z.array(EmailSchema)

export const SendEmailSchema = z.object({
  to: EmailArraySchema.min(1, 'At least one recipient is required'),
  cc: EmailArraySchema.optional().default([]).catch([]),
  bcc: EmailArraySchema.optional().default([]).catch([]),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  replyTo: EmailSchema.optional(),
  isHtml: z.boolean().optional().default(true),
})

// Types
export type SendEmail = z.infer<typeof SendEmailSchema>
```

### Key Points

1. **Array-based schema**: `to`, `cc`, `bcc` are now arrays of email strings
2. **Backward compatibility**: Empty arrays default to `[]` for consistency
3. **CRITICAL - `.catch([])`**: Added for `cc`/`bcc` to handle edge cases where HTTP clients may send malformed payloads (null, undefined, or invalid types). This ensures graceful fallback instead of validation errors.
4. **Validation**: `to` requires at least one recipient; `cc` and `bcc` are optional

---

## Dependencies

- Existing `z` import from 'zod'
- Must be built before frontend/backend can use: `pnpm --filter @nanomail/shared build`

---

## Verification

1. Check that the schema compiles without errors
2. Verify types are correctly exported
3. Ensure `z.string().email()` validation works for edge cases
4. Test that `.catch([])` handles null/undefined gracefully

---

## Next Phase

After completing this phase, proceed to **Phase 2: Backend Updates** to update `SmtpService.ts` to handle the new array-based schema.