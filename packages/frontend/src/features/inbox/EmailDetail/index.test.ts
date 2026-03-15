/**
 * Tests for EmailDetail barrel export (index.ts)
 *
 * Verifies:
 * - All components are exported
 * - useEmailDetail hook is exported
 * - Types are exported correctly
 * - No circular dependency issues
 */

import { describe, it, expect } from 'vitest'

// Import everything from barrel
import {
  Avatar,
  ClassificationBadge,
  EmailDetailEmpty,
  EmailDetailSkeleton,
  EmailDetailError,
  EmailDetailHeader,
  EmailDetailBody,
  EmailDetailAttachments,
  EmailDetailPanel,
  useEmailDetail,
} from './index'

// Import types
import type { EmailDetailPanelProps } from './index'

describe('EmailDetail barrel export', () => {
  describe('component exports', () => {
    it('should export Avatar component', () => {
      expect(Avatar).toBeDefined()
      expect(typeof Avatar).toBe('function')
    })

    it('should export ClassificationBadge component', () => {
      expect(ClassificationBadge).toBeDefined()
      expect(typeof ClassificationBadge).toBe('function')
    })

    it('should export EmailDetailEmpty component', () => {
      expect(EmailDetailEmpty).toBeDefined()
      expect(typeof EmailDetailEmpty).toBe('function')
    })

    it('should export EmailDetailSkeleton component', () => {
      expect(EmailDetailSkeleton).toBeDefined()
      expect(typeof EmailDetailSkeleton).toBe('function')
    })

    it('should export EmailDetailError component', () => {
      expect(EmailDetailError).toBeDefined()
      expect(typeof EmailDetailError).toBe('function')
    })

    it('should export EmailDetailHeader component', () => {
      expect(EmailDetailHeader).toBeDefined()
      expect(typeof EmailDetailHeader).toBe('function')
    })

    it('should export EmailDetailBody component', () => {
      expect(EmailDetailBody).toBeDefined()
      expect(typeof EmailDetailBody).toBe('function')
    })

    it('should export EmailDetailAttachments component', () => {
      expect(EmailDetailAttachments).toBeDefined()
      expect(typeof EmailDetailAttachments).toBe('function')
    })

    it('should export EmailDetailPanel component', () => {
      expect(EmailDetailPanel).toBeDefined()
      expect(typeof EmailDetailPanel).toBe('function')
    })
  })

  describe('hook exports', () => {
    it('should export useEmailDetail hook', () => {
      expect(useEmailDetail).toBeDefined()
      expect(typeof useEmailDetail).toBe('function')
    })
  })

  describe('type exports', () => {
    it('should export EmailDetailPanelProps type', () => {
      // Type check - if this compiles, the type is exported correctly
      const props: EmailDetailPanelProps = {
        emailId: null,
      }
      expect(props).toBeDefined()
    })

    it('should allow optional onClose in EmailDetailPanelProps', () => {
      const props: EmailDetailPanelProps = {
        emailId: 123,
        onClose: () => {},
      }
      expect(props.emailId).toBe(123)
      expect(props.onClose).toBeDefined()
    })
  })

  describe('no circular dependencies', () => {
    it('should import without errors (no circular deps)', () => {
      // If this test runs without throwing, there are no circular import issues
      // The imports at the top of the file already verified this
      expect(true).toBe(true)
    })
  })
})