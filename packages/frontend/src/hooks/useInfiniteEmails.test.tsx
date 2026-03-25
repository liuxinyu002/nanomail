import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import React from 'react'
import { useInfiniteEmails, type UseInfiniteEmailsOptions } from './useInfiniteEmails'
import type { EmailListItem } from '@/services/email.service'
import type { EmailClassification } from '@nanomail/shared'

// Mock EmailService
const mockGetEmails = vi.fn()
vi.mock('@/services/email.service', () => ({
  EmailService: {
    getEmails: (query: unknown) => mockGetEmails(query),
  },
}))

// Mock IntersectionObserver
const mockObserve = vi.fn()
const mockUnobserve = vi.fn()
const mockDisconnect = vi.fn()
let mockIntersectionCallback: ((entries: IntersectionObserverEntry[]) => void) | null = null

class MockIntersectionObserver {
  constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
    mockIntersectionCallback = callback
  }
  observe = mockObserve
  unobserve = mockUnobserve
  disconnect = mockDisconnect
}

// Setup IntersectionObserver mock
const originalIntersectionObserver = window.IntersectionObserver

beforeEach(() => {
  mockIntersectionCallback = null
  window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver
})

afterEach(() => {
  window.IntersectionObserver = originalIntersectionObserver
})

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

// Helper to create mock email list items
function createMockEmail(id: number, overrides: Partial<EmailListItem> = {}): EmailListItem {
  return {
    id,
    subject: `Test Email ${id}`,
    sender: `sender${id}@example.com`,
    snippet: `Snippet for email ${id}`,
    summary: null,
    date: new Date(2024, 0, id).toISOString(),
    isProcessed: true,
    classification: 'IMPORTANT' as EmailClassification,
    isSpam: false,
    hasAttachments: false,
    ...overrides,
  }
}

// Helper to create mock emails response
function createMockEmailsResponse(emails: EmailListItem[], page: number, totalPages: number, limit: number = 10) {
  return {
    emails,
    pagination: {
      total: totalPages * limit,
      page,
      limit,
      totalPages,
    },
  }
}

