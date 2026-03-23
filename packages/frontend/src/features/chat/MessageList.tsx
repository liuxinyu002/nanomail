import { useEffect, useRef, useCallback } from 'react'
import type { UIMessage } from '@/hooks/useChat'
import { MessageItem } from './MessageItem'
import { Sparkles } from 'lucide-react'

const SCROLL_THRESHOLD = 100  // px from bottom to consider "near bottom"

interface MessageListProps {
  messages: UIMessage[]
  isStreaming: boolean
  onTodoUpdate?: () => void
}

export function MessageList({ messages, isStreaming, onTodoUpdate }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)  // Track if user is near bottom

  // Check if user is near bottom of scroll container
  const checkIsNearBottom = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return true

    const { scrollTop, scrollHeight, clientHeight } = container
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight
    return distanceFromBottom <= SCROLL_THRESHOLD
  }, [])

  // Update isNearBottom when user scrolls
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      isNearBottomRef.current = checkIsNearBottom()
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [checkIsNearBottom])

  // Smart auto-scroll using ResizeObserver with isNearBottom check
  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    const observer = new ResizeObserver(() => {
      // Only auto-scroll if user is near bottom
      if (isNearBottomRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }
    })

    observer.observe(content)
    return () => observer.disconnect()
  }, [])

  // When new message is added, scroll to bottom if near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages.length])

  // When streaming starts, ensure we're at bottom
  useEffect(() => {
    if (isStreaming) {
      isNearBottomRef.current = true
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [isStreaming])

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div ref={contentRef} className="max-w-3xl mx-auto px-4 divide-y divide-gray-100">
          {messages.map(msg => (
            <MessageItem
              key={msg.id}
              message={msg}
              isStreaming={isStreaming && msg.role === 'assistant' && !msg.content}
              onTodoUpdate={onTodoUpdate}
            />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-gray-500">
      <Sparkles className="h-12 w-12 mb-4 text-gray-300" />
      <h2 className="text-lg font-medium mb-2">How can I help you today?</h2>
      <p className="text-sm text-gray-400">Ask me to create, update, or search your todos.</p>
    </div>
  )
}
