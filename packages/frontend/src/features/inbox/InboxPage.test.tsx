import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { InboxPage } from './InboxPage'
import { EmailService } from '@/services'

// Mock ComposeEmailModal component
const mockComposeModalOpen = vi.fn()
vi.mock('@/components/email', () => ({
  ComposeEmailModal: ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    mockComposeModalOpen(open, onOpenChange)
    if (!open) return null
    return (
      <div data-testid="compose-email-modal" role="dialog" aria-label="Compose Email">
        <h2>Compose Email</h2>
        <button onClick={() => onOpenChange(false)} aria-label="Close modal">
          Cancel
        </button>
      </div>
    )
  },
  EmailChipInput: vi.fn(() => null),
  TipTapEditor: vi.fn(() => null),
}))

// Mock sonner toast - must be defined before vi.mock
const mockToastSuccess = vi.fn()
const mockToastError = vi.fn()
const mockToastInfo = vi.fn()

// Mock services
vi.mock('@/services', () => ({
  EmailService: {
    getEmails: vi.fn(),
    getEmail: vi.fn(),
    processEmails: vi.fn(),
    getSyncStatus: vi.fn(),
    triggerSync: vi.fn(),
  },
}))

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
  },
}))

const mockGetEmails = vi.mocked(EmailService.getEmails)
const mockGetEmail = vi.mocked(EmailService.getEmail)
const mockProcessEmails = vi.mocked(EmailService.processEmails)
const mockTriggerSync = vi.mocked(EmailService.triggerSync)
const mockGetSyncStatus = vi.mocked(EmailService.getSyncStatus)

// Helper to create wrapper with QueryClient and Router
function createWrapper(initialRoute = '/inbox') {
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
        <MemoryRouter initialEntries={[initialRoute]}>
          <Routes>
            <Route path="/inbox" element={children} />
            <Route path="/inbox/:emailId" element={children} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }
}

