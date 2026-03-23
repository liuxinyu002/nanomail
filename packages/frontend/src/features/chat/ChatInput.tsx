import { useState, useRef, useCallback, useEffect } from 'react'
import { Send, Square, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  onStop?: () => void
  isStreaming?: boolean
  placeholder?: string
  disabled?: boolean
}

export function ChatInput({
  onSend,
  onStop,
  isStreaming = false,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea based on content
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    // Reset height to get accurate scrollHeight
    textarea.style.height = 'auto'
    // Set new height based on content, clamped between min and max
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 40), 120)
    textarea.style.height = `${newHeight}px`
  }, [])

  // Adjust height when value changes
  useEffect(() => {
    adjustHeight()
  }, [value, adjustHeight])

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(() => {
    const trimmedValue = value.trim()
    if (trimmedValue && !isStreaming && !disabled) {
      onSend(trimmedValue)
      setValue('')
    }
  }, [value, isStreaming, disabled, onSend])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // CRITICAL: Check for IME composition state (CJK input)
    // This prevents premature sending when typing in languages like Chinese, Japanese, Korean
    if (e.nativeEvent.isComposing) {
      return // Let IME handle the key event
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleStop = useCallback(() => {
    onStop?.()
  }, [onStop])

  const isSendDisabled = !value.trim() || disabled

  return (
    <div className="flex flex-col p-4">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "AI is responding..." : placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            'flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2',
            'min-h-[40px] max-h-[120px] overflow-y-auto',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
            'disabled:bg-gray-100 disabled:cursor-not-allowed',
            'text-sm leading-relaxed'
          )}
        />
        {isStreaming && onStop ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleStop}
            disabled={!onStop}
            aria-label="Stop generation"
            className={cn("shrink-0", isStreaming && "animate-pulse")}
          >
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            type="button"
            size="icon"
            onClick={handleSubmit}
            disabled={isSendDisabled}
            aria-label="Send message"
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Keyboard hint */}
      <p className="text-xs text-gray-400 mt-2 text-center">
        {isStreaming ? (
          <span className="flex items-center justify-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating... Click <Square className="h-3 w-3 inline" /> to stop
          </span>
        ) : (
          <span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Enter</kbd>
            {" "}to send,{" "}
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">Shift+Enter</kbd>
            {" "}for new line
          </span>
        )}
      </p>
    </div>
  )
}
