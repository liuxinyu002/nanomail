# Plan 10 - Phase 5: EmailChipInput Component

> **Status**: Ready for Implementation
> **Plan**: Plan 10 - Compose Email Feature
> **Phase**: 5 of 8

---

## Objective

Create a multi-email chip input component with smart paste parsing, validation, and visual feedback for invalid emails.

---

## Context

The compose email modal needs chip-style inputs for recipient fields (To, Cc, Bcc). This component provides:
- Chip-style display of validated emails
- Smart parsing of pasted content (handles formats like `"Name" <email@example.com>`)
- Visual feedback for invalid emails
- Deduplication on paste

---

## Target File

| File | Action |
|------|--------|
| `packages/frontend/src/components/email/EmailChipInput.tsx` | Create |
| `packages/frontend/src/components/email/index.ts` | Create (export) |

---

## Props Interface

```typescript
interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label: string
}
```

---

## Implementation Details

### Component Behavior

| Action | Result |
|--------|--------|
| Press `,`, `;`, or `Enter` | Convert text to chip |
| Invalid email format | Shake animation + red border |
| Click X on chip | Remove chip |
| Paste valid emails | Add all as chips |
| Paste mixed content | Extract valid emails, ignore rest |

### Smart Email Parsing

```typescript
import { z } from 'zod'

/**
 * Extracts email addresses from various input formats:
 * - Plain email: user@example.com
 * - Quoted name: "张三" <zhangsan@example.com>
 * - Angle brackets: <user@example.com>
 * - Multiple emails (comma/semicolon/newline separated)
 */
function extractEmails(text: string): string[] {
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g
  const matches = text.match(emailRegex)
  return matches ? [...new Set(matches)] : [] // Deduplicate within paste
}
```

### Key Handler with Error Feedback

```typescript
const [inputError, setInputError] = useState(false)
const [shake, setShake] = useState(false)

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
    e.preventDefault()
    const text = inputValue.trim()
    if (!text) return

    const extractedEmails = extractEmails(text)
    const validEmails = extractedEmails.filter(email =>
      z.string().email().safeParse(email).success
    )

    if (validEmails.length === 0 && text.length > 0) {
      // Invalid input - show shake animation and red border
      setInputError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    // Diff with existing emails to prevent duplicates
    const newEmails = validEmails.filter(email => !emails.includes(email))
    onChange([...emails, ...newEmails])
    setInputValue('')
    setInputError(false)
  }
}
```

### Paste Handler with Deduplication

```typescript
function handlePaste(e: React.ClipboardEvent) {
  e.preventDefault()
  const text = e.clipboardData.getData('text')
  const extractedEmails = extractEmails(text)
  const validEmails = extractedEmails.filter(email =>
    z.string().email().safeParse(email).success
  )
  // CRITICAL: Diff with existing emails to avoid duplicates
  const newEmails = validEmails.filter(email => !emails.includes(email))
  onChange([...emails, ...newEmails])
}
```

### Blur Handler (Preserve Incomplete Input)

```typescript
function handleBlur(e: React.FocusEvent) {
  const text = e.target.value.trim()
  if (text) {
    const extractedEmails = extractEmails(text)
    const validEmails = extractedEmails.filter(email =>
      z.string().email().safeParse(email).success
    )
    const newEmails = validEmails.filter(email => !emails.includes(email))
    if (newEmails.length > 0) {
      onChange([...emails, ...newEmails])
      setInputValue('')
    }
    // CRITICAL: Do NOT clear inputValue if no valid emails found
    // Preserves user keystrokes when they blur to copy domain from another tab
  }
}
```

### Chip Styling (Pill/Badge Style)

```tsx
<div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background">
  {emails.map((email, index) => (
    <Badge
      key={email}
      variant="secondary"
      className="rounded-full px-2.5 py-0.5 text-sm flex items-center gap-1
                 hover:bg-destructive/20 transition-colors group"
    >
      {email}
      <button
        type="button"
        onClick={() => onChange(emails.filter((_, i) => i !== index))}
        className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
        disabled={disabled}
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  ))}
  <input
    value={inputValue}
    onChange={(e) => {
      setInputValue(e.target.value)
      setInputError(false)
    }}
    onKeyDown={handleKeyDown}
    onPaste={handlePaste}
    onBlur={handleBlur}
    placeholder={emails.length === 0 ? placeholder : ''}
    disabled={disabled}
    className={cn(
      "flex-1 min-w-[150px] outline-none bg-transparent text-sm",
      inputError && "text-destructive",
      shake && "animate-shake"
    )}
  />
</div>
```

---

## Tailwind Configuration

Add shake animation to `tailwind.config.js`:

```javascript
module.exports = {
  theme: {
    extend: {
      animation: {
        shake: 'shake 0.5s ease-in-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
      },
    },
  },
}
```

---

## Dependencies

- `lucide-react` for `X` icon
- `@/components/ui/badge` for Badge component
- `zod` for email validation

---

## Verification

1. Test chip creation with `,`, `;`, Enter keys
2. Test invalid email shows shake animation
3. Test paste of `"Name" <email@example.com>` extracts email only
4. Test duplicate prevention on paste
5. Test input preservation on blur with incomplete email
6. Test chip deletion via X button

---

## Next Phase

After completing this phase, proceed to **Phase 6: TipTapEditor Component** to create the rich text editor.