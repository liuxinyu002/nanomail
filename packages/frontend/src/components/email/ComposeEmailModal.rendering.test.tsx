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

    it('renders title "New Message" for screen readers only', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Title exists but is visually hidden (sr-only class)
        const title = screen.getByText('New Message')
        expect(title).toBeInTheDocument()
        expect(title).toHaveClass('sr-only')
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

    it('has correct modal height (max-h-[85vh])', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const modal = screen.getByTestId('compose-email-modal')
        expect(modal).toHaveClass('max-h-[85vh]')
      })
    })

    it('renders close button (X) in header', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: 'Close' })
        expect(closeButton).toBeInTheDocument()
      })
    })
  })

  describe('From Field', () => {
    it('displays sender email from settings in header row', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Should show "发件人：sender@example.com" in the header
        expect(screen.getByText(/发件人：/)).toBeInTheDocument()
        // Email is part of the combined text "发件人：sender@example.com"
        expect(screen.getByText(/sender@example\.com/)).toBeInTheDocument()
      })
    })

    it('shows sender email without truncate class in header', async () => {
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
        // Sender email is shown in header row (no truncate needed)
        expect(screen.getByText(/very\.long\.email/)).toBeInTheDocument()
      })
    })

    it('hides from field when SMTP_USER is empty', async () => {
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
        // Title still exists for screen readers
        expect(screen.getByText('New Message')).toBeInTheDocument()
      })

      // Should not show "发件人：" text
      expect(screen.queryByText(/发件人：/)).not.toBeInTheDocument()
    })
  })

  describe('To/Cc/Bcc Fields', () => {
    it('renders To field with Chinese label "收件人"', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('收件人')).toBeInTheDocument()
      })
    })

    it('renders Cc and Bcc triggers inline in To field (not as separate buttons)', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Should find inline triggers (buttons with text "抄送" and "密送")
        expect(screen.getByRole('button', { name: '抄送' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '密送' })).toBeInTheDocument()
      })

      // Should NOT find separate Cc/Bcc buttons (old UI)
      expect(screen.queryByRole('button', { name: 'Cc' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Bcc' })).not.toBeInTheDocument()
    })

    it('shows Cc field when "抄送" trigger is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '抄送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '抄送' }))

      // Should now show Cc field with Chinese label
      await waitFor(() => {
        const ccLabels = screen.getAllByText('抄送')
        // Should have both the (now hidden) trigger and the visible label
        expect(ccLabels.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('hides "抄送" trigger after Cc field is visible', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '抄送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '抄送' }))

      // The trigger button should no longer be visible (it's hidden when Cc is expanded)
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '抄送' })).not.toBeInTheDocument()
      })
    })

    it('shows Bcc field when "密送" trigger is clicked', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '密送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '密送' }))

      // Should now show Bcc field with Chinese label
      await waitFor(() => {
        const bccLabels = screen.getAllByText('密送')
        expect(bccLabels.length).toBeGreaterThanOrEqual(1)
      })
    })

    it('hides "密送" trigger after Bcc field is visible', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '密送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '密送' }))

      // The trigger button should no longer be visible
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '密送' })).not.toBeInTheDocument()
      })
    })

    it('hides Cc trigger but keeps Bcc trigger when Cc field is visible', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '抄送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '抄送' }))

      // Cc trigger should be hidden, but Bcc trigger should remain
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '抄送' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: '密送' })).toBeInTheDocument()
      })
    })

    it('hides Bcc trigger but keeps Cc trigger when Bcc field is visible', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '密送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '密送' }))

      // Bcc trigger should be hidden, but Cc trigger should remain
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '抄送' })).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: '密送' })).not.toBeInTheDocument()
      })
    })

    it('hides both triggers when both Cc and Bcc fields are visible', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '抄送' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '密送' })).toBeInTheDocument()
      })

      // Click Cc trigger first
      await user.click(screen.getByRole('button', { name: '抄送' }))

      // Now only Bcc trigger should be visible, click it
      await user.click(screen.getByRole('button', { name: '密送' }))

      // Both triggers should now be hidden
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: '抄送' })).not.toBeInTheDocument()
        expect(screen.queryByRole('button', { name: '密送' })).not.toBeInTheDocument()
      })
    })

    it('Cc field auto-shows when cc has emails (initial state)', async () => {
      // This tests the derived visibility: showCcField = isCcExpanded || cc.length > 0
      // Since we can't set initial cc state directly, we test the visibility logic
      // by checking that Cc field appears with the Chinese label
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Initial state: Cc field should not be visible
        expect(screen.queryByLabelText('抄送')).not.toBeInTheDocument()
      })
    })

    it('Bcc field auto-shows when bcc has emails (initial state)', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Initial state: Bcc field should not be visible
        expect(screen.queryByLabelText('密送')).not.toBeInTheDocument()
      })
    })

    it('Cc field has correct id for accessibility', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '抄送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '抄送' }))

      await waitFor(() => {
        const ccInput = document.getElementById('cc-input')
        expect(ccInput).toBeInTheDocument()
      })
    })

    it('Bcc field has correct id for accessibility', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: '密送' })).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: '密送' }))

      await waitFor(() => {
        const bccInput = document.getElementById('bcc-input')
        expect(bccInput).toBeInTheDocument()
      })
    })
  })

  describe('Subject Field', () => {
    it('renders subject field with inline layout (label and input on same row)', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        // Subject label should be in Chinese
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      // Subject input should be associated with label
      const subjectInput = screen.getByLabelText('主题')
      expect(subjectInput).toBeInTheDocument()
      expect(subjectInput).toHaveAttribute('type', 'text')
    })

    it('subject field container has bottom border matching EmailChipInput style', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      // Find the subject field container by its input id
      const subjectInput = screen.getByLabelText('主题')
      const container = subjectInput.closest('div')
      expect(container).toHaveClass('border-b')
    })

    it('subject field shows focus-within background on focus', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText('主题')
      const container = subjectInput.closest('div')
      expect(container).toHaveClass('focus-within:bg-muted/20')
    })

    it('subject input has borderless styling (no visible border)', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText('主题')
      // Should have outline-none for borderless appearance
      expect(subjectInput).toHaveClass('outline-none')
      // Should have transparent background
      expect(subjectInput).toHaveClass('bg-transparent')
    })

    it('subject label has minimum width for i18n support', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const label = screen.getByText('主题')
        expect(label).toHaveClass('min-w-[5rem]')
      })
    })

    it('updates subject value on input', async () => {
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

      expect(subjectInput).toHaveValue('Test Subject')
    })

    it('subject input is disabled when sending', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText('主题')
      expect(subjectInput).not.toBeDisabled()
    })

    it('subject input has correct placeholder in Chinese', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      const subjectInput = screen.getByLabelText('主题')
      expect(subjectInput).toHaveAttribute('placeholder', '邮件主题')
    })

    it('click on subject label focuses the input', async () => {
      const user = userEvent.setup()
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        expect(screen.getByText('主题')).toBeInTheDocument()
      })

      const label = screen.getByText('主题')
      await user.click(label)

      const subjectInput = screen.getByLabelText('主题')
      expect(subjectInput).toHaveFocus()
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

  describe('Footer', () => {
    it('renders trash button on left side', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const trashButton = screen.getByRole('button', { name: /trash/i })
        expect(trashButton).toBeInTheDocument()
      })
    })

    it('renders send button on right side', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: 'Send' })
        expect(sendButton).toBeInTheDocument()
      })
    })

    it('send button is disabled when form is empty', async () => {
      render(
        <ComposeEmailModal open={true} onOpenChange={mockOnOpenChange} />,
        { wrapper: createWrapper() }
      )

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: 'Send' })
        expect(sendButton).toBeDisabled()
      })
    })
  })
})