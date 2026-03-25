/**
 * useInfiniteEmails Hook
 * Implements infinite scroll for email list using TanStack Query's useInfiniteQuery
 * and IntersectionObserver for automatic loading when scrolling to bottom.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, type RefObject } from 'react'
import { EmailService, type EmailListItem } from '../services/email.service'
import type { EmailClassification } from '@nanomail/shared'

const DEFAULT_LIMIT = 10
const MAX_ITEMS = 200

export interface UseInfiniteEmailsOptions {
  classification?: EmailClassification | 'ALL'
  limit?: number
  maxItems?: number
}

export interface UseInfiniteEmailsReturn {
  emails: EmailListItem[]
  isLoading: boolean
  isFetchingNextPage: boolean
  hasNextPage: boolean
  error: Error | null
  fetchNextPage: () => void
  refetch: () => void
  triggerRef: RefObject<HTMLDivElement>
  containerRef: RefObject<HTMLDivElement>
  hasReachedLimit: boolean
}

export function useInfiniteEmails(options: UseInfiniteEmailsOptions = {}): UseInfiniteEmailsReturn {
  const {
    classification = 'ALL',
    limit = DEFAULT_LIMIT,
    maxItems = MAX_ITEMS
  } = options

  // ========== Refs ==========
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLDivElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // State cache refs (solve Observer closure trap)
  const isFetchingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const isErrorRef = useRef(false)

  // ========== useInfiniteQuery ==========
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch
  } = useInfiniteQuery({
    queryKey: ['emails', classification],
    queryFn: async ({ pageParam }) => {
      const result = await EmailService.getEmails({
        page: pageParam as number,
        limit,
        classification: classification === 'ALL' ? undefined : classification,
      })
      return result
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage.pagination
      return page < totalPages ? page + 1 : undefined
    },
    staleTime: 30_000, // 30 seconds
  })

  // ========== Flatten email list ==========
  const emails = data?.pages.flatMap(page => page.emails) ?? []

  // ========== Deduplicate by id ==========
  const uniqueEmails = emails.filter((email, index, self) =>
    index === self.findIndex(e => e.id === email.id)
  )

  // ========== Safety limit check ==========
  const hasReachedLimit = uniqueEmails.length >= maxItems

  // ========== Sync Ref states ==========
  useEffect(() => {
    isFetchingRef.current = isFetchingNextPage
  }, [isFetchingNextPage])

  useEffect(() => {
    hasNextPageRef.current = hasNextPage && !hasReachedLimit
  }, [hasNextPage, hasReachedLimit])

  useEffect(() => {
    isErrorRef.current = isError
  }, [isError])

  // ========== IntersectionObserver setup ==========
  // Note: Empty deps to initialize only once, avoid destroy/recreate
  useEffect(() => {
    const trigger = triggerRef.current
    if (!trigger) return

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting) return

        // Read latest state from refs to avoid closure trap
        if (isFetchingRef.current) return
        if (!hasNextPageRef.current) return
        if (isErrorRef.current) return // Don't auto-load on error

        fetchNextPage()
      },
      { root: containerRef.current, threshold: 0.1 }
    )

    observerRef.current.observe(trigger)

    return () => {
      observerRef.current?.disconnect()
    }
  }, [fetchNextPage])

  return {
    emails: uniqueEmails,
    isLoading,
    isFetchingNextPage,
    hasNextPage: hasNextPage && !hasReachedLimit,
    error: error as Error | null,
    fetchNextPage,
    refetch,
    triggerRef,
    containerRef,
    hasReachedLimit
  }
}
