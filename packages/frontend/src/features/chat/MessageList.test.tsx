import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from './MessageList'
import type { UIMessage } from '@/hooks/useChat'

// Mock MessageItem component
vi.mock('./MessageItem', () => ({
  MessageItem: vi.fn(({ message, isStreaming, onTodoUpdate }) => (
    <div
      data-testid={`message-item-${message.id}`}
      data-is-streaming={isStreaming}
      data-has-todo-update={!!onTodoUpdate}
    >
      {message.content || 'empty-content'}
    </div>
  )),
}))

// Helper to create a UIMessage for testing
function createUIMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    role: 'user',
    content: 'Test message content',
    timestamp: new Date().toISOString(),
    ...overrides,
  }
}

describe('MessageList', () => {
  describe('empty state', () => {
    it('should render empty state when no messages', () => {
      render(<MessageList messages={[]} isStreaming={false} />)

      expect(screen.getByText('How can I help you today?')).toBeInTheDocument()
      expect(screen.getByText('Ask me to create, update, or search your todos.')).toBeInTheDocument()
    })

    it('should render Sparkles icon in empty state', () => {
      const { container } = render(<MessageList messages={[]} isStreaming={false} />)

      // Sparkles icon should be present in empty state
      const sparklesIcon = container.querySelector('svg')
      expect(sparklesIcon).toBeInTheDocument()
    })
  })

  describe('rendering messages', () => {
    it('should render list of messages', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'msg-1', content: 'Hello' }),
        createUIMessage({ id: 'msg-2', content: 'World' }),
      ]

      render(<MessageList messages={messages} isStreaming={false} />)

      expect(screen.getByTestId('message-item-msg-1')).toBeInTheDocument()
      expect(screen.getByTestId('message-item-msg-2')).toBeInTheDocument()
    })

    it('should render single message', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'msg-single', content: 'Single message' }),
      ]

      render(<MessageList messages={messages} isStreaming={false} />)

      expect(screen.getByTestId('message-item-msg-single')).toBeInTheDocument()
      expect(screen.getByText('Single message')).toBeInTheDocument()
    })

    it('should not render empty state when messages exist', () => {
      const messages: UIMessage[] = [createUIMessage()]

      render(<MessageList messages={messages} isStreaming={false} />)

      expect(screen.queryByText('How can I help you today?')).not.toBeInTheDocument()
    })

    it('should render messages in order', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'first', content: 'First message' }),
        createUIMessage({ id: 'second', content: 'Second message' }),
        createUIMessage({ id: 'third', content: 'Third message' }),
      ]

      render(<MessageList messages={messages} isStreaming={false} />)

      const messageItems = screen.getAllByTestId(/message-item-/)
      expect(messageItems[0]).toHaveAttribute('data-testid', 'message-item-first')
      expect(messageItems[1]).toHaveAttribute('data-testid', 'message-item-second')
      expect(messageItems[2]).toHaveAttribute('data-testid', 'message-item-third')
    })
  })

  describe('isStreaming prop', () => {
    it('should pass isStreaming=false to MessageItem when not streaming', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'msg-1', role: 'assistant', content: 'Response' }),
      ]

      render(<MessageList messages={messages} isStreaming={false} />)

      const messageItem = screen.getByTestId('message-item-msg-1')
      expect(messageItem).toHaveAttribute('data-is-streaming', 'false')
    })

    it('should pass isStreaming=true to assistant message with empty content when streaming', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'msg-streaming', role: 'assistant', content: '' }),
      ]

      render(<MessageList messages={messages} isStreaming={true} />)

      const messageItem = screen.getByTestId('message-item-msg-streaming')
      expect(messageItem).toHaveAttribute('data-is-streaming', 'true')
    })

    it('should pass isStreaming=false to assistant message with content even when streaming', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'msg-with-content', role: 'assistant', content: 'Some content' }),
      ]

      render(<MessageList messages={messages} isStreaming={true} />)

      const messageItem = screen.getByTestId('message-item-msg-with-content')
      expect(messageItem).toHaveAttribute('data-is-streaming', 'false')
    })

    it('should pass isStreaming=false to user messages even when streaming', () => {
      const messages: UIMessage[] = [
        createUIMessage({ id: 'msg-user', role: 'user', content: '' }),
      ]

      render(<MessageList messages={messages} isStreaming={true} />)

      const messageItem = screen.getByTestId('message-item-msg-user')
      expect(messageItem).toHaveAttribute('data-is-streaming', 'false')
    })
  })

  describe('onTodoUpdate callback', () => {
    it('should pass onTodoUpdate callback to MessageItem', () => {
      const onTodoUpdate = vi.fn()
      const messages: UIMessage[] = [createUIMessage({ id: 'msg-1' })]

      render(<MessageList messages={messages} isStreaming={false} onTodoUpdate={onTodoUpdate} />)

      const messageItem = screen.getByTestId('message-item-msg-1')
      expect(messageItem).toHaveAttribute('data-has-todo-update', 'true')
    })

    it('should not pass onTodoUpdate when undefined', () => {
      const messages: UIMessage[] = [createUIMessage({ id: 'msg-1' })]

      render(<MessageList messages={messages} isStreaming={false} />)

      const messageItem = screen.getByTestId('message-item-msg-1')
      expect(messageItem).toHaveAttribute('data-has-todo-update', 'false')
    })
  })

  describe('scroll container structure', () => {
    it('should have scroll container with overflow-y-auto class', () => {
      const { container } = render(<MessageList messages={[]} isStreaming={false} />)

      const scrollContainer = container.querySelector('.overflow-y-auto')
      expect(scrollContainer).toBeInTheDocument()
      expect(scrollContainer).toHaveClass('flex-1')
    })

    it('should have content wrapper with correct classes when messages exist', () => {
      const messages: UIMessage[] = [createUIMessage()]
      const { container } = render(<MessageList messages={messages} isStreaming={false} />)

      const contentWrapper = container.querySelector('.max-w-3xl')
      expect(contentWrapper).toBeInTheDocument()
      expect(contentWrapper).toHaveClass('mx-auto', 'px-4', 'divide-y', 'divide-gray-100')
    })

    it('should have bottom ref div for scrolling', () => {
      const messages: UIMessage[] = [createUIMessage()]
      const { container } = render(<MessageList messages={messages} isStreaming={false} />)

      // The bottom ref div should be the last child in the content wrapper
      const contentWrapper = container.querySelector('.max-w-3xl')
      const lastChild = contentWrapper?.lastElementChild
      expect(lastChild).toBeEmptyDOMElement()
    })
  })

  describe('messages with tool calls', () => {
    it('should render messages with tool calls', () => {
      const messages: UIMessage[] = [
        createUIMessage({
          id: 'msg-tools',
          content: 'Creating todo...',
          toolCalls: [
            {
              id: 'tc-1',
              toolName: 'createTodo',
              status: 'success',
              message: 'Todo created',
            },
          ],
        }),
      ]

      render(<MessageList messages={messages} isStreaming={false} />)

      expect(screen.getByTestId('message-item-msg-tools')).toBeInTheDocument()
    })
  })
})
