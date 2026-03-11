import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { InboxList } from './InboxList'
import { EmailService } from '@/services'

// Mock EmailService
vi.mock('@/services', () => ({
  EmailService: {
    getEmails: vi.fn(),
  },
}))

const mockGetEmails = vi.mocked(EmailService.getEmails)

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

describe('InboxList', () => {
  beforeEach(() => {
    mockGetEmails.mockReset()
  })

  describe('Loading State', () => {
    it('should show loading skeleton while fetching', () => {
      mockGetEmails.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<InboxList />, { wrapper: createWrapper() })

      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no emails', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })

      render(<InboxList />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/your inbox is clear/i)).toBeInTheDocument()
      })
    })

    it('should show inbox icon in empty state', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })

      render(<InboxList />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByTestId('inbox-icon')).toBeInTheDocument()
      })
    })
  })

  describe('Email List', () => {
    it('should render list of emails', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          {
            id: 1,
            sender: 'test1@example.com',
            subject: 'Email 1',
            snippet: 'Snippet 1',
            summary: null,
            date: '2024-01-15T10:00:00.000Z',
            isProcessed: false,
            isSpam: false,
            hasAttachments: false,
          },
          {
            id: 2,
            sender: 'test2@example.com',
            subject: 'Email 2',
            snippet: 'Snippet 2',
            summary: 'Email 2 summary',
            date: '2024-01-14T10:00:00.000Z',
            isProcessed: true,
            isSpam: false,
            hasAttachments: false,
          },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxList />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Email 1')).toBeInTheDocument()
        expect(screen.getByText('Email 2')).toBeInTheDocument()
      })
    })

    it('should call API with correct pagination', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })

      render(<InboxList />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(mockGetEmails).toHaveBeenCalledWith({ page: 1, limit: 10 })
      })
    })
  })

  describe('Error State', () => {
    it('should show error message when fetch fails', async () => {
      mockGetEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxList />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText(/failed to load emails/i)).toBeInTheDocument()
      })
    })

    it('should show retry button on error', async () => {
      mockGetEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxList />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })
  })
})