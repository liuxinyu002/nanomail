# Plan 10 - Phase 7: ComposeEmailModal Component

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 7 of 8
> **Depends on**: Phase 4, 5, 6 (useSettings, EmailChipInput, TipTapEditor)

---

## Objective

Create the main compose email modal with full form functionality, data loss prevention, and loading states.

---

## Context

This is the central component of the compose email feature. It brings together:
- EmailChipInput for recipients
- TipTapEditor for email body
- useSettings for sender information
- AlertDialog for data loss prevention

---

## Target File

| File | Action |
|------|--------|
| `packages/frontend/src/components/email/ComposeEmailModal.tsx` | Create |
| `packages/frontend/src/components/email/index.ts` | Modify (export) |

---

## Props Interface

```typescript
interface ComposeEmailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

---

## Layout Structure

```
Dialog (max-w-2xl, h-[80vh])
├── DialogHeader (sticky, border-b)
│   └── Title: "New Message"
│   └── From: Inline with title (small text, truncate max-w-[200px])
├── DialogContent (flex-1, overflow-y-auto)
│   ├── To: EmailChipInput
│   ├── [Cc/Bcc Toggle Buttons]
│   ├── Cc: EmailChipInput (conditional)
│   ├── Bcc: EmailChipInput (conditional)
│   ├── Subject: Input
│   └── Body: TipTapEditor
└── DialogFooter (sticky, border-t)
    ├── Cancel button
    └── Send button (with Loader2 animation)
```

---

## Implementation Details

### State Management

```typescript
const [to, setTo] = useState<string[]>([])
const [cc, setCc] = useState<string[]>([])
const [bcc, setBcc] = useState<string[]>([])
const [showCc, setShowCc] = useState(false)
const [showBcc, setShowBcc] = useState(false)
const [subject, setSubject] = useState('')
const [body, setBody] = useState('')
const [isBodyEmpty, setIsBodyEmpty] = useState(true)  // CRITICAL: Track TipTap empty state
const [sending, setSending] = useState(false)
const [showConfirmDialog, setShowConfirmDialog] = useState(false)
```

### From Field (Inline with Title)

```typescript
const { data: settings } = useSettings()
const hasMultipleAccounts = false // Future: check multiple SMTP configs

// In DialogHeader
<DialogHeader>
  <DialogTitle className="flex items-center gap-2">
    New Message
    {settings?.SMTP_USER && !hasMultipleAccounts && (
      <span className="text-sm font-normal text-muted-foreground truncate max-w-[200px]" title={settings.SMTP_USER}>
        from {settings.SMTP_USER}
      </span>
    )}
  </DialogTitle>
</DialogHeader>
```

### Cc/Bcc Smart Toggle

```typescript
// Auto-expand if cc/bcc arrays have content
const showCcField = showCc || cc.length > 0
const showBccField = showBcc || bcc.length > 0

// Toggle buttons
<div className="flex gap-2 text-sm">
  <Button variant="ghost" size="sm" onClick={() => setShowCc(!showCc)}>
    Cc
  </Button>
  <Button variant="ghost" size="sm" onClick={() => setShowBcc(!showBcc)}>
    Bcc
  </Button>
</div>
```

### Data Loss Prevention (CRITICAL)

```typescript
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// Check if form has unsaved content
const hasContent = (): boolean => {
  return (
    to.length > 0 ||
    cc.length > 0 ||
    bcc.length > 0 ||
    subject.trim().length > 0 ||
    !isBodyEmpty  // Uses TipTap's reliable isEmpty state
  )
}

// Intercept modal close
const handleOpenChange = (newOpen: boolean) => {
  // Block closure during API request
  if (!newOpen && sending) {
    return
  }

  if (!newOpen && hasContent()) {
    setShowConfirmDialog(true)
  } else {
    onOpenChange(newOpen)
  }
}

// Confirmation dialog in render
<AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>Discard email?</AlertDialogTitle>
      <AlertDialogDescription>
        You have unsaved content. Are you sure you want to close and discard this email?
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel>Keep Editing</AlertDialogCancel>
      <AlertDialogAction onClick={() => onOpenChange(false)}>Discard</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>
```

### Send Handler with Loading State

```typescript
const handleSend = async () => {
  setSending(true)
  try {
    await EmailService.sendEmail({ to, cc, bcc, subject, body, isHtml: true })
    toast({ title: 'Email sent successfully' })
    resetForm()
    onOpenChange(false)
  } catch (error) {
    toast({ title: 'Failed to send email', variant: 'destructive' })
  } finally {
    setSending(false)
  }
}

const resetForm = () => {
  setTo([])
  setCc([])
  setBcc([])
  setSubject('')
  setBody('')
  setIsBodyEmpty(true)
  setShowCc(false)
  setShowBcc(false)
}
```

### TipTapEditor Integration

```tsx
<TipTapEditor
  value={body}
  onChange={(html, isEmpty) => {
    setBody(html)
    setIsBodyEmpty(isEmpty)
  }}
  disabled={sending}
/>
```

### Validation

```typescript
const isValid = to.length >= 1 && subject.length >= 1 && !isBodyEmpty
```

### Footer with Loading State

```tsx
<DialogFooter>
  <Button variant="outline" onClick={handleCancel} disabled={sending}>
    Cancel
  </Button>
  <Button onClick={handleSend} disabled={!isValid || sending}>
    {sending ? (
      <>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Sending...
      </>
    ) : (
      'Send'
    )}
  </Button>
</DialogFooter>
```

---

## Key Implementation Notes

1. **Modal height**: Use `h-[80vh]` for comfortable editing space
2. **From field truncation**: `max-w-[200px]` prevents long emails from breaking layout
3. **isBodyEmpty tracking**: Use TipTap's `isEmpty` state, NOT string comparison
4. **Data loss prevention**: Use AlertDialog, NOT `window.confirm`
5. **Loading state**: Disable all inputs and prevent modal close during sending
6. **Form reset**: Clear all state on successful send

---

## Dependencies

- `@/components/ui/dialog` - Dialog components
- `@/components/ui/alert-dialog` - AlertDialog for confirmation
- `@/components/ui/button` - Button component
- `@/components/ui/input` - Input component
- `@/components/ui/label` - Label component
- `@/hooks/use-toast` - Toast notifications
- `lucide-react` - Loader2 icon
- `./EmailChipInput` - Recipient chips
- `./TipTapEditor` - Rich text editor
- `@/hooks/useSettings` - Settings hook
- `@/services/email.service` - Email API

---

## Verification

1. Test modal opens with correct layout (h-[80vh])
2. Test From field shows sender email (truncated if long)
3. Test To field chip creation and deletion
4. Test Cc/Bcc toggle and auto-expand
5. Test rich text formatting in body
6. Test validation: Send button disabled until valid
7. Test data loss prevention: AlertDialog shown when closing with content
8. Test loading state: All inputs disabled during send
9. Test modal close blocked during send (Escape, overlay click)
10. Test success toast and form reset after send

---

## Next Phase

After completing this phase, proceed to **Phase 8: InboxPage Integration** to add the Compose button and modal to the Inbox page.