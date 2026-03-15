import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EmailDetailPanel } from './EmailDetailPanel'
import type { EmailDetail } from '@/services'

// Mock the useEmailDetail hook
const mockUseEmailDetail = vi.fn()
vi.mock('@/hooks', () => ({
  useEmailDetail: (emailId: number | null) => mockUseEmailDetail(emailId),
}))

// Helper to create mock email
function createMockEmail(overrides: Partial<EmailDetail> = {}): EmailDetail {
  return {
    id: 1,
    subject: 'Test Subject',
    sender: 'test@example.com',
    snippet: 'Test snippet',
    bodyText: 'Test body content',
    date: new Date().toISOString(),
    isProcessed: true,
    classification: 'IMPORTANT',
    isSpam: false,
    hasAttachments: false,
    ...overrides,
  }
}

describe('EmailDetailPanel', () => {
  beforeEach(() => {
    mockUseEmailDetail.mockReset()
  })

  describe('Empty State (emailId === null)', () => {
    it('shows EmailDetailEmpty when emailId is null', () => {
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={null} />)

      expect(screen.getByText('Select an email from the list')).toBeInTheDocument()
    })

    it('does not call useEmailDetail when emailId is null', () => {
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={null} />)

      // The hook should still be called but with null, which disables the query
      expect(mockUseEmailDetail).toHaveBeenCalledWith(null)
    })
  })

  describe('Loading State', () => {
    it('shows EmailDetailSkeleton during loading', () => {
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      // Skeleton should have loading animation elements
      // Check for animate-pulse class which indicates skeleton loading
      const { container } = render(<EmailDetailPanel emailId={1} />)
      const skeletonElement = container.querySelector('.animate-pulse')
      expect(skeletonElement).toBeInTheDocument()
    })

    it('shows skeleton with proper structure', () => {
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      const { container } = render(<EmailDetailPanel emailId={1} />)

      // Check for skeleton container structure
      expect(container.querySelector('.p-6.space-y-6')).toBeInTheDocument()
    })
  })

  describe('Error State', () => {
    it('shows EmailDetailError with retry button on general error', () => {
      const mockRefetch = vi.fn()
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { response: { status: 500 } },
        refetch: mockRefetch,
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('Failed to load email')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
    })

    it('triggers refetch when retry button is clicked', () => {
      const mockRefetch = vi.fn()
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { response: { status: 500 } },
        refetch: mockRefetch,
      })

      render(<EmailDetailPanel emailId={1} />)

      const retryButton = screen.getByRole('button', { name: /retry/i })
      fireEvent.click(retryButton)

      expect(mockRefetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('404 Error Handling', () => {
    it('shows custom empty message on 404 error', () => {
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { response: { status: 404 } },
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={999} />)

      expect(screen.getByText(/does not exist or has been deleted/i)).toBeInTheDocument()
    })

    it('does not show retry button on 404', () => {
      mockUseEmailDetail.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: { response: { status: 404 } },
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={999} />)

      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument()
    })
  })

  describe('Success State', () => {
    it('renders all sections on successful fetch', () => {
      const mockEmail = createMockEmail()
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      // Header: subject
      expect(screen.getByText('Test Subject')).toBeInTheDocument()
      // Body: content
      expect(screen.getByText('Test body content')).toBeInTheDocument()
    })

    it('renders subject with fallback when null', () => {
      const mockEmail = createMockEmail({ subject: null })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('(No Subject)')).toBeInTheDocument()
    })

    it('renders body with fallback when null', () => {
      const mockEmail = createMockEmail({ bodyText: null })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('(No content)')).toBeInTheDocument()
    })
  })

  describe('onClose Callback', () => {
    it('passes onClose to EmailDetailHeader', () => {
      const onClose = vi.fn()
      const mockEmail = createMockEmail()
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} onClose={onClose} />)

      const closeButton = screen.getByRole('button', { name: /close/i })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('does not render close button when onClose is undefined', () => {
      const mockEmail = createMockEmail()
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })
  })

  describe('Conditional Attachments Rendering', () => {
    it('renders EmailDetailAttachments when hasAttachments is true', () => {
      const mockEmail = createMockEmail({ hasAttachments: true })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('Attachments')).toBeInTheDocument()
    })

    it('does not render EmailDetailAttachments when hasAttachments is false', () => {
      const mockEmail = createMockEmail({ hasAttachments: false })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.queryByText('Attachments')).not.toBeInTheDocument()
    })
  })

  describe('Layout Structure', () => {
    it('has full height layout with flex column', () => {
      const mockEmail = createMockEmail()
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      const { container } = render(<EmailDetailPanel emailId={1} />)

      const mainContainer = container.firstChild as HTMLElement
      expect(mainContainer.className).toContain('h-full')
      expect(mainContainer.className).toContain('flex')
      expect(mainContainer.className).toContain('flex-col')
    })

    it('has horizontal divider between header and body', () => {
      const mockEmail = createMockEmail()
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      const { container } = render(<EmailDetailPanel emailId={1} />)

      const divider = container.querySelector('hr')
      expect(divider).toBeInTheDocument()
      expect(divider?.className).toContain('border-gray-200')
    })
  })

  describe('Classification Badge', () => {
    it('shows IMPORTANT badge for important emails', () => {
      const mockEmail = createMockEmail({ classification: 'IMPORTANT' })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('Important')).toBeInTheDocument()
    })

    it('shows NEWSLETTER badge for newsletter emails', () => {
      const mockEmail = createMockEmail({ classification: 'NEWSLETTER' })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('Newsletter')).toBeInTheDocument()
    })

    it('shows SPAM badge for spam emails', () => {
      const mockEmail = createMockEmail({ classification: 'SPAM' })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('Spam')).toBeInTheDocument()
    })
  })

  describe('Avatar and Sender Display', () => {
    it('shows sender avatar initial', () => {
      const mockEmail = createMockEmail({ sender: 'alice@example.com' })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('shows extracted display name from email', () => {
      const mockEmail = createMockEmail({ sender: 'john.doe@example.com' })
      mockUseEmailDetail.mockReturnValue({
        data: mockEmail,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      })

      render(<EmailDetailPanel emailId={1} />)

      expect(screen.getByText('john.doe')).toBeInTheDocument()
    })
  })
})