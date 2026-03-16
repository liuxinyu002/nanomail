/**
 * Tests for ComposeEmailModal component - AI Assist Integration
 *
 * Tests cover:
 * - New props: emailId, initialInstruction, sender
 * - Instruction input section
 * - AI status indicator
 * - Editor lock during AI drafting
 * - Generate/Stop button behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ComposeEmailModal } from './ComposeEmailModal'
import type { SettingsForm } from '@nanomail/shared'

// Mock TipTapEditor component to avoid jsdom issues with ProseMirror
vi.mock('./TipTapEditor', () => ({
  TipTapEditor: ({ onChange, disabled }: { onChange: (html: string, isEmpty: boolean) => void; disabled: boolean }) => (
    <div
      data-testid="tiptap-editor-container"
      className="rounded-md border focus-within:ring-1 focus-within:ring-ring"
    >
      <div
        data-testid="tiptap-toolbar"
        className="sticky top-0 z-20 bg-background border-b p-2 flex flex-wrap gap-1"
      >
        <button type="button" aria-label="Bold" disabled={disabled}>B</button>
      </div>
      <div
        data-testid="editor-content"
        className="min-h-[200px] max-h-[400px] overflow-y-auto p-3 prose prose-sm max-w-none"
      >
        <textarea
          data-testid="prosemirror-editor"
          role="textbox"
          disabled={disabled}
          onChange={(e) => {
            const isEmpty = e.target.value === ''
            onChange(e.target.value, isEmpty)
          }}
        />
      </div>
    </div>
  ),
}))

// Mock useAIAssistStream hook
const mockStart = vi.fn()
const mockCancel = vi.fn()
const mockReset = vi.fn()

vi.mock('@/hooks/useAIAssistStream', () => ({
  useAIAssistStream: vi.fn(() => ({
    thoughts: [],
    isStreaming: false,
    status: 'idle',
    error: null,
    start: mockStart,
    cancel: mockCancel,
    reset: mockReset,
  })),
}))

import { useAIAssistStream } from '@/hooks/useAIAssistStream'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock window.prompt for TipTap link insertion
const mockPrompt = vi.fn()
vi.stubGlobal('prompt', mockPrompt)

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )
  }
}

// Mock settings response
const mockSettings: SettingsForm = {
  PROTOCOL_TYPE: 'IMAP',
  IMAP_HOST: 'imap.example.com',
  IMAP_PORT: '993',
  IMAP_USER: 'user@example.com',
  IMAP_PASS: 'password123',
  POP3_HOST: '',
  POP3_PORT: '',
  POP3_USER: '',
  POP3_PASS: '',
  SMTP_HOST: 'smtp.example.com',
  SMTP_PORT: '587',
  SMTP_USER: 'sender@example.com',
  SMTP_PASS: 'password123',
  LLM_API_KEY: 'sk-test-key',
  LLM_MODEL: 'gpt-4',
  LLM_BASE_URL: 'https://api.openai.com/v1',
}

describe('ComposeEmailModal - AI Assist Integration', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    mockOnOpenChange.mockReset()
    mockPrompt.mockReset()
    mockStart.mockReset()
    mockCancel.mockReset()
    mockReset.mockReset()

    // Default settings response
    mockFetch.mockImplementation((url: string) => {
      if (url === '/api/settings') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockSettings),
        })
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
    })

    // Default mock for useAIAssistStream
    vi.mocked(useAIAssistStream).mockReturnValue({
      thoughts: [],
      isStreaming: false,
      status: 'idle',
      error: null,
      start: mockStart,
      cancel: mockCancel,
      reset: mockReset,
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('New Props', () => {
    describe('sender prop', () => {
      it('should auto-fill To field with sender prop', async () => {
        render(
          <ComposeEmailModal
            open={true}
            onOpenChange={mockOnOpenChange}
            sender="test@example.com"
          />,
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
        })

        // Check that To field has the sender email pre-filled
        // The EmailChipInput should display the sender as a chip
        await waitFor(() => {
          const toInput = document.getElementById('to-input')
          expect(toInput).toBeInTheDocument()
        })

        // The sender should be visible as a chip in the To field
        await waitFor(() => {
          expect(screen.getByText('test@example.com')).toBeInTheDocument()
        })
      })

      it('should not auto-fill To field when sender is not provided', async () => {
        render(
          <ComposeEmailModal
            open={true}
            onOpenChange={mockOnOpenChange}
          />,
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
        })

        // To field should be empty (no chips)
        expect(screen.queryByText('@example.com')).not.toBeInTheDocument()
      })
    })

    describe('initialInstruction prop', () => {
      it('should pre-fill instruction textarea with initialInstruction prop', async () => {
        render(
          <ComposeEmailModal
            open={true}
            onOpenChange={mockOnOpenChange}
            emailId={123}
            initialInstruction="Reply about meeting"
          />,
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/describe what you want/i)).toHaveValue('Reply about meeting')
        })
      })

      it('should show empty instruction textarea when initialInstruction is not provided', async () => {
        render(
          <ComposeEmailModal
            open={true}
            onOpenChange={mockOnOpenChange}
            emailId={123}
          />,
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/describe what you want/i)).toHaveValue('')
        })
      })
    })

    describe('emailId prop', () => {
      it('should not show AI assist UI when emailId is not provided', async () => {
        render(
          <ComposeEmailModal
            open={true}
            onOpenChange={mockOnOpenChange}
          />,
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
        })

        // Should NOT find instruction input when emailId is not provided
        expect(screen.queryByPlaceholderText(/describe what you want/i)).not.toBeInTheDocument()
      })

      it('should show AI assist UI when emailId is provided', async () => {
        render(
          <ComposeEmailModal
            open={true}
            onOpenChange={mockOnOpenChange}
            emailId={123}
          />,
          { wrapper: createWrapper() }
        )

        await waitFor(() => {
          expect(screen.getByPlaceholderText(/describe what you want/i)).toBeInTheDocument()
        })
      })
    })
  })

  describe('Instruction Input Section', () => {
    it('should render instruction textarea with placeholder', async () => {
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/describe what you want/i)).toBeInTheDocument()
      })
    })

    it('should render Generate button when not streaming', async () => {
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
      })
    })

    it('should update instruction value when typing', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText(/describe what you want/i)).toBeInTheDocument()
      })

      const textarea = screen.getByPlaceholderText(/describe what you want/i)
      await user.type(textarea, 'Write a polite reply')

      expect(textarea).toHaveValue('Write a polite reply')
    })

    it('should call start when Generate button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /generate/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /generate/i }))

      expect(mockStart).toHaveBeenCalled()
    })
  })

  describe('AI Status Indicator', () => {
    it('should show "AI is thinking" when status is thinking', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: true,
        status: 'thinking',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/AI 正在分析/i)).toBeInTheDocument()
      })
    })

    it('should not show "AI is thinking" when status is idle', async () => {
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
      })

      expect(screen.queryByText(/AI 正在分析/i)).not.toBeInTheDocument()
    })
  })

  describe('Stop Generation Button', () => {
    it('should switch Generate button to Stop when streaming', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: true,
        status: 'drafting',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
      })

      expect(screen.queryByRole('button', { name: /generate/i })).not.toBeInTheDocument()
    })

    it('should call cancel when Stop button is clicked', async () => {
      const user = userEvent.setup()

      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: true,
        status: 'drafting',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /stop/i }))

      expect(mockCancel).toHaveBeenCalled()
    })

    it('should have destructive variant on Stop button', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: true,
        status: 'drafting',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const stopButton = screen.getByRole('button', { name: /stop/i })
        expect(stopButton).toHaveClass('bg-destructive')
      })
    })
  })

  describe('Editor Lock During AI Drafting', () => {
    it('should disable editor when status is drafting', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: true,
        status: 'drafting',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const editor = screen.getByTestId('prosemirror-editor')
        expect(editor).toBeDisabled()
      })
    })

    it('should enable editor when status is idle', async () => {
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const editor = screen.getByTestId('prosemirror-editor')
        expect(editor).not.toBeDisabled()
      })
    })

    it('should enable editor when status is done', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: false,
        status: 'done',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const editor = screen.getByTestId('prosemirror-editor')
        expect(editor).not.toBeDisabled()
      })
    })

    it('should enable editor when status is error', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: false,
        status: 'error',
        error: 'Something went wrong',
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const editor = screen.getByTestId('prosemirror-editor')
        expect(editor).not.toBeDisabled()
      })
    })
  })

  describe('Instruction Textarea Disabled State', () => {
    it('should disable instruction textarea when streaming', async () => {
      vi.mocked(useAIAssistStream).mockReturnValue({
        thoughts: [],
        isStreaming: true,
        status: 'drafting',
        error: null,
        start: mockStart,
        cancel: mockCancel,
        reset: mockReset,
      })

      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/describe what you want/i)
        expect(textarea).toBeDisabled()
      })
    })

    it('should enable instruction textarea when not streaming', async () => {
      render(
        <ComposeEmailModal
          open={true}
          onOpenChange={mockOnOpenChange}
          emailId={123}
        />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const textarea = screen.getByPlaceholderText(/describe what you want/i)
        expect(textarea).not.toBeDisabled()
      })
    })
  })
})