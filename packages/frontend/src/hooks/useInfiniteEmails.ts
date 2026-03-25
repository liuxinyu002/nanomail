/**
 * useInfiniteEmails Hook
 * Implements infinite scroll for email list using TanStack Query's useInfiniteQuery
 * and IntersectionObserver for automatic loading when scrolling to bottom.
 */

import { useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useRef, useCallback } from 'react'
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
  triggerRef: (node: HTMLDivElement | null) => void
  containerRef: (node: HTMLDivElement | null) => void
  hasReachedLimit: boolean
}

export function useInfiniteEmails(options: UseInfiniteEmailsOptions = {}): UseInfiniteEmailsReturn {
  const {
    classification = 'ALL',
    limit = DEFAULT_LIMIT,
    maxItems = MAX_ITEMS
  } = options

  // ========== Refs for DOM elements ==========
  const containerElRef = useRef<HTMLDivElement | null>(null)
  const triggerElRef = useRef<HTMLDivElement | null>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // State cache refs (solve Observer closure trap)
  const isFetchingRef = useRef(false)
  const hasNextPageRef = useRef(true)
  const isErrorRef = useRef(false)
  const fetchNextPageRef = useRef<() => void>(() => {})

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
    queryFn: async ({ pageParam, signal }) => {
      const result = await EmailService.getEmails({
        page: pageParam as number,
        limit,
        classification: classification === 'ALL' ? undefined : classification,
        signal,
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

  useEffect(() => {
    fetchNextPageRef.current = fetchNextPage
  }, [fetchNextPage])

  // ========== Setup Observer when both elements are ready ==========
  const setupObserver = useCallback(() => {
    // 先清理旧的 observer，防止内存泄漏和重复绑定
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    const container = containerElRef.current
    const trigger = triggerElRef.current

    // 如果容器或触发器不存在，说明元素处于卸载/未准备好状态
    if (!container || !trigger) return

    // 两个元素都准备好了，创建新的 Observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry.isIntersecting) return

        // Read latest state from refs to avoid closure trap
        if (isFetchingRef.current) return
        if (!hasNextPageRef.current) return
        if (isErrorRef.current) return

        fetchNextPageRef.current()
      },
      { root: container, threshold: 0.1 }
    )

    observerRef.current.observe(trigger)
  }, [])

  // ========== Callback refs ==========
  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerElRef.current = node
    // 即使 node 为 null（元素卸载），也需要调用 setupObserver 执行清理
    setupObserver()
  }, [setupObserver])

  const triggerRef = useCallback((node: HTMLDivElement | null) => {
    triggerElRef.current = node
    setupObserver()
  }, [setupObserver])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

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
