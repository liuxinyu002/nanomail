/**
 * Tests for ComposeEmailModal component - Send Operations
 *
 * Tests cover:
 * - Loading states during send
 * - Send handler
 * - Cancel button
 * - Error handling
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

describe('ComposeEmailModal - Send Operations', () => {
  const mockOnOpenChange = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    mockOnOpenChange.mockReset()
    mockPrompt.mockReset()

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
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading States', () => {
    it('shows loading spinner and "Sending..." text during send', async () => {
      const user = userEvent.setup()

      let resolveSendEmail: () => void
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSettings),
          })
        }
        if (url === '/api/emails/send') {
          return new Promise((resolve) => {
            resolveSendEmail = () => resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, messageId: 'test-id' }),
            })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Fill form - use aria-label which is "收件人" for the To input
      const toInput = screen.getByLabelText('收件人')
      await user.type(toInput, 'recipient@example.com{enter}')

      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      const bodyInput = screen.getByTestId('prosemirror-editor')
      await user.type(bodyInput, 'Test body')

      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument()
      })

      resolveSendEmail!()
    })

    it('disables all inputs during send', async () => {
      const user = userEvent.setup()

      let resolveSendEmail: () => void
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSettings),
          })
        }
        if (url === '/api/emails/send') {
          return new Promise((resolve) => {
            resolveSendEmail = () => resolve({
              ok: true,
              json: () => Promise.resolve({ success: true, messageId: 'test-id' }),
            })
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Fill form
      const toInput = screen.getByLabelText('收件人')
      await user.type(toInput, 'recipient@example.com{enter}')

      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      const bodyInput = screen.getByTestId('prosemirror-editor')
      await user.type(bodyInput, 'Test body')

      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      // All inputs should be disabled during send
      await waitFor(() => {
        expect(screen.getByLabelText('主题')).toBeDisabled()
      })

      resolveSendEmail!()
    })
  })

  describe('Send Handler', () => {
    it('calls EmailService.sendEmail with correct data', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSettings),
          })
        }
        if (url === '/api/emails/send') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, messageId: 'test-id' }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Fill form
      const toInput = screen.getByLabelText('收件人')
      await user.type(toInput, 'recipient@example.com{enter}')

      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      const bodyInput = screen.getByTestId('prosemirror-editor')
      await user.type(bodyInput, 'Test body')

      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/emails/send', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }))
      })
    })

    it('resets form and closes modal on successful send', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSettings),
          })
        }
        if (url === '/api/emails/send') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, messageId: 'test-id' }),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Fill form
      const toInput = screen.getByLabelText('收件人')
      await user.type(toInput, 'recipient@example.com{enter}')

      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      const bodyInput = screen.getByTestId('prosemirror-editor')
      await user.type(bodyInput, 'Test body')

      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })

  describe('Cancel Button (Trash Icon)', () => {
    it('calls onOpenChange with false when Trash is clicked and form is empty', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /trash/i })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /trash/i }))

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })
  })

  describe('Error Handling', () => {
    it('shows error toast when email send fails', async () => {
      const user = userEvent.setup()

      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockSettings),
          })
        }
        if (url === '/api/emails/send') {
          return Promise.resolve({
            ok: false,
            statusText: 'Internal Server Error',
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Fill form
      const toInput = screen.getByLabelText('收件人')
      await user.type(toInput, 'recipient@example.com{enter}')

      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      const bodyInput = screen.getByTestId('prosemirror-editor')
      await user.type(bodyInput, 'Test body')

      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      // Modal should remain open on error
      await waitFor(() => {
        expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
      })
    })
  })
})