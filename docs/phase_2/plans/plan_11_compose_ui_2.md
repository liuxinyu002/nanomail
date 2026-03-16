# Plan 11 - Phase 2: EmailChipInput Refactoring

## Project Context

**Project**: NanoMail - Email client application
**Plan**: Compose Email Modal UI Optimization
**Goal**: Refactor the compose email modal UI to achieve a modern, immersive design with borderless inputs and improved visual hierarchy.

---

## Core Principles

1. **No new features** - Strictly UI restructuring, preserve all existing functionality
2. **Hybrid borderless approach**:
   - Input areas: White background + bottom border + inline layout
   - Toolbar: Light gray background + rounded corners
   - Body: No border, no focus ring
3. **Inline layout** - Labels and inputs on same row for better vertical space utilization

---

## Phase 2 Objective

Refactor `EmailChipInput` component to use inline layout with borderless styling, matching the modern Gmail-like aesthetic.

---

## Target File

`packages/frontend/src/components/email/EmailChipInput.tsx`

---

## Implementation Details

### 2.1 Props Interface Update

Add `id` prop for accessibility and optional `trailingActions`:

```tsx
interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label: string
  id: string  // Required for accessibility - link label to input
  // New: optional trailing action buttons
  trailingActions?: React.ReactNode
}
```

### 2.2 Inline Layout Structure

**Before**:
```tsx
<div className="space-y-1.5">
  <label className="text-sm font-medium">{label}</label>
  <div className="flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px]">
    {/* chips + input */}
  </div>
</div>
```

**After**:
```tsx
<div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
  <label htmlFor={id} className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
    {label}
  </label>
  <div className="flex-1 flex flex-wrap gap-1.5 py-2 pr-4">
    {/* chips + input */}
  </div>
  {trailingActions && (
    <div className="pr-4 py-3">
      {trailingActions}
    </div>
  )}
</div>
```

**Key improvements**:
- `min-w-[5rem]` provides better breathing room for i18n (e.g., "Recipients" needs ~90px)
- `focus-within:bg-muted/20` adds subtle visual feedback for keyboard navigation while maintaining borderless aesthetic
- `htmlFor={id}` links label to input for accessibility (click label to focus input, screen reader context)
- `trailingActions` slot allows Phase 3 to add Cc/Bcc triggers

### 2.3 Input Styling Changes

- Remove outer border (`border rounded-md`)
- Remove background color (use transparent/white)
- Remove error border styling (use text color only)
- Input should have no border, just transparent background

**Input element styling**:
```tsx
<input
  id={id}
  className={cn(
    "flex-1 min-w-[150px] outline-none bg-transparent text-sm",
    inputError && "text-destructive",
    shake && "animate-shake"
  )}
/>
```

### 2.4 Chip Styling (Unchanged)

Keep existing chip styling:
```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-sm">
  {email}
  <button onClick={() => removeEmail(email)} className="hover:text-destructive">
    <X className="h-3 w-3" />
  </button>
</span>
```

---

## Complete Component Example

```tsx
import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label: string
  id: string
  trailingActions?: React.ReactNode
}

export function EmailChipInput({
  emails,
  onChange,
  placeholder,
  disabled,
  error,
  label,
  id,
  trailingActions
}: EmailChipInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addEmail = (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) return

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmed)) {
      setInputError(true)
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }

    if (!emails.includes(trimmed)) {
      onChange([...emails, trimmed])
    }
    setInputValue('')
    setInputError(false)
  }

  const removeEmail = (email: string) => {
    onChange(emails.filter(e => e !== email))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addEmail(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      removeEmail(emails[emails.length - 1])
    }
  }

  return (
    <div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
      <label htmlFor={id} className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3">
        {label}
      </label>
      <div className="flex-1 flex flex-wrap gap-1.5 py-2 pr-4">
        {emails.map(email => (
          <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-sm">
            {email}
            <button
              type="button"
              onClick={() => removeEmail(email)}
              className="hover:text-destructive"
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          type="email"
          value={inputValue}
          onChange={e => {
            setInputValue(e.target.value)
            setInputError(false)
          }}
          onKeyDown={handleKeyDown}
          onBlur={() => inputValue && addEmail(inputValue)}
          placeholder={emails.length === 0 ? placeholder : undefined}
          disabled={disabled}
          className={cn(
            "flex-1 min-w-[150px] outline-none bg-transparent text-sm",
            inputError && "text-destructive",
            shake && "animate-shake"
          )}
        />
      </div>
      {trailingActions && (
        <div className="pr-4 py-3">
          {trailingActions}
        </div>
      )}
    </div>
  )
}
```

---

## Dependencies

- **Phase 1** must be completed (container structure with `flex flex-col`)
- This component will be used by **Phase 3** for recipients row composition

---

## Risks and Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| EmailChipInput chip overflow in inline layout | Medium | Test with multiple emails, ensure proper wrapping; use `items-start` with consistent top padding for multi-line alignment |
| Subject input loses accessibility linkage | High | Preserve `id` and `htmlFor` attributes on label/input pair |
| Label width too tight for i18n | Medium | Use `min-w-[5rem]` instead of `w-16` to accommodate longer labels in other languages |
| Missing visual focus feedback for keyboard navigation | Medium | Add `focus-within:bg-muted/20` to row containers for subtle focus indication |
| EmailChipInput missing accessibility linkage | High | Add `id` prop and bind with `htmlFor` on label for screen reader context and click-to-focus |

---

## Verification Checklist

- [ ] Labels and inputs appear on same row
- [ ] `min-w-[5rem]` accommodates Chinese labels (收件人, 抄送, 密送)
- [ ] Click on label focuses the input
- [ ] Screen reader can associate label with input
- [ ] Multiple chips wrap correctly without overflow
- [ ] Error state shows red text (no red border)
- [ ] Dark mode styling is correct
- [ ] `trailingActions` renders correctly when provided