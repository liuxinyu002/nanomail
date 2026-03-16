# Plan 10 - Phase 2: Backend Updates

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 2 of 8
> **Depends on**: Phase 1 (Shared Schema Updates)

---

## Objective

Update the backend SMTP service to handle array-based recipient fields (`to`, `cc`, `bcc`) with proper empty array handling to prevent SMTP errors.

---

## Context

Phase 1 updated the shared schema to support arrays for recipients. The backend `SmtpService` now needs to:
- Accept array-based `to`, `cc`, `bcc` fields
- Join arrays into comma-separated strings for SMTP
- Handle empty arrays gracefully to avoid SMTP rejection

**Important**: Empty string in `cc`/`bcc` headers can cause SMTP errors with strict mail servers (e.g., Microsoft Exchange).

---

## Target Files

| File | Action |
|------|--------|
| `packages/backend/src/services/SmtpService.ts` | Modify |
| `packages/backend/src/routes/email.routes.ts` | No changes needed |

---

## Implementation Details

### Update SendEmailOptions Interface

```typescript
export interface SendEmailOptions {
  to: string[]      // Changed from string to string[]
  cc?: string[]     // Added cc field
  bcc?: string[]    // Added bcc field
  subject: string
  body: string
  replyTo?: string
  isHtml?: boolean
}
```

### Update sendEmail Method

**CRITICAL: Empty Array Protection**

```typescript
const mailOptions = {
  from: config.user,
  to: options.to.join(', '),
  // CRITICAL: Only include cc/bcc if array exists and has elements
  // Empty string in cc/bcc can cause SMTP errors with strict servers (e.g., Exchange)
  ...(options.cc && options.cc.length > 0 ? { cc: options.cc.join(', ') } : {}),
  ...(options.bcc && options.bcc.length > 0 ? { bcc: options.bcc.join(', ') } : {}),
  subject: options.subject,
  [options.isHtml ? 'html' : 'text']: options.body,
  ...(options.replyTo && { replyTo: options.replyTo }),
}
```

### Key Points

1. **Array joining**: `options.to.join(', ')` converts array to SMTP-compatible string
2. **Empty array handling**: Empty array `[]` → field omitted (not empty string `""`)
3. **Conditional spread**: Only add `cc`/`bcc` headers if array has elements
4. **Prevents SMTP rejection**: Strict mail servers reject emails with empty `cc`/`bcc` headers

---

## Dependencies

- Phase 1 must be completed and shared package rebuilt
- Existing nodemailer configuration

---

## Verification

1. Verify TypeScript compilation without errors
2. Test with single recipient: `to: ['user@example.com']`
3. Test with multiple recipients: `to: ['user1@example.com', 'user2@example.com']`
4. Test with empty cc/bcc: Ensure headers are omitted, not sent as empty strings
5. Test with populated cc/bcc: Ensure proper comma-separated format

---

## Next Phase

After completing this phase, proceed to **Phase 3: Frontend Service Updates** to update the frontend email service types.