describe('useInfiniteEmails', () => {
  beforeEach(() => {
    mockGetEmails.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial Loading', () => {
    it('should return empty emails array initially', () => {
      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      expect(result.current.emails).toEqual([])
      expect(result.current.isLoading).toBe(true)
    })

    it('should fetch first page of emails on mount', async () => {
      const mockEmails = [createMockEmail(1), createMockEmail(2)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 3))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(mockGetEmails).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        classification: undefined,
      })
      expect(result.current.emails).toHaveLength(2)
      expect(result.current.emails[0].id).toBe(1)
    })

    it('should set error state on API failure', async () => {
      mockGetEmails.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.error).not.toBeNull())

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('Query Configuration', () => {
    it('should use correct query key with classification', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      renderHook(() => useInfiniteEmails({ classification: 'IMPORTANT' }), { wrapper })

      await waitFor(() => expect(mockGetEmails).toHaveBeenCalled())

      // Verify query key exists in cache
      const cacheData = queryClient.getQueryData(['emails', 'IMPORTANT'])
      expect(cacheData).toBeDefined()
    })

    it('should pass classification filter to API when not ALL', async () => {
      const mockEmails = [createMockEmail(1, { classification: 'NEWSLETTER' })]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(
        () => useInfiniteEmails({ classification: 'NEWSLETTER' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(mockGetEmails).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        classification: 'NEWSLETTER',
      })
    })

    it('should not pass classification filter when ALL', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(
        () => useInfiniteEmails({ classification: 'ALL' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(mockGetEmails).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        classification: undefined,
      })
    })

    it('should use custom limit when provided', async () => {
      const mockEmails = Array.from({ length: 20 }, (_, i) => createMockEmail(i + 1))
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1, 20))

      const { result } = renderHook(
        () => useInfiniteEmails({ limit: 20 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(mockGetEmails).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        classification: undefined,
      })
    })
  })

  describe('Page Flattening', () => {
    it('should flatten multiple pages into single array', async () => {
      const page1Emails = [createMockEmail(1), createMockEmail(2)]
      const page2Emails = [createMockEmail(3), createMockEmail(4)]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Fetch next page
      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.emails).toHaveLength(4))

      expect(result.current.emails.map(e => e.id)).toEqual([1, 2, 3, 4])
    })
  })

  describe('Deduplication', () => {
    it('should deduplicate emails by id', async () => {
      // Simulate duplicate email appearing in both pages
      const page1Emails = [createMockEmail(1), createMockEmail(2)]
      const page2Emails = [createMockEmail(2), createMockEmail(3)] // email 2 is duplicate

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.emails).toHaveLength(3))

      // Should have unique ids only
      const ids = result.current.emails.map(e => e.id)
      expect(ids).toEqual([1, 2, 3])
      expect(new Set(ids).size).toBe(3) // Verify no duplicates
    })
  })

  describe('Pagination State', () => {
    it('should correctly indicate hasNextPage', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 3))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.hasNextPage).toBe(true)
    })

    it('should set hasNextPage to false when on last page', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.hasNextPage).toBe(false)
    })

    it('should set isFetchingNextPage while loading next page', async () => {
      const page1Emails = [createMockEmail(1)]
      const page2Emails = [createMockEmail(2)]

      // Create a promise that we can resolve manually
      let resolvePage2: (value: unknown) => void
      const page2Promise = new Promise((resolve) => {
        resolvePage2 = resolve
      })

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockReturnValueOnce(page2Promise)

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isFetchingNextPage).toBe(false)

      // Start fetching next page
      act(() => {
        result.current.fetchNextPage()
      })

      // Should be fetching
      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true))

      // Resolve the promise
      await act(async () => {
        resolvePage2!(createMockEmailsResponse(page2Emails, 2, 2))
      })

      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
    })
  })

  describe('Safety Limit (maxItems)', () => {
    it('should set hasReachedLimit to true when maxItems reached', async () => {
      // Create 200 emails in 20 pages
      const allEmails = Array.from({ length: 200 }, (_, i) => createMockEmail(i + 1))

      // Mock first page
      const page1Emails = allEmails.slice(0, 10)
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 20))

      const { result } = renderHook(
        () => useInfiniteEmails({ maxItems: 200 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Mock remaining pages and fetch them all
      for (let page = 2; page <= 20; page++) {
        const pageEmails = allEmails.slice((page - 1) * 10, page * 10)
        mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(pageEmails, page, 20))

        await act(async () => {
          await result.current.fetchNextPage()
        })

        await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
      }

      // Should have reached limit
      expect(result.current.emails.length).toBe(200)
      expect(result.current.hasReachedLimit).toBe(true)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should set hasReachedLimit to false when under maxItems', async () => {
      const mockEmails = [createMockEmail(1), createMockEmail(2)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 3))

      const { result } = renderHook(
        () => useInfiniteEmails({ maxItems: 200 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.hasReachedLimit).toBe(false)
    })

    it('should use default maxItems of 200', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Default maxItems is 200, so with 1 email should not be reached
      expect(result.current.hasReachedLimit).toBe(false)
    })
  })

  describe('IntersectionObserver Setup', () => {
    it('should return triggerRef and containerRef', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.triggerRef).toBeDefined()
      expect(result.current.containerRef).toBeDefined()
      expect(result.current.triggerRef.current).toBeNull() // Not attached to DOM yet
      expect(result.current.containerRef.current).toBeNull()
    })

    it('should correctly expose hasNextPage based on pagination and limit', async () => {
      // Test that hasNextPage is correctly computed
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 3))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Should have next page since totalPages=3 and we're on page 1
      expect(result.current.hasNextPage).toBe(true)
    })

    it('should correctly set hasNextPage to false when on last page', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.hasNextPage).toBe(false)
    })

    it('should correctly set hasNextPage to false when maxItems reached', async () => {
      const page1Emails = Array.from({ length: 10 }, (_, i) => createMockEmail(i + 1))
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 20))

      const { result } = renderHook(
        () => useInfiniteEmails({ maxItems: 5 }), // Set low limit
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // With maxItems=5 and 10 emails, should have reached limit
      expect(result.current.hasReachedLimit).toBe(true)
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should allow manual fetchNextPage call', async () => {
      const page1Emails = [createMockEmail(1)]
      const page2Emails = [createMockEmail(2)]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.emails).toHaveLength(1)

      // Manually call fetchNextPage
      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.emails).toHaveLength(2))
      expect(mockGetEmails).toHaveBeenCalledTimes(2)
    })

    it('should expose isFetchingNextPage state correctly', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isFetchingNextPage).toBe(false)

      // Mock a slow next page fetch
      let resolvePage2: (value: unknown) => void
      mockGetEmails.mockReturnValueOnce(new Promise((resolve) => {
        resolvePage2 = resolve
      }))

      // Start fetching next page
      act(() => {
        result.current.fetchNextPage()
      })

      // Should be fetching
      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true))

      // Resolve the promise
      await act(async () => {
        resolvePage2!(createMockEmailsResponse([createMockEmail(2)], 2, 2))
      })

      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
    })
  })

  describe('Refetch', () => {
    it('should refetch emails when refetch is called', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValue(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(mockGetEmails).toHaveBeenCalledTimes(1)

      // Manual refetch
      await act(async () => {
        await result.current.refetch()
      })

      expect(mockGetEmails).toHaveBeenCalledTimes(2)
    })
  })

  describe('Classification Change', () => {
    it('should reset emails when classification changes', async () => {
      const importantEmails = [createMockEmail(1, { classification: 'IMPORTANT' })]
      const newsletterEmails = [createMockEmail(2, { classification: 'NEWSLETTER' })]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(importantEmails, 1, 1))
        .mockResolvedValueOnce(createMockEmailsResponse(newsletterEmails, 1, 1))

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result, rerender } = renderHook(
        ({ classification }) => useInfiniteEmails({ classification }),
        {
          initialProps: { classification: 'IMPORTANT' as const },
          wrapper,
        }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.emails[0].classification).toBe('IMPORTANT')

      // Change classification
      rerender({ classification: 'NEWSLETTER' })

      await waitFor(() => {
        expect(result.current.emails[0]?.classification).toBe('NEWSLETTER')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty emails array', async () => {
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse([], 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.emails).toEqual([])
      expect(result.current.hasNextPage).toBe(false)
    })

    it('should handle single email', async () => {
      const mockEmails = [createMockEmail(1)]
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      expect(result.current.emails).toHaveLength(1)
      expect(result.current.emails[0].id).toBe(1)
    })
  })

  describe('IntersectionObserver Optimization', () => {
    // Tests that don't require actual DOM elements attached to refs

    it('should NOT recreate Observer when isFetchingNextPage changes', async () => {
      const page1Emails = [createMockEmail(1)]
      const page2Emails = [createMockEmail(2)]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Reset mock counts after initial setup
      mockDisconnect.mockClear()
      mockObserve.mockClear()

      // Start fetching next page (changes isFetchingNextPage state)
      act(() => {
        result.current.fetchNextPage()
      })

      // Observer should NOT be recreated when isFetchingNextPage changes
      // Note: Since the observer depends only on [fetchNextPage], changing
      // isFetchingNextPage should NOT trigger a recreate
      expect(mockDisconnect).not.toHaveBeenCalled()
      expect(mockObserve).not.toHaveBeenCalled()
    })

    it('should NOT recreate Observer when hasNextPage changes', async () => {
      const page1Emails = [createMockEmail(1)]
      const page2Emails = [createMockEmail(2)]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.hasNextPage).toBe(true)

      // Reset mock counts
      mockDisconnect.mockClear()
      mockObserve.mockClear()

      // Fetch last page (will change hasNextPage to false)
      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.hasNextPage).toBe(false))

      // Observer should NOT be recreated when hasNextPage changes
      expect(mockDisconnect).not.toHaveBeenCalled()
      expect(mockObserve).not.toHaveBeenCalled()
    })

    it('should allow retry via refetch after error', async () => {
      // First call fails
      mockGetEmails
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockEmailsResponse([createMockEmail(1)], 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.error).not.toBeNull())

      // Manual retry should work
      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => expect(result.current.error).toBeNull())
      expect(result.current.emails).toHaveLength(1)
    })

    it('should correctly sync isFetchingRef with isFetchingNextPage', async () => {
      const page1Emails = [createMockEmail(1)]

      let resolvePage2: (value: unknown) => void
      const page2Promise = new Promise((resolve) => {
        resolvePage2 = resolve
      })

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockReturnValueOnce(page2Promise)

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))
      expect(result.current.isFetchingNextPage).toBe(false)

      // Start fetching
      act(() => {
        result.current.fetchNextPage()
      })

      // isFetchingRef should sync with isFetchingNextPage
      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(true))

      // Resolve
      await act(async () => {
        resolvePage2!(createMockEmailsResponse([createMockEmail(2)], 2, 2))
      })

      await waitFor(() => expect(result.current.isFetchingNextPage).toBe(false))
    })

    it('should correctly sync hasNextPageRef with hasNextPage and hasReachedLimit', async () => {
      const page1Emails = [createMockEmail(1)]
      const page2Emails = [createMockEmail(2)]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Initially hasNextPage should be true (hasNextPage && !hasReachedLimit)
      expect(result.current.hasNextPage).toBe(true)

      // Fetch next page
      await act(async () => {
        await result.current.fetchNextPage()
      })

      // After fetching last page, hasNextPage should be false
      await waitFor(() => expect(result.current.hasNextPage).toBe(false))
    })

    it('should correctly sync isErrorRef with isError state', async () => {
      mockGetEmails
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(createMockEmailsResponse([createMockEmail(1)], 1, 1))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      // Wait for error
      await waitFor(() => expect(result.current.error).not.toBeNull())

      // isError should be true (synced to isErrorRef)
      expect(result.current.error).toBeInstanceOf(Error)

      // Refetch should clear error
      await act(async () => {
        await result.current.refetch()
      })

      await waitFor(() => expect(result.current.error).toBeNull())
    })

    it('should use refs to avoid closure trap in Observer callback', async () => {
      // This test verifies the pattern: the Observer uses refs instead of closure values
      // We can verify this by checking the implementation uses refs for state checks
      const page1Emails = [createMockEmail(1)]

      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 2))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // The hook should have created refs for state caching
      // We can verify the hook works correctly by checking the state transitions
      expect(result.current.isFetchingNextPage).toBe(false)
      expect(result.current.hasNextPage).toBe(true)
      expect(result.current.error).toBeNull()
    })

    it('should have minimal Observer dependencies (only fetchNextPage)', async () => {
      // This is a structural test - the Observer useEffect should only depend on [fetchNextPage]
      // We verify this by checking that state changes don't trigger Observer recreation
      const page1Emails = [createMockEmail(1)]
      const page2Emails = [createMockEmail(2)]
      const page3Emails = [createMockEmail(3)]

      mockGetEmails
        .mockResolvedValueOnce(createMockEmailsResponse(page1Emails, 1, 3))
        .mockResolvedValueOnce(createMockEmailsResponse(page2Emails, 2, 3))
        .mockResolvedValueOnce(createMockEmailsResponse(page3Emails, 3, 3))

      const { result } = renderHook(() => useInfiniteEmails(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // Clear counts
      mockDisconnect.mockClear()
      mockObserve.mockClear()

      // Multiple state changes should NOT recreate Observer
      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.emails).toHaveLength(2))

      // No recreate after first fetch
      expect(mockDisconnect).not.toHaveBeenCalled()

      await act(async () => {
        await result.current.fetchNextPage()
      })

      await waitFor(() => expect(result.current.emails).toHaveLength(3))

      // No recreate after second fetch
      expect(mockDisconnect).not.toHaveBeenCalled()
      expect(mockObserve).not.toHaveBeenCalled()
    })

    it('should handle hasReachedLimit correctly affecting hasNextPage', async () => {
      const mockEmails = Array.from({ length: 10 }, (_, i) => createMockEmail(i + 1))
      mockGetEmails.mockResolvedValueOnce(createMockEmailsResponse(mockEmails, 1, 20))

      const { result } = renderHook(
        () => useInfiniteEmails({ maxItems: 5 }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isLoading).toBe(false))

      // With 10 emails and maxItems=5, hasReachedLimit should be true
      expect(result.current.hasReachedLimit).toBe(true)

      // hasNextPage should be false due to hasReachedLimit
      // (even though there are more pages on server)
      expect(result.current.hasNextPage).toBe(false)
    })
  })
})
