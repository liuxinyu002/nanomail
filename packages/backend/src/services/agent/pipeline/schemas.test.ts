/**
 * Tests for Pipeline Schemas
 * TDD: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest'
import { EmailAnalysisSchema, ActionItemSchema } from './schemas'

describe('EmailAnalysisSchema', () => {
  describe('classification', () => {
    it('should accept valid classifications', () => {
      const validClassifications = ['SPAM', 'NEWSLETTER', 'IMPORTANT']

      for (const classification of validClassifications) {
        const result = EmailAnalysisSchema.safeParse({
          classification,
          confidence: 0.9,
          summary: 'Test summary',
          actionItems: []
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid classifications', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'INVALID',
        confidence: 0.9,
        summary: 'Test summary',
        actionItems: []
      })
      expect(result.success).toBe(false)
    })

    it('should require classification', () => {
      const result = EmailAnalysisSchema.safeParse({
        confidence: 0.9,
        summary: 'Test summary',
        actionItems: []
      })
      expect(result.success).toBe(false)
    })
  })

  describe('confidence', () => {
    it('should accept confidence between 0 and 1', () => {
      const validConfidences = [0, 0.5, 1, 0.99]

      for (const confidence of validConfidences) {
        const result = EmailAnalysisSchema.safeParse({
          classification: 'IMPORTANT',
          confidence,
          summary: 'Test summary',
          actionItems: []
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject confidence below 0', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: -0.1,
        summary: 'Test summary',
        actionItems: []
      })
      expect(result.success).toBe(false)
    })

    it('should reject confidence above 1', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 1.1,
        summary: 'Test summary',
        actionItems: []
      })
      expect(result.success).toBe(false)
    })

    it('should require confidence', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        summary: 'Test summary',
        actionItems: []
      })
      expect(result.success).toBe(false)
    })
  })

  describe('summary', () => {
    it('should accept summary under 300 characters', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 0.9,
        summary: 'a'.repeat(300),
        actionItems: []
      })
      expect(result.success).toBe(true)
    })

    it('should reject summary over 300 characters', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 0.9,
        summary: 'a'.repeat(301),
        actionItems: []
      })
      expect(result.success).toBe(false)
    })

    it('should allow empty summary for SPAM', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'SPAM',
        confidence: 0.9,
        summary: '',
        actionItems: []
      })
      expect(result.success).toBe(true)
    })

    it('should allow empty summary for NEWSLETTER', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'NEWSLETTER',
        confidence: 0.9,
        summary: '',
        actionItems: []
      })
      expect(result.success).toBe(true)
    })
  })

  describe('actionItems', () => {
    it('should accept empty actionItems array', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 0.9,
        summary: 'Test summary',
        actionItems: []
      })
      expect(result.success).toBe(true)
    })

    it('should accept valid action items', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 0.9,
        summary: 'Test summary',
        actionItems: [
          {
            description: 'Reply to email',
            urgency: 'HIGH',
            deadline: '2024-12-31'
          }
        ]
      })
      expect(result.success).toBe(true)
    })

    it('should accept null deadline', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 0.9,
        summary: 'Test summary',
        actionItems: [
          {
            description: 'Reply to email',
            urgency: 'MEDIUM',
            deadline: null
          }
        ]
      })
      expect(result.success).toBe(true)
    })

    it('should require actionItems', () => {
      const result = EmailAnalysisSchema.safeParse({
        classification: 'IMPORTANT',
        confidence: 0.9,
        summary: 'Test summary'
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('ActionItemSchema', () => {
  describe('description', () => {
    it('should require description', () => {
      const result = ActionItemSchema.safeParse({
        urgency: 'HIGH',
        deadline: null
      })
      expect(result.success).toBe(false)
    })

    it('should accept valid description', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Complete task',
        urgency: 'HIGH',
        deadline: null
      })
      expect(result.success).toBe(true)
    })
  })

  describe('urgency', () => {
    it('should accept valid urgency levels', () => {
      const validUrgencies = ['HIGH', 'MEDIUM', 'LOW']

      for (const urgency of validUrgencies) {
        const result = ActionItemSchema.safeParse({
          description: 'Task',
          urgency,
          deadline: null
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid urgency', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Task',
        urgency: 'CRITICAL',
        deadline: null
      })
      expect(result.success).toBe(false)
    })

    it('should require urgency', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Task',
        deadline: null
      })
      expect(result.success).toBe(false)
    })
  })

  describe('deadline', () => {
    it('should accept YYYY-MM-DD format', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Task',
        urgency: 'HIGH',
        deadline: '2024-12-31'
      })
      expect(result.success).toBe(true)
    })

    it('should accept null deadline', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Task',
        urgency: 'HIGH',
        deadline: null
      })
      expect(result.success).toBe(true)
    })

    it('should reject invalid date format', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Task',
        urgency: 'HIGH',
        deadline: '12/31/2024'
      })
      expect(result.success).toBe(false)
    })

    it('should reject ISO datetime format', () => {
      const result = ActionItemSchema.safeParse({
        description: 'Task',
        urgency: 'HIGH',
        deadline: '2024-12-31T10:00:00Z'
      })
      expect(result.success).toBe(false)
    })
  })
})

describe('Schema Type Inference', () => {
  it('should infer correct types from schema', () => {
    // This test verifies TypeScript compilation with correct types
    const input = {
      classification: 'IMPORTANT' as const,
      confidence: 0.95,
      summary: 'Meeting scheduled for next week',
      actionItems: [
        {
          description: 'Prepare presentation',
          urgency: 'HIGH' as const,
          deadline: '2024-12-31'
        }
      ]
    }

    const result = EmailAnalysisSchema.parse(input)

    // TypeScript should infer these types correctly
    expect(result.classification).toBe('IMPORTANT')
    expect(result.confidence).toBe(0.95)
    expect(result.summary).toBe('Meeting scheduled for next week')
    expect(result.actionItems[0].description).toBe('Prepare presentation')
    expect(result.actionItems[0].urgency).toBe('HIGH')
    expect(result.actionItems[0].deadline).toBe('2024-12-31')
  })
})