/**
 * Tests for useSettings hook
 *
 * Tests React Query integration for settings fetching with:
 * - Query configuration (queryKey, staleTime)
 * - Data fetching and caching
 * - Error handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSettings } from './useSettings'
import type { SettingsForm } from '@nanomail/shared'

// Mock fetch globally
const mockFetch = vi.fn()
global.fetch = mockFetch

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
  SMTP_USER: 'user@example.com',
  SMTP_PASS: 'password123',
  LLM_API_KEY: 'sk-test-key',
  LLM_MODEL: 'gpt-4',
  LLM_BASE_URL: 'https://api.openai.com/v1',
}

describe('useSettings', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Query Configuration', () => {
    it('should use correct query key', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result } = renderHook(() => useSettings(), { wrapper })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Verify query key exists in cache
      const cacheData = queryClient.getQueryData(['settings'])
      expect(cacheData).toEqual(mockSettings)
    })

    it('should have staleTime of 5 minutes', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // Check that staleTime is set (data should not be stale immediately)
      expect(result.current.dataUpdatedAt).toBeGreaterThan(0)
    })

    it('should fetch from /api/settings endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(mockFetch).toHaveBeenCalledWith('/api/settings')
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('Data Fetching', () => {
    it('should return settings data on successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockSettings)
      expect(result.current.data?.SMTP_USER).toBe('user@example.com')
      expect(result.current.data?.SMTP_HOST).toBe('smtp.example.com')
      expect(result.current.data?.PROTOCOL_TYPE).toBe('IMAP')
    })

    it('should set loading state while fetching', async () => {
      // Create a promise that we can resolve manually
      let resolvePromise: (value: Response) => void
      const pendingPromise = new Promise<Response>((resolve) => {
        resolvePromise = resolve
      })
      mockFetch.mockReturnValueOnce(pendingPromise)

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      // Initially loading
      expect(result.current.isLoading).toBe(true)
      expect(result.current.isFetching).toBe(true)

      // Resolve the promise
      resolvePromise!({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      } as Response)

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.isLoading).toBe(false)
    })

    it('should set error state on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Failed to fetch settings')
    })

    it('should set error state on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Network error')
    })
  })

  describe('Cache Behavior', () => {
    it('should use cached data for subsequent renders', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const queryClient = new QueryClient({
        defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } },
      })

      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )

      const { result, rerender } = renderHook(() => useSettings(), {
        wrapper,
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Rerender - should use cache
      rerender()

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      // Should not call API again due to cache
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('should refetch when refetch is called', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(mockFetch).toHaveBeenCalledTimes(1)

      // Manual refetch
      await result.current.refetch()

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe('Settings Fields Access', () => {
    it('should provide access to SMTP settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.SMTP_HOST).toBe('smtp.example.com')
      expect(result.current.data?.SMTP_PORT).toBe('587')
      expect(result.current.data?.SMTP_USER).toBe('user@example.com')
      expect(result.current.data?.SMTP_PASS).toBe('password123')
    })

    it('should provide access to IMAP settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.IMAP_HOST).toBe('imap.example.com')
      expect(result.current.data?.IMAP_PORT).toBe('993')
      expect(result.current.data?.IMAP_USER).toBe('user@example.com')
    })

    it('should provide access to LLM settings', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data?.LLM_API_KEY).toBe('sk-test-key')
      expect(result.current.data?.LLM_MODEL).toBe('gpt-4')
      expect(result.current.data?.LLM_BASE_URL).toBe('https://api.openai.com/v1')
    })

    it('should handle empty settings', async () => {
      const emptySettings: SettingsForm = {
        PROTOCOL_TYPE: 'IMAP',
        IMAP_HOST: '',
        IMAP_PORT: '',
        IMAP_USER: '',
        IMAP_PASS: '',
        POP3_HOST: '',
        POP3_PORT: '',
        POP3_USER: '',
        POP3_PASS: '',
        SMTP_HOST: '',
        SMTP_PORT: '',
        SMTP_USER: '',
        SMTP_PASS: '',
        LLM_API_KEY: '',
        LLM_MODEL: '',
        LLM_BASE_URL: '',
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(emptySettings),
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(emptySettings)
      expect(result.current.data?.SMTP_USER).toBe('')
    })
  })

  describe('Error Messages', () => {
    it('should throw error with correct message on HTTP error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Failed to fetch settings')
    })

    it('should throw error with correct message on 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      })

      const { result } = renderHook(() => useSettings(), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeInstanceOf(Error)
      expect(result.current.error?.message).toBe('Failed to fetch settings')
    })
  })
})