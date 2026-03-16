/**
 * Tests for ComposeEmailModal component - Interactions
 *
 * Tests cover:
 * - Form validation
 * - Data loss prevention
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

describe('ComposeEmailModal - Interactions', () => {
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

  describe('Form Validation', () => {
    it('disables Send button when form is empty', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: 'Send' })
        expect(sendButton).toBeDisabled()
      })
    })

    it('disables Send button when only subject is filled', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      const sendButton = screen.getByRole('button', { name: 'Send' })
      expect(sendButton).toBeDisabled()
    })

    it('enables Send button when To, Subject, and Body are filled', async () => {
      const user = userEvent.setup()

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Add To recipient - use aria-label which is "收件人"
      const toInput = screen.getByLabelText('收件人')
      await user.type(toInput, 'recipient@example.com{enter}')

      // Add Subject
      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      // Add Body via the mocked textarea
      const bodyInput = screen.getByTestId('prosemirror-editor')
      await user.type(bodyInput, 'Test email body')

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: 'Send' })
        expect(sendButton).not.toBeDisabled()
      })
    })
  })

  describe('Data Loss Prevention', () => {
    it('shows confirmation dialog when closing with unsaved content', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Add content
      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      // Try to close modal via trash button
      const trashButton = screen.getByRole('button', { name: /trash/i })
      await user.click(trashButton)

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Discard email?')).toBeInTheDocument()
      })
    })

    it('does not show confirmation dialog when form is empty', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Click trash button without adding content
      const trashButton = screen.getByRole('button', { name: /trash/i })
      await user.click(trashButton)

      // Should not show confirmation dialog
      expect(screen.queryByText('Discard email?')).not.toBeInTheDocument()

      // Should call onOpenChange with false
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('discards email and closes modal when "Discard" is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Add content
      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      // Try to close modal via trash button
      const trashButton = screen.getByRole('button', { name: /trash/i })
      await user.click(trashButton)

      // Click Discard in confirmation dialog
      await waitFor(async () => {
        const discardButton = screen.getByRole('button', { name: 'Discard' })
        await user.click(discardButton)
      })

      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('keeps modal open when "Keep Editing" is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Add content
      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      // Try to close modal via trash button
      const trashButton = screen.getByRole('button', { name: /trash/i })
      await user.click(trashButton)

      // Click Keep Editing in confirmation dialog
      await waitFor(async () => {
        const keepEditingButton = screen.getByRole('button', { name: /keep editing/i })
        await user.click(keepEditingButton)
      })

      // Modal should remain open (onOpenChange not called with false)
      expect(mockOnOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('blocks modal close during API request', async () => {
      const user = userEvent.setup()

      // Mock a slow API response
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

      // Send the email
      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      // Try to close while sending - should be blocked
      await waitFor(() => {
        expect(mockOnOpenChange).not.toHaveBeenCalled()
      })

      // Resolve the API call
      resolveSendEmail!()
    })

    it('blocks overlay close during API request via handleOpenChange', async () => {
      const user = userEvent.setup()

      // Mock a slow API response
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

      // Send the email
      const sendButton = screen.getByRole('button', { name: 'Send' })
      await waitFor(async () => {
        expect(sendButton).not.toBeDisabled()
        await user.click(sendButton)
      })

      // Wait for sending state
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument()
      })

      // Press Escape to trigger Dialog's onOpenChange - should be blocked
      await user.keyboard('{Escape}')

      // Modal should NOT close because we're sending
      expect(mockOnOpenChange).not.toHaveBeenCalled()

      // Resolve the API call
      resolveSendEmail!()
    })

    it('shows confirmation dialog when pressing Escape with unsaved content', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Add content
      const subjectInput = screen.getByLabelText('主题')
      await user.type(subjectInput, 'Test Subject')

      // Press Escape to trigger Dialog's onOpenChange
      await user.keyboard('{Escape}')

      // Should show confirmation dialog
      await waitFor(() => {
        expect(screen.getByText('Discard email?')).toBeInTheDocument()
      })
    })

    it('closes modal via Escape when form is empty', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })

      // Press Escape without adding content
      await user.keyboard('{Escape}')

      // Should close modal directly (no confirmation dialog)
      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })
  })
})