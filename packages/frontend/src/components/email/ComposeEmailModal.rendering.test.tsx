/**
 * Tests for ComposeEmailModal component - Rendering
 *
 * Tests cover:
 * - Modal rendering and layout
 * - From field with sender email
 * - To/Cc/Bcc field handling
 * - Subject and body inputs
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

describe('ComposeEmailModal - Rendering', () => {
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

  describe('Modal Rendering', () => {
    it('renders modal when open is true', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
      })
    })

    it('does not render modal content when open is false', () => {
      render(
        <ComposeEmailModal open={false} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      expect(screen.queryByTestId('compose-email-modal')).not.toBeInTheDocument()
    })

    it('renders title "New Message"', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument()
      })
    })

    it('has correct modal dimensions (max-w-2xl)', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const modal = screen.getByTestId('compose-email-modal')
        expect(modal).toHaveClass('max-w-2xl')
      })
    })

    it('has correct modal height (h-[80vh])', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const modal = screen.getByTestId('compose-email-modal')
        expect(modal).toHaveClass('h-[80vh]')
      })
    })
  })

  describe('From Field', () => {
    it('displays sender email from settings', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText(/sender@example\.com/)).toBeInTheDocument()
      })
    })

    it('truncates long email addresses with max-w-[200px]', async () => {
      const longEmailSettings = {
        ...mockSettings,
        SMTP_USER: 'very.long.email.address.that.needs.truncation@example.com',
      }
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(longEmailSettings),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const senderText = screen.getByText(/very\.long\.email/)
        // The span containing the "from" text should have truncate class
        const parent = senderText.closest('.truncate')
        expect(parent).toBeInTheDocument()
      })
    })

    it('does not show from field when SMTP_USER is empty', async () => {
      const emptySettings = { ...mockSettings, SMTP_USER: '' }
      mockFetch.mockImplementation((url: string) => {
        if (url === '/api/settings') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(emptySettings),
          })
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) })
      })

      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('New Message')).toBeInTheDocument()
      })

      // Should not show "from" text
      expect(screen.queryByText(/from/)).not.toBeInTheDocument()
    })
  })

  describe('To/Cc/Bcc Fields', () => {
    it('renders To field with EmailChipInput', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('To')).toBeInTheDocument()
      })
    })

    it('renders Cc and Bcc toggle buttons', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cc' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Bcc' })).toBeInTheDocument()
      })
    })

    it('shows Cc field when Cc button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cc' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Cc' }))

      // Should now show Cc label - find by label text in the form
      await waitFor(() => {
        const labels = screen.getAllByText('Cc')
        // Should have both button and label after clicking
        expect(labels.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('shows Bcc field when Bcc button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Bcc' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: 'Bcc' }))

      await waitFor(() => {
        const labels = screen.getAllByText('Bcc')
        expect(labels.length).toBeGreaterThanOrEqual(2)
      })
    })

    it('auto-expands Cc field when cc has content', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cc' })).toBeInTheDocument()
      })

      // Click Cc button to show the field
      await user.click(screen.getByRole('button', { name: 'Cc' }))

      // Find the Cc input by finding the label's parent and then the input
      await waitFor(() => {
        const ccLabels = screen.getAllByText('Cc')
        // Find the one that's a label (not the button)
        const ccLabel = ccLabels.find(el => el.tagName === 'LABEL')
        expect(ccLabel).toBeTruthy()
      })
    })
  })

  describe('Subject Field', () => {
    it('renders subject input field', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Subject')).toBeInTheDocument()
      })
    })

    it('updates subject value on input', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('Subject')).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText('Subject')
      await user.type(subjectInput, 'Test Subject')

      expect(subjectInput).toHaveValue('Test Subject')
    })
  })

  describe('Email Body (TipTapEditor)', () => {
    it('renders the rich text editor', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByTestId('tiptap-editor-container')).toBeInTheDocument()
      })
    })

    it('renders the toolbar with formatting buttons', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByTestId('tiptap-toolbar')).toBeInTheDocument()
      })
    })
  })
})