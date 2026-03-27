import { useEffect, useRef, useCallback } from 'react'
import type { UIMessage } from '@/hooks/useChat'
import { MessageItem } from './MessageItem'
import { CoffeeIcon } from '@/components/icons'

const SCROLL_THRESHOLD = 100  // px from bottom to consider "near bottom"

interface MessageListProps {
  messages: UIMessage[]
  isStreaming: boolean
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
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
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto h-full">
      {messages.length === 0 ? (
        <EmptyState />
      ) : (
        <div ref={contentRef} className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex flex-col gap-8">
            {messages
              .filter(msg => msg.role !== 'tool')  // Tool messages are for context only, not display
              .map(msg => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  isStreaming={isStreaming && msg.role === 'assistant' && !msg.content}
                />
              ))}
          </div>
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center h-full text-gray-500">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-600/10 mb-4">
        <CoffeeIcon className="h-8 w-8" />
      </div>
      <h2 className="text-lg font-medium mb-2">How can I help you today?</h2>
      <p className="text-sm text-gray-400">Ask me to create, update, or search your todos.</p>
    </div>
  )
}
