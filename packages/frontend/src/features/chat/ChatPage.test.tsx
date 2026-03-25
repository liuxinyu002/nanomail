import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPage } from './ChatPage'
import type { UIMessage } from '@/hooks/useChat'

// Mock useChat hook
vi.mock('@/hooks/useChat', () => ({
  useChat: vi.fn(),
}))

// Mock MessageList component
vi.mock('./MessageList', () => ({
  MessageList: vi.fn(({ messages, isStreaming }) => (
    <div data-testid="message-list" data-messages={JSON.stringify(messages)} data-streaming={isStreaming}>
      MessageList Mock ({messages.length} messages)
    </div>
  )),
}))

// Import after mocks
import { useChat } from '@/hooks/useChat'
import { MessageList } from './MessageList'

const mockUseChat = vi.mocked(useChat)
const mockMessageList = vi.mocked(MessageList)

describe('ChatPage', () => {
  const mockSendMessage = vi.fn()
  const mockStopGeneration = vi.fn()
  const mockClearSession = vi.fn()

  const defaultChatState = {
    messages: [] as UIMessage[],
    isStreaming: false,
    error: null as string | null,
    sendMessage: mockSendMessage,
    stopGeneration: mockStopGeneration,
    clearSession: mockClearSession,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseChat.mockReturnValue(defaultChatState)
  })

  describe('rendering', () => {
    it('should render header with title', () => {
      render(<ChatPage />)

      expect(screen.getByText('AI Assistant')).toBeInTheDocument()
    })

    it('should render MessageList component', () => {
      render(<ChatPage />)

      expect(screen.getByTestId('message-list')).toBeInTheDocument()
    })

    it('should render ChatInput component', () => {
      render(<ChatPage />)

      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument()
    })

    it('should have correct layout structure', () => {
      const { container } = render(<ChatPage />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer).toHaveClass('flex', 'flex-col', 'h-full')
    })
  })

  describe('Clear button', () => {
    it('should not show Clear button when no messages', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [],
      })

      render(<ChatPage />)

      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })

    it('should show Clear button when messages exist', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        ],
      })

      render(<ChatPage />)

      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should call clearSession when Clear button clicked', async () => {
      const user = userEvent.setup()
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages: [
          { id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        ],
      })

      render(<ChatPage />)

      const clearButton = screen.getByRole('button', { name: /clear/i })
      await user.click(clearButton)

      expect(mockClearSession).toHaveBeenCalled()
    })
  })

  describe('useChat integration', () => {
    it('should pass messages to MessageList', () => {
      const messages: UIMessage[] = [
        { id: '1', role: 'user', content: 'Hello', timestamp: '2024-01-01T00:00:00.000Z' },
        { id: '2', role: 'assistant', content: 'Hi there!', timestamp: '2024-01-01T00:00:01.000Z' },
      ]

      mockUseChat.mockReturnValue({
        ...defaultChatState,
        messages,
      })

      render(<ChatPage />)

      expect(mockMessageList).toHaveBeenCalledWith(
        expect.objectContaining({ messages }),
        undefined
      )
    })

    it('should pass isStreaming to MessageList', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isStreaming: true,
      })

      render(<ChatPage />)

      expect(mockMessageList).toHaveBeenCalledWith(
        expect.objectContaining({ isStreaming: true }),
        undefined
      )
    })

    it('should pass isStreaming to ChatInput', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isStreaming: true,
        stopGeneration: mockStopGeneration,
      })

      render(<ChatPage />)

      // ChatInput should show Stop button when streaming
      expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
    })

    it('should call sendMessage when ChatInput sends message', async () => {
      const user = userEvent.setup()
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        sendMessage: mockSendMessage,
      })

      render(<ChatPage />)

      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello{Enter}')

      expect(mockSendMessage).toHaveBeenCalledWith('Hello')
    })

    it('should call stopGeneration when ChatInput stops generation', async () => {
      const user = userEvent.setup()
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        isStreaming: true,
        stopGeneration: mockStopGeneration,
      })

      render(<ChatPage />)

      const stopButton = screen.getByRole('button', { name: /stop/i })
      await user.click(stopButton)

      expect(mockStopGeneration).toHaveBeenCalled()
    })
  })

  describe('error display', () => {
    it('should display error when present', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        error: 'Something went wrong',
      })

      render(<ChatPage />)

      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    })

    it('should not display error when null', () => {
      mockUseChat.mockReturnValue({
        ...defaultChatState,
        error: null,
      })

      render(<ChatPage />)

      // No error message should be displayed
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper heading structure', () => {
      render(<ChatPage />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveTextContent('AI Assistant')
    })

    it('should have accessible textarea', () => {
      render(<ChatPage />)

      const textarea = screen.getByRole('textbox')
      expect(textarea).toBeInTheDocument()
    })
  })

  describe('layout', () => {
    it('should have scrollable message area', () => {
      const { container } = render(<ChatPage />)

      // MessageList container should be flex-1 and scrollable
      const messageListContainer = container.querySelector('.flex-1.overflow-y-auto')
      expect(messageListContainer).toBeInTheDocument()
    })

    it('should have ChatInput fixed at bottom', () => {
      const { container } = render(<ChatPage />)

      // ChatInput container should have border-t for separation
      const chatInputContainer = container.querySelector('.border-t')
      expect(chatInputContainer).toBeInTheDocument()
    })
  })
})
