# Plan 10 - Phase 8: InboxPage Integration

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 8 of 8 (Final)
> **Depends on**: Phase 7 (ComposeEmailModal Component)

---

## Objective

Integrate the compose email functionality into the Inbox page by adding a "Compose" button and rendering the ComposeEmailModal.

---

## Context

This is the final integration phase. The ComposeEmailModal component is complete and needs to be added to the InboxPage with:
- A "Compose" button in the page header
- State management for modal open/close
- Proper positioning in the header layout

---

## Target File

| File | Action |
|------|--------|
| `packages/frontend/src/features/inbox/InboxPage.tsx` | Modify |

---

## Implementation Details

### 1. Add Imports

```typescript
import { Pencil } from 'lucide-react'
import { ComposeEmailModal } from '@/components/email'
```

### 2. Add State

```typescript
const [composeOpen, setComposeOpen] = useState(false)
```

### 3. Add Compose Button in Header

Place the button between `ClassificationFilter` and `Sync` button:

```tsx
<div className="flex items-center gap-2">
  {/* Existing: ClassificationFilter */}
  <ClassificationFilter value={classification} onChange={setClassification} />

  {/* NEW: Compose Button */}
  <Button
    variant="outline"
    size="sm"
    onClick={() => setComposeOpen(true)}
  >
    <Pencil className="h-4 w-4 mr-2" />
    Compose
  </Button>

  {/* Existing: Sync Button */}
  <Button
    variant="outline"
    size="sm"
    onClick={handleSync}
    disabled={syncing}
  >
    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
  </Button>
</div>
```

### 4. Add Modal at End of Component

```tsx
{/* Compose Email Modal */}
<ComposeEmailModal
  open={composeOpen}
  onOpenChange={setComposeOpen}
/>
```

---

## Complete Code Example

```tsx
import { useState } from 'react'
import { RefreshCw, Loader2, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ClassificationFilter } from './components/ClassificationFilter'
import { EmailList } from './components/EmailList'
import { ComposeEmailModal } from '@/components/email'

export function InboxPage() {
  const [classification, setClassification] = useState<string>('all')
  const [syncing, setSyncing] = useState(false)
  const [composeOpen, setComposeOpen] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    try {
      // sync logic...
    } finally {
      setSyncing(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Inbox</h1>
        <div className="flex items-center gap-2">
          <ClassificationFilter value={classification} onChange={setClassification} />
          <Button variant="outline" size="sm" onClick={() => setComposeOpen(true)}>
            <Pencil className="h-4 w-4 mr-2" />
            Compose
          </Button>
          <Button variant="outline" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Email List */}
      <div className="flex-1 overflow-auto">
        <EmailList classification={classification} />
      </div>

      {/* Compose Modal */}
      <ComposeEmailModal open={composeOpen} onOpenChange={setComposeOpen} />
    </div>
  )
}
```

---

## Key Implementation Notes

1. **Button placement**: Between ClassificationFilter and Sync button
2. **Button style**: `variant="outline"` `size="sm"` to match existing buttons
3. **Icon**: `Pencil` from lucide-react with `mr-2` spacing
4. **Modal position**: At the end of the component, outside the main layout

---

## Dependencies

- `lucide-react` for `Pencil` icon
- `@/components/email` for `ComposeEmailModal`
- React `useState` hook

---

## Verification

### Manual Testing Checklist

1. Navigate to Inbox page
2. Verify "Compose" button is visible in header
3. Verify button is between filter and sync button
4. Click "Compose" button
5. Verify modal opens with correct layout
6. Compose and send an email
7. Verify modal closes after successful send
8. Test data loss prevention by adding content and closing via X button

### Build Verification

```bash
# Build all packages
pnpm build

# Run frontend tests
pnpm --filter @nanomail/frontend test
```

---

## Completion

This is the final phase of Plan 10. After completing this phase:

1. Run full build: `pnpm build`
2. Run all tests: `pnpm test`
3. Perform manual testing per acceptance criteria
4. Create git commit with message: `feat(frontend): add compose email feature (Plan 10)`

---

## Acceptance Criteria (Full Plan)

- [ ] Compose button visible in InboxPage header
- [ ] Modal opens with max-w-2xl width and h-[80vh] height
- [ ] From field displayed inline with title (small text, truncated)
- [ ] To field accepts multiple emails as chips
- [ ] Cc/Bcc fields auto-expand if arrays have content
- [ ] Chips created on comma, semicolon, Enter
- [ ] Smart paste extracts emails from `"Name" <email>` format
- [ ] Smart paste diffs with existing chips (no duplicates)
- [ ] Invalid email input shows shake animation
- [ ] TipTap editor with full toolbar and proper prose styling
- [ ] Send button disabled until form valid
- [ ] Send button shows Loader2 animation when sending
- [ ] All inputs disabled during sending state
- [ ] Modal closure blocked during sending
- [ ] Email sent successfully via API
- [ ] Success toast shown on send
- [ ] Form resets after successful send
- [ ] Data loss prevention: AlertDialog shown when closing with content
- [ ] All tests passing