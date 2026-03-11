/**
 * Tests for SearchEmailsTool
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { z } from 'zod'
import { SearchEmailsTool, SearchEmailsSchema } from './search-emails'
import type { Email } from '../../../entities/Email.entity'

describe('SearchEmailsTool', () => {
  // Mock query builder with fluent interface
  const createMockQueryBuilder = () => {
    const qb = {
      where: vi.fn(function (this: typeof qb) { return this }),
      andWhere: vi.fn(function (this: typeof qb) { return this }),
      orderBy: vi.fn(function (this: typeof qb) { return this }),
      limit: vi.fn(function (this: typeof qb) { return this }),
      getMany: vi.fn().mockResolvedValue([])
    }
    return qb
  }

  type MockQueryBuilder = ReturnType<typeof createMockQueryBuilder>

  // Create mock repository with query builder
  const createMockRepository = (qb: MockQueryBuilder) => ({
    createQueryBuilder: vi.fn(() => qb),
    find: vi.fn(),
    findOne: vi.fn()
  })

  type MockRepository = ReturnType<typeof createMockRepository>

  let tool: SearchEmailsTool
  let mockRepository: MockRepository
  let mockQueryBuilder: MockQueryBuilder

  beforeEach(() => {
    mockQueryBuilder = createMockQueryBuilder()
    mockRepository = createMockRepository(mockQueryBuilder)
    tool = new SearchEmailsTool(mockRepository as unknown as SearchEmailsTool['emailRepository'])
  })

  describe('schema', () => {
    it('should have correct name', () => {
      expect(tool.name).toBe('search_local_emails')
    })

    it('should have description', () => {
      expect(tool.description).toContain('Search the local email database')
    })

    it('should have valid Zod schema', () => {
      expect(tool.schema).toBeInstanceOf(z.ZodObject)
    })
  })

  describe('SearchEmailsSchema', () => {
    it('should parse valid search params', () => {
      const params = SearchEmailsSchema.parse({
        query: 'important meeting',
        limit: 10
      })

      expect(params.query).toBe('important meeting')
      expect(params.limit).toBe(10)
    })

    it('should apply default limit', () => {
      const params = SearchEmailsSchema.parse({ query: 'test' })

      expect(params.limit).toBe(5)
    })

    it('should accept optional sender filter', () => {
      const params = SearchEmailsSchema.parse({
        query: 'test',
        sender: 'john@example.com'
      })

      expect(params.sender).toBe('john@example.com')
    })

    it('should accept optional date filters', () => {
      const params = SearchEmailsSchema.parse({
        query: 'test',
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59Z'
      })

      expect(params.dateFrom).toBe('2024-01-01T00:00:00Z')
      expect(params.dateTo).toBe('2024-12-31T23:59:59Z')
    })

    it('should reject invalid limit range', () => {
      expect(() => SearchEmailsSchema.parse({ query: 'test', limit: 0 })).toThrow()
      expect(() => SearchEmailsSchema.parse({ query: 'test', limit: 100 })).toThrow()
    })
  })

  describe('toSchema', () => {
    it('should generate OpenAI function schema', () => {
      const schema = tool.toSchema()

      expect(schema.type).toBe('function')
      expect(schema.function.name).toBe('search_local_emails')
      expect(schema.function.parameters).toHaveProperty('properties')
      expect(schema.function.parameters.properties).toHaveProperty('query')
      expect(schema.function.parameters.properties).toHaveProperty('limit')
    })
  })

  describe('execute', () => {
    it('should return formatted results when emails found', async () => {
      const mockEmails: Partial<Email>[] = [
        {
          id: 1,
          sender: 'john@example.com',
          subject: 'Meeting Tomorrow',
          date: new Date('2024-01-15'),
          snippet: 'Let\'s discuss the project...'
        },
        {
          id: 2,
          sender: 'jane@example.com',
          subject: 'Re: Meeting',
          date: new Date('2024-01-16'),
          snippet: 'Sounds good to me!'
        }
      ]

      mockQueryBuilder.getMany.mockResolvedValueOnce(mockEmails)

      const result = await tool.execute({
        query: 'meeting',
        limit: 5
      })

      expect(result).toContain('[1] ID: 1')
      expect(result).toContain('From: john@example.com')
      expect(result).toContain('Subject: Meeting Tomorrow')
      expect(result).toContain('[2] ID: 2')
    })

    it('should return message when no emails found', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([])

      const result = await tool.execute({
        query: 'nonexistent',
        limit: 5
      })

      expect(result).toBe('No emails found matching the query.')
    })

    it('should call query builder with correct parameters', async () => {
      mockQueryBuilder.getMany.mockResolvedValueOnce([])

      await tool.execute({
        query: 'important',
        limit: 10,
        sender: 'john@example.com',
        dateFrom: '2024-01-01T00:00:00Z',
        dateTo: '2024-12-31T23:59:59Z'
      })

      // Verify query builder methods were called
      expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith('email')
      expect(mockQueryBuilder.where).toHaveBeenCalled()
      expect(mockQueryBuilder.andWhere).toHaveBeenCalled()
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith('email.date', 'DESC')
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(10)
    })

    it('should handle errors gracefully', async () => {
      mockQueryBuilder.getMany.mockRejectedValueOnce(new Error('Database error'))

      const result = await tool.execute({
        query: 'test',
        limit: 5
      })

      expect(result).toContain('Error searching emails')
    })
  })
})