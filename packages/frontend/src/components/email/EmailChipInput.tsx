import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { z } from 'zod'
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
  id,
  trailingActions,
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
        // Invalid input - show shake animation and red text
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
    <div className="flex items-start min-h-[44px] border-b border-border/50 focus-within:bg-muted/20">
      <label
        htmlFor={id}
        className="text-sm text-muted-foreground min-w-[5rem] flex-shrink-0 px-4 py-3"
      >
        {label}
      </label>
      <div className="flex-1 flex flex-wrap gap-1.5 py-2 pr-4">
        {emails.map((email, index) => (
          <span
            key={email}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-full text-sm"
          >
            {email}
            <button
              type="button"
              onClick={() => handleRemoveEmail(index)}
              className="hover:text-destructive"
              disabled={disabled}
              aria-label={`Remove ${email}`}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          id={id}
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
      {trailingActions && (
        <div className="pr-4 py-3">
          {trailingActions}
        </div>
      )}
      {error && (
        <span className="sr-only">{error}</span>
      )}
    </div>
  )
}