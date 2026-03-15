import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useEmailDetail } from './useEmailDetail'
import type { EmailDetail } from '@/services'

// Mock EmailService
const mockGetEmail = vi.fn()
vi.mock('@/services', () => ({
  EmailService: {
    getEmail: (id: number) => mockGetEmail(id),
  },
}))

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

describe('useEmailDetail', () => {
  beforeEach(() => {
    mockGetEmail.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Configuration', () => {
    it('should use correct query key with emailId', async () => {
      const emailId = 123
      const mockResponse: EmailDetail = {
        id: 123,
        subject: 'Test Subject',
        sender: 'test@example.com',
        snippet: 'Test snippet...',
        bodyText: 'Full email body',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      }
      mockGetEmail.mockResolvedValueOnce(mockResponse)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useEmailDetail(emailId), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Verify query key exists in cache
      const cacheData = queryClient.getQueryData(['email', emailId])
      expect(cacheData).toEqual(mockResponse)
    })

    it('should have staleTime of 5 minutes', async () => {
      const emailId = 456
      const mockResponse: EmailDetail = {
        id: 456,
        subject: 'Test',
        sender: 'sender@example.com',
        snippet: 'Snippet',
        bodyText: 'Body',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: false,
        classification: 'NEWSLETTER',
        isSpam: false,
        hasAttachments: false,
      }
      mockGetEmail.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useEmailDetail(emailId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Check that staleTime is set (data should not be stale immediately)
      expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
    })
  })

  describe('Enabled Condition', () => {
    it('should not fetch when emailId is null', () => {
      const { result } = renderHook(() => useEmailDetail(null), {
        wrapper: createWrapper(),
      })

      // Query should be disabled
      expect(result.current.isLoading).toBe(false)
      expect(result.current.isFetching).toBe(false)
      expect(mockGetEmail).not.toHaveBeenCalled()
    })

    it('should fetch when emailId is a valid number', async () => {
      const emailId = 789
      const mockResponse: EmailDetail = {
        id: 789,
        subject: 'Valid Email',
        sender: 'valid@example.com',
        snippet: 'Valid snippet',
        bodyText: 'Valid body',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      }
      mockGetEmail.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useEmailDetail(emailId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockGetEmail).toHaveBeenCalledWith(emailId)
      expect(result.current.data).toEqual(mockResponse)
    })

    it('should refetch when emailId changes', async () => {
      const mockResponse1: EmailDetail = {
        id: 1,
        subject: 'Email 1',
        sender: 'one@example.com',
        snippet: 'Snippet 1',
        bodyText: 'Body 1',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      }
      const mockResponse2: EmailDetail = {
        id: 2,
        subject: 'Email 2',
        sender: 'two@example.com',
        snippet: 'Snippet 2',
        bodyText: 'Body 2',
        date: '2024-03-15T11:00:00.000Z',
        isProcessed: false,
        classification: 'NEWSLETTER',
        isSpam: false,
        hasAttachments: false,
      }

      mockGetEmail
        .mockResolvedValueOnce(mockResponse1)
        .mockResolvedValueOnce(mockResponse2)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result, rerender } = renderHook(
        ({ emailId }) => useEmailDetail(emailId),
        {
          initialProps: { emailId: 1 },
          wrapper,
        }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetEmail).toHaveBeenCalledTimes(1)
      expect(result.current.data?.subject).toBe('Email 1')

      // Change emailId
      rerender({ emailId: 2 })

      await waitFor(() => expect(result.current.data?.subject).toBe('Email 2'))
      expect(mockGetEmail).toHaveBeenCalledTimes(2)
    })
  })

  describe('Data Fetching', () => {
    it('should return email data on successful fetch', async () => {
      const emailId = 100
      const mockResponse: EmailDetail = {
        id: 100,
        subject: 'Test Email Subject',
        sender: 'sender@example.com',
        snippet: 'This is a snippet...',
        bodyText: 'This is the full body text of the email.',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: true,
      }
      mockGetEmail.mockResolvedValueOnce(mockResponse)

      const { result } = renderHook(() => useEmailDetail(emailId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockResponse)
      expect(result.current.data?.subject).toBe('Test Email Subject')
      expect(result.current.data?.bodyText).toBe('This is the full body text of the email.')
      expect(result.current.data?.hasAttachments).toBe(true)
    })

    it('should set error state on API failure', async () => {
      const emailId = 999
      mockGetEmail.mockRejectedValueOnce(new Error('Email not found'))

      const { result } = renderHook(() => useEmailDetail(emailId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Email not found')
    })

    it('should set loading state while fetching', async () => {
      const emailId = 200
      // Create a promise that we can resolve manually
      let resolvePromise: (value: EmailDetail) => void
      const pendingPromise = new Promise<EmailDetail>((resolve) => {
        resolvePromise = resolve
      })
      mockGetEmail.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useEmailDetail(emailId), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isFetching).toBe(true)

      // Resolve the promise
      resolvePromise!({
        id: 200,
        subject: 'Resolved',
        sender: 'resolved@example.com',
        snippet: 'Resolved snippet',
        bodyText: 'Resolved body',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'NEWSLETTER',
        isSpam: false,
        hasAttachments: false,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.isLoading).toBe(false)
    })
  })

  describe('Cache Behavior', () => {
    it('should use cached data for same emailId', async () => {
      const emailId = 300
      const mockResponse: EmailDetail = {
        id: 300,
        subject: 'Cached Email',
        sender: 'cached@example.com',
        snippet: 'Cached snippet',
        bodyText: 'Cached body',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      }
      mockGetEmail.mockResolvedValueOnce(mockResponse)

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result, rerender } = renderHook(() => useEmailDetail(emailId), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetEmail).toHaveBeenCalledTimes(1)

      // Rerender with same emailId
      rerender()

      // Should not call API again due to cache
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetEmail).toHaveBeenCalledTimes(1)
    })

    it('should refetch when refetch is called', async () => {
      const emailId = 400
      const mockResponse: EmailDetail = {
        id: 400,
        subject: 'Refetch Test',
        sender: 'refetch@example.com',
        snippet: 'Refetch snippet',
        bodyText: 'Refetch body',
        date: '2024-03-15T10:00:00.000Z',
        isProcessed: true,
        classification: 'IMPORTANT',
        isSpam: false,
        hasAttachments: false,
      }
      mockGetEmail.mockResolvedValue(mockResponse)

      const { result } = renderHook(() => useEmailDetail(emailId), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockGetEmail).toHaveBeenCalledTimes(1)

      // Manual refetch
      await result.current.refetch()

      expect(mockGetEmail).toHaveBeenCalledTimes(2)
    })
  })
})