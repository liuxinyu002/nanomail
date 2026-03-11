import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InboxPage } from './InboxPage'
import { EmailService } from '@/services'

// Mock sonner toast - must be defined before vi.mock
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()

// Mock services
vi.mock('@/services', () => ({
  EmailService: {
    getEmails: vi.fn(),
    processEmails: vi.fn(),
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}))

const mockGetEmails = vi.mocked(EmailService.getEmails)
const mockProcessEmails = vi.mocked(EmailService.processEmails)

// Helper to create wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('InboxPage', () => {
  beforeEach(() => {
    mockGetEmails.mockReset()
    mockProcessEmails.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
  })

  describe('Selection Counter', () => {
    it('should show selection count when emails are selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 2, sender: 'b@test.com', subject: 'B', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select first email by clicking the card
      const card = screen.getByText('A').closest('[data-testid="email-card"]')
      if (card) {
        await act(async () => {
          fireEvent.click(card)
        })
      }

      await waitFor(() => {
        expect(screen.getByText('1/5 emails selected')).toBeInTheDocument()
      })
    })

    it('should show maximum reached warning when 5 emails selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: '1@test.com', subject: 'E1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 2, sender: '2@test.com', subject: 'E2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 3, sender: '3@test.com', subject: 'E3', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 4, sender: '4@test.com', subject: 'E4', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 5, sender: '5@test.com', subject: 'E5', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 6, sender: '6@test.com', subject: 'E6', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 6, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument()
      })

      // Select 5 emails by clicking cards
      const subjects = ['E1', 'E2', 'E3', 'E4', 'E5']
      for (const subject of subjects) {
        const card = screen.getByText(subject).closest('[data-testid="email-card"]')
        if (card) {
          await act(async () => {
            fireEvent.click(card)
          })
        }
      }

      await waitFor(() => {
        expect(screen.getByText('(Maximum reached)')).toBeInTheDocument()
      })
    })
  })

  describe('Poka-yoke Selection Limit', () => {
    it('should disable unselected checkboxes when 5 are selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: '1@test.com', subject: 'E1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 2, sender: '2@test.com', subject: 'E2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 3, sender: '3@test.com', subject: 'E3', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 4, sender: '4@test.com', subject: 'E4', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 5, sender: '5@test.com', subject: 'E5', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 6, sender: '6@test.com', subject: 'E6', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 6, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument()
      })

      // Select 5 emails by clicking cards
      const subjects = ['E1', 'E2', 'E3', 'E4', 'E5']
      for (const subject of subjects) {
        const card = screen.getByText(subject).closest('[data-testid="email-card"]')
        if (card) {
          await act(async () => {
            fireEvent.click(card)
          })
        }
      }

      await waitFor(() => {
        // The 6th checkbox should be disabled
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes[5]).toBeDisabled()
      })
    })

    it('should allow deselecting when at max limit', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: '1@test.com', subject: 'E1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 2, sender: '2@test.com', subject: 'E2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 3, sender: '3@test.com', subject: 'E3', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 4, sender: '4@test.com', subject: 'E4', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 5, sender: '5@test.com', subject: 'E5', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 6, sender: '6@test.com', subject: 'E6', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 6, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument()
      })

      // Select 5 emails
      const subjects = ['E1', 'E2', 'E3', 'E4', 'E5']
      for (const subject of subjects) {
        const card = screen.getByText(subject).closest('[data-testid="email-card"]')
        if (card) {
          await act(async () => {
            fireEvent.click(card)
          })
        }
      }

      // Deselect first one
      const card1 = screen.getByText('E1').closest('[data-testid="email-card"]')
      if (card1) {
        await act(async () => {
          fireEvent.click(card1)
        })
      }

      await waitFor(() => {
        const checkboxes = screen.getAllByRole('checkbox')
        expect(checkboxes[0]).not.toBeChecked()
      })
    })
  })

  describe('Run AI Action Button', () => {
    it('should show floating action button when emails are selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Initially no button
      expect(screen.queryByRole('button', { name: /run ai/i })).not.toBeInTheDocument()

      // Select email by clicking the card
      const card = screen.getByText('A').closest('[data-testid="email-card"]')
      if (card) {
        await act(async () => {
          fireEvent.click(card)
        })
      }

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run ai/i })).toBeInTheDocument()
      })
    })

    it('should show processing state when clicked', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockProcessEmails.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select email
      const card = screen.getByText('A').closest('[data-testid="email-card"]')
      if (card) {
        await act(async () => {
          fireEvent.click(card)
        })
      }

      const button = await screen.findByRole('button', { name: /run ai/i })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /processing/i })).toBeInTheDocument()
      })
    })

    it('should call processEmails API and show success toast', async () => {
      mockGetEmails.mockResolvedValue({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
          { id: 2, sender: 'b@test.com', subject: 'B', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      })

      mockProcessEmails.mockResolvedValueOnce({
        success: true,
        queuedCount: 2,
        message: 'Queued 2 email(s) for processing',
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select both emails
      for (const subject of ['A', 'B']) {
        const card = screen.getByText(subject).closest('[data-testid="email-card"]')
        if (card) {
          await act(async () => {
            fireEvent.click(card)
          })
        }
      }

      const button = await screen.findByRole('button', { name: /run ai/i })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(mockProcessEmails).toHaveBeenCalledWith([1, 2])
        expect(mockToastSuccess).toHaveBeenCalledWith('Emails queued for processing')
      })
    })

    it('should show error toast on failure', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockProcessEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select email
      const card = screen.getByText('A').closest('[data-testid="email-card"]')
      if (card) {
        await act(async () => {
          fireEvent.click(card)
        })
      }

      const button = await screen.findByRole('button', { name: /run ai/i })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to process emails')
      })
    })

    it('should clear selection after processing', async () => {
      mockGetEmails.mockResolvedValue({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockProcessEmails.mockResolvedValueOnce({
        success: true,
        queuedCount: 1,
        message: 'Queued 1 email(s) for processing',
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select email
      const card = screen.getByText('A').closest('[data-testid="email-card"]')
      if (card) {
        await act(async () => {
          fireEvent.click(card)
        })
      }

      await waitFor(() => {
        expect(screen.getByRole('checkbox')).toBeChecked()
      })

      const button = screen.getByRole('button', { name: /run ai/i })
      await act(async () => {
        fireEvent.click(button)
      })

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /run ai/i })).not.toBeInTheDocument()
      })
    })
  })
})