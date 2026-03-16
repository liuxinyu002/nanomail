import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { z } from 'zod'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface EmailChipInputProps {
  emails: string[]
  onChange: (emails: string[]) => void
  placeholder?: string
  disabled?: boolean
  error?: string
  label: string
}

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

/**
 * Validates a single email address using zod
 */
function isValidEmail(email: string): boolean {
  return z.string().email().safeParse(email).success
}

export function EmailChipInput({
  emails,
  onChange,
  placeholder = 'Enter email address',
  disabled = false,
  error,
  label,
}: EmailChipInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState(false)
  const [shake, setShake] = useState(false)

  const addEmails = useCallback((newEmails: string[]) => {
    // Validate and filter
    const validEmails = newEmails.filter(isValidEmail)

    // Diff with existing emails to prevent duplicates
    const uniqueNewEmails = validEmails.filter(email => !emails.includes(email))

    if (uniqueNewEmails.length > 0) {
      onChange([...emails, ...uniqueNewEmails])
      setInputValue('')
      setInputError(false)
    }
  }, [emails, onChange])

  const showErrorFeedback = useCallback(() => {
    setInputError(true)
    setShake(true)
    setTimeout(() => setShake(false), 500)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';') {
      e.preventDefault()
      const text = inputValue.trim()
      if (!text) return

      const extractedEmails = extractEmails(text)
      const validEmails = extractedEmails.filter(isValidEmail)

      if (validEmails.length === 0) {
        // Invalid input - show shake animation and red border
        showErrorFeedback()
        return
      }

      // Diff with existing emails to prevent duplicates
      const newEmails = validEmails.filter(email => !emails.includes(email))
      if (newEmails.length > 0) {
        onChange([...emails, ...newEmails])
        setInputValue('')
        setInputError(false)
      } else {
        // All emails were duplicates - show error feedback
        showErrorFeedback()
      }
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const extractedEmails = extractEmails(text)
    addEmails(extractedEmails)
  }

  const handleBlur = () => {
    const text = inputValue.trim()
    if (!text) return

    const extractedEmails = extractEmails(text)
    const validEmails = extractedEmails.filter(isValidEmail)
    const newEmails = validEmails.filter(email => !emails.includes(email))

    if (newEmails.length > 0) {
      onChange([...emails, ...newEmails])
      setInputValue('')
    }
    // CRITICAL: Do NOT clear inputValue if no valid emails found
    // Preserves user keystrokes when they blur to copy domain from another tab
  }

  const handleRemoveEmail = (index: number) => {
    onChange(emails.filter((_, i) => i !== index))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setInputError(false)
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div
        data-testid="email-chip-container"
        className={cn(
          "flex flex-wrap gap-1.5 p-2 border rounded-md min-h-[42px] bg-background",
          error && "border-destructive"
        )}
      >
        {emails.map((email, index) => (
          <Badge
            key={email}
            variant="secondary"
            className="rounded-full px-2.5 py-0.5 text-sm flex items-center gap-1 hover:bg-destructive/20 transition-colors group"
          >
            {email}
            <button
              type="button"
              onClick={() => handleRemoveEmail(index)}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
              disabled={disabled}
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
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
          aria-label={label}
        />
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}