describe('InboxPage', () => {
  beforeEach(() => {
    mockGetEmails.mockReset()
    mockGetEmail.mockReset()
    mockProcessEmails.mockReset()
    mockTriggerSync.mockReset()
    mockGetSyncStatus.mockReset()
    mockToastSuccess.mockReset()
    mockToastError.mockReset()
    mockToastInfo.mockReset()
    mockComposeModalOpen.mockReset()
  })

  describe('Selection Counter', () => {
    it('should show selection count when emails are selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: 'b@test.com', subject: 'B', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select first email by clicking the checkbox (not the card body)
      const checkbox = screen.getAllByRole('checkbox')[0]
      await act(async () => {
        fireEvent.click(checkbox)
      })

      await waitFor(() => {
        expect(screen.getByText('1/5 emails selected')).toBeInTheDocument()
      })
    })

    it('should show maximum reached warning when 5 emails selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: '1@test.com', subject: 'E1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: '2@test.com', subject: 'E2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 3, sender: '3@test.com', subject: 'E3', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 4, sender: '4@test.com', subject: 'E4', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 5, sender: '5@test.com', subject: 'E5', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 6, sender: '6@test.com', subject: 'E6', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 6, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument()
      })

      // Select 5 emails by clicking checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.click(checkboxes[i])
        })
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
          { id: 1, sender: '1@test.com', subject: 'E1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: '2@test.com', subject: 'E2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 3, sender: '3@test.com', subject: 'E3', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 4, sender: '4@test.com', subject: 'E4', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 5, sender: '5@test.com', subject: 'E5', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 6, sender: '6@test.com', subject: 'E6', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 6, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument()
      })

      // Select 5 emails by clicking checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.click(checkboxes[i])
        })
      }

      await waitFor(() => {
        // The 6th checkbox should be disabled
        expect(checkboxes[5]).toBeDisabled()
      })
    })

    it('should allow deselecting when at max limit', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: '1@test.com', subject: 'E1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: '2@test.com', subject: 'E2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 3, sender: '3@test.com', subject: 'E3', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 4, sender: '4@test.com', subject: 'E4', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 5, sender: '5@test.com', subject: 'E5', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 6, sender: '6@test.com', subject: 'E6', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 6, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('E1')).toBeInTheDocument()
      })

      // Select 5 emails by clicking checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      for (let i = 0; i < 5; i++) {
        await act(async () => {
          fireEvent.click(checkboxes[i])
        })
      }

      // Deselect first one
      await act(async () => {
        fireEvent.click(checkboxes[0])
      })

      await waitFor(() => {
        expect(checkboxes[0]).not.toBeChecked()
      })
    })
  })

  describe('Run AI Action Button', () => {
    it('should show floating action button when emails are selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Initially no button
      expect(screen.queryByRole('button', { name: /run ai/i })).not.toBeInTheDocument()

      // Select email by clicking the checkbox
      const checkbox = screen.getByRole('checkbox')
      await act(async () => {
        fireEvent.click(checkbox)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /run ai/i })).toBeInTheDocument()
      })
    })

    it('should show processing state when clicked', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockProcessEmails.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select email by clicking the checkbox
      const checkbox = screen.getByRole('checkbox')
      await act(async () => {
        fireEvent.click(checkbox)
      })

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
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: 'b@test.com', subject: 'B', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
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

      // Select both emails by clicking checkboxes
      const checkboxes = screen.getAllByRole('checkbox')
      await act(async () => {
        fireEvent.click(checkboxes[0])
        fireEvent.click(checkboxes[1])
      })

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
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockProcessEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('A')).toBeInTheDocument()
      })

      // Select email by clicking the checkbox
      const checkbox = screen.getByRole('checkbox')
      await act(async () => {
        fireEvent.click(checkbox)
      })

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
          { id: 1, sender: 'a@test.com', subject: 'A', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
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

      // Select email by clicking the checkbox
      const checkbox = screen.getByRole('checkbox')
      await act(async () => {
        fireEvent.click(checkbox)
      })

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

  describe('Split-Pane Layout', () => {
    it('should render split-pane layout with email list and detail panel', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test Email', snippet: 'Snippet', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test Email')).toBeInTheDocument()
      })

      // Check for left pane (email list) - 350px fixed width
      const leftPane = screen.getByTestId('email-list-pane')
      expect(leftPane).toBeInTheDocument()
      expect(leftPane).toHaveClass('w-[350px]')

      // Check for right pane (detail panel) - flex-1
      const rightPane = screen.getByTestId('email-detail-pane')
      expect(rightPane).toBeInTheDocument()
      expect(rightPane).toHaveClass('flex-1')
    })

    it('should render empty state in right pane when no email selected', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Empty state should be visible
      expect(screen.getByText(/select an email/i)).toBeInTheDocument()
    })
  })

  describe('URL Parameter Parsing', () => {
    it('should parse valid emailId from URL', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Email 1', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: 'b@test.com', subject: 'Email 2', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      })

      // Mock getEmail for the detail panel
      mockGetEmail.mockResolvedValueOnce({
        id: 2,
        sender: 'b@test.com',
        subject: 'Email 2',
        snippet: '',
        bodyText: 'Email 2 body content',
        date: new Date().toISOString(),
        isProcessed: false,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      })

      render(<InboxPage />, { wrapper: createWrapper('/inbox/2') })

      await waitFor(() => {
        expect(screen.getByText('Email 1')).toBeInTheDocument()
      })

      // Email with id=2 should be marked as active
      const activeCard = screen.getByText('Email 2').closest('[data-testid="email-card"]')
      expect(activeCard).toHaveClass('border-l-4')
    })

    it('should handle invalid emailId (NaN) in URL', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper('/inbox/invalid-id') })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Should show empty state (no email selected due to invalid ID)
      expect(screen.getByText(/select an email/i)).toBeInTheDocument()
    })

    it('should handle negative emailId in URL', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper('/inbox/-1') })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Should show empty state (negative ID is invalid)
      expect(screen.getByText(/select an email/i)).toBeInTheDocument()
    })

    it('should handle zero emailId in URL', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper('/inbox/0') })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Should show empty state (zero is not a valid email ID)
      expect(screen.getByText(/select an email/i)).toBeInTheDocument()
    })
  })

  describe('Email Card Navigation', () => {
    it('should pass activeId to EmailCard when email is selected via URL', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Active Email', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
          { id: 2, sender: 'b@test.com', subject: 'Other Email', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      })

      // Mock getEmail for the detail panel
      mockGetEmail.mockResolvedValueOnce({
        id: 1,
        sender: 'a@test.com',
        subject: 'Active Email',
        snippet: '',
        bodyText: 'Active email body content',
        date: new Date().toISOString(),
        isProcessed: false,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      })

      render(<InboxPage />, { wrapper: createWrapper('/inbox/1') })

      await waitFor(() => {
        expect(screen.getByText('Active Email')).toBeInTheDocument()
      })

      // The active card should have the blue left border
      const activeCard = screen.getByText('Active Email').closest('[data-testid="email-card"]')
      expect(activeCard).toHaveClass('border-l-4')
      expect(activeCard).toHaveClass('border-l-blue-600')

      // Other card should not have the active styling
      const otherCard = screen.getByText('Other Email').closest('[data-testid="email-card"]')
      expect(otherCard).not.toHaveClass('border-l-4')
    })
  })

  describe('Empty Inbox State', () => {
    it('should show empty inbox message when no emails', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Your inbox is clear')).toBeInTheDocument()
      })
    })

    it('should show sync button in empty state', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument()
      })
    })
  })

  describe('Sync Functionality', () => {
    it('should trigger sync when sync button is clicked', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockTriggerSync.mockResolvedValueOnce({ jobId: 'job-123', status: 'pending' })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      const syncButton = screen.getByRole('button', { name: /sync/i })
      await act(async () => {
        fireEvent.click(syncButton)
      })

      await waitFor(() => {
        expect(mockTriggerSync).toHaveBeenCalledTimes(1)
        expect(mockToastInfo).toHaveBeenCalledWith('Sync started...')
      })
    })

    it('should show syncing state when sync is in progress', async () => {
      mockGetEmails.mockResolvedValue({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      // Start sync but don't resolve status polling
      mockTriggerSync.mockResolvedValueOnce({ jobId: 'job-123', status: 'pending' })
      mockGetSyncStatus.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      const syncButton = screen.getByRole('button', { name: /sync/i })
      await act(async () => {
        fireEvent.click(syncButton)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeInTheDocument()
      })
    })

    it('should disable sync button while syncing', async () => {
      mockGetEmails.mockResolvedValue({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockTriggerSync.mockResolvedValueOnce({ jobId: 'job-123', status: 'pending' })
      mockGetSyncStatus.mockImplementation(() => new Promise(() => {}))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      const syncButton = screen.getByRole('button', { name: /sync/i })
      await act(async () => {
        fireEvent.click(syncButton)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /syncing/i })).toBeDisabled()
      })
    })

    it('should show success toast when sync completes', async () => {
      mockGetEmails.mockResolvedValue({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockTriggerSync.mockResolvedValueOnce({ jobId: 'job-123', status: 'pending' })
      mockGetSyncStatus
        .mockResolvedValueOnce({
          id: 'job-123',
          accountId: 1,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .mockResolvedValueOnce({
          id: 'job-123',
          accountId: 1,
          status: 'completed',
          result: { syncedCount: 5, errors: [] },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      const syncButton = screen.getByRole('button', { name: /sync/i })
      await act(async () => {
        fireEvent.click(syncButton)
      })

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith('Sync completed, 5 new emails')
      }, { timeout: 5000 })
    })

    it('should show error toast when sync fails', async () => {
      mockGetEmails.mockResolvedValue({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockTriggerSync.mockResolvedValueOnce({ jobId: 'job-123', status: 'pending' })
      mockGetSyncStatus.mockResolvedValueOnce({
        id: 'job-123',
        accountId: 1,
        status: 'failed',
        error: 'Connection refused',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      const syncButton = screen.getByRole('button', { name: /sync/i })
      await act(async () => {
        fireEvent.click(syncButton)
      })

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Sync failed: Connection refused')
      }, { timeout: 5000 })
    })

    it('should handle sync start failure', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      mockTriggerSync.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      const syncButton = screen.getByRole('button', { name: /sync/i })
      await act(async () => {
        fireEvent.click(syncButton)
      })

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Failed to start sync')
      })
    })
  })

  describe('Error State', () => {
    it('should show error state when fetch fails', async () => {
      mockGetEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Failed to load emails')).toBeInTheDocument()
      })
    })

    it('should show retry button in error state', async () => {
      mockGetEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
      })
    })

    it('should refetch when retry button is clicked', async () => {
      mockGetEmails.mockRejectedValueOnce(new Error('Network error'))

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Failed to load emails')).toBeInTheDocument()
      })

      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      const retryButton = screen.getByRole('button', { name: /retry/i })
      await act(async () => {
        fireEvent.click(retryButton)
      })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })
    })
  })

  describe('Compose Email Integration', () => {
    it('should render compose button in header', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Compose button should be visible
      expect(screen.getByRole('button', { name: /compose/i })).toBeInTheDocument()
    })

    it('should place compose button between filter and sync button', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Get all header buttons in the right section
      const headerButtons = screen.getByRole('button', { name: /compose/i }).parentElement?.querySelectorAll('button')
      const buttonNames = Array.from(headerButtons || []).map(btn => btn.textContent)

      // Compose should be present
      expect(buttonNames.some(name => name?.toLowerCase().includes('compose'))).toBe(true)
      // Sync should be present
      expect(buttonNames.some(name => name?.toLowerCase().includes('sync'))).toBe(true)
    })

    it('should open compose modal when compose button is clicked', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Modal should not be visible initially
      expect(screen.queryByTestId('compose-email-modal')).not.toBeInTheDocument()

      // Click compose button
      const composeButton = screen.getByRole('button', { name: /compose/i })
      await act(async () => {
        fireEvent.click(composeButton)
      })

      // Modal should now be visible
      await waitFor(() => {
        expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
      })
    })

    it('should close compose modal when onOpenChange is called with false', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Click compose button to open modal
      const composeButton = screen.getByRole('button', { name: /compose/i })
      await act(async () => {
        fireEvent.click(composeButton)
      })

      await waitFor(() => {
        expect(screen.getByTestId('compose-email-modal')).toBeInTheDocument()
      })

      // Click the cancel button in the modal to close it
      const cancelButton = screen.getByRole('button', { name: /close modal/i })
      await act(async () => {
        fireEvent.click(cancelButton)
      })

      // Modal should be closed
      await waitFor(() => {
        expect(screen.queryByTestId('compose-email-modal')).not.toBeInTheDocument()
      })
    })

    it('should show compose button in loading state', async () => {
      mockGetEmails.mockImplementation(() => new Promise(() => {})) // Never resolves

      render(<InboxPage />, { wrapper: createWrapper() })

      // In loading state, we still have a header with sync button
      // Check if the page renders loading skeletons
      expect(screen.getByTestId('email-list-pane')).toBeInTheDocument()

      // Compose button should NOT be visible in loading state (only sync button)
      expect(screen.queryByRole('button', { name: /compose/i })).not.toBeInTheDocument()
    })

    it('should show compose button in empty inbox state', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [],
        pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Your inbox is clear')).toBeInTheDocument()
      })

      // Compose button should NOT be visible in empty state (only sync button in simple header)
      expect(screen.queryByRole('button', { name: /compose/i })).not.toBeInTheDocument()
    })

    it('should pass correct props to ComposeEmailModal', async () => {
      mockGetEmails.mockResolvedValueOnce({
        emails: [
          { id: 1, sender: 'a@test.com', subject: 'Test', snippet: '', summary: null, date: new Date().toISOString(), isProcessed: false, classification: 'IMPORTANT', isSpam: false, hasAttachments: false },
        ],
        pagination: { total: 1, page: 1, limit: 10, totalPages: 1 },
      })

      render(<InboxPage />, { wrapper: createWrapper() })

      await waitFor(() => {
        expect(screen.getByText('Test')).toBeInTheDocument()
      })

      // Click compose button to open modal
      const composeButton = screen.getByRole('button', { name: /compose/i })
      await act(async () => {
        fireEvent.click(composeButton)
      })

      await waitFor(() => {
        // Verify the modal was called with open=true
        expect(mockComposeModalOpen).toHaveBeenCalledWith(true, expect.any(Function))
      })
    })
  })
})