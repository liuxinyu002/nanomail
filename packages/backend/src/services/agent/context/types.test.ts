/**
 * Tests for ContextBuilder Service - Role-based Prompt Assembly
 * TDD: Write tests first, then implement
 * Reference: docs/phase_2/plans/plan_3_agent.md
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'fs'
import type { LLMResponse, ToolCallRequest } from '../../llm/types'

// Suppress logger in tests
vi.mock('../../../config/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  })
}))

// Import after mock
import { ContextBuilder, type AgentRole, type RoleConfig } from './types'

describe('ContextBuilder - Role-based Prompt Assembly', () => {
  const defaultPromptsDir = '/services/agent/prompts'
  let contextBuilder: ContextBuilder
  let readFileSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    readFileSpy = vi.spyOn(fs, 'readFile')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Helper to mock file reads
   * @param files - Map of filename to content (null means file not found)
   */
  function mockFiles(files: Record<string, string | null>): void {
    readFileSpy.mockImplementation(async (path: string) => {
      // Extract filename from path
      const filename = path.split('/').pop() || ''
      if (filename in files) {
        const content = files[filename]
        if (content === null) {
          throw new Error('ENOENT: file not found')
        }
        return content
      }
      throw new Error('ENOENT: file not found')
    })
  }

  describe('ROLE_CONFIG', () => {
    it('should define email-analyzer role with correct files', () => {
      const config = ContextBuilder.ROLE_CONFIG['email-analyzer']
      expect(config).toBeDefined()
      expect(config.files).toContain('AGENTS.md')
      expect(config.files).toContain('email-analyzer.md')
      expect(config.files).toContain('USER.md')
      expect(config.files).toContain('TOOLS.md')
    })

    it('should define email-analyzer required files correctly', () => {
      const config = ContextBuilder.ROLE_CONFIG['email-analyzer']
      expect(config.required).toContain('AGENTS.md')
      expect(config.required).toContain('email-analyzer.md')
      expect(config.required).not.toContain('USER.md') // USER.md is optional
    })

    it('should define draft-agent role with correct files', () => {
      const config = ContextBuilder.ROLE_CONFIG['draft-agent']
      expect(config).toBeDefined()
      expect(config.files).toContain('AGENTS.md')
      expect(config.files).toContain('SOUL.md')
      expect(config.files).toContain('MEMORY.md')
      expect(config.files).toContain('USER.md')
      expect(config.files).toContain('draft-agent.md')
      expect(config.files).toContain('TOOLS.md')
    })

    it('should define draft-agent required files correctly', () => {
      const config = ContextBuilder.ROLE_CONFIG['draft-agent']
      expect(config.required).toContain('AGENTS.md')
      expect(config.required).toContain('draft-agent.md')
      expect(config.required).not.toContain('SOUL.md') // SOUL.md is optional
      expect(config.required).not.toContain('MEMORY.md') // MEMORY.md is optional
    })

    it('should order files according to primacy-recency effect', () => {
      const emailAnalyzerConfig = ContextBuilder.ROLE_CONFIG['email-analyzer']
      const draftAgentConfig = ContextBuilder.ROLE_CONFIG['draft-agent']

      // AGENTS.md should be first (primacy effect)
      expect(emailAnalyzerConfig.files[0]).toBe('AGENTS.md')
      expect(draftAgentConfig.files[0]).toBe('AGENTS.md')

      // TOOLS.md should be last (recency effect)
      expect(emailAnalyzerConfig.files[emailAnalyzerConfig.files.length - 1]).toBe('TOOLS.md')
      expect(draftAgentConfig.files[draftAgentConfig.files.length - 1]).toBe('TOOLS.md')
    })
  })

  describe('Constructor - Path Resolution', () => {
    it('should use constructor parameter when provided', () => {
      const customPath = '/custom/prompts'
      contextBuilder = new ContextBuilder(customPath)

      expect(contextBuilder.getPromptsDir()).toBe(customPath)
    })

    it('should use PROMPTS_DIR env var when no constructor param', () => {
      process.env.PROMPTS_DIR = '/env/prompts'
      contextBuilder = new ContextBuilder()
      expect(contextBuilder.getPromptsDir()).toBe('/env/prompts')
      delete process.env.PROMPTS_DIR
    })

    it('should use default path when no param and no env var', () => {
      contextBuilder = new ContextBuilder()
      // Default path is relative to the module: ../prompts from context/types.ts
      expect(contextBuilder.getPromptsDir()).toContain('prompts')
    })
  })

  describe('buildSystemPrompt - Required Files', () => {
    it('should throw error when AGENTS.md is missing for email-analyzer', async () => {
      mockFiles({
        'email-analyzer.md': 'Analyzer content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      await expect(contextBuilder.buildSystemPrompt('email-analyzer'))
        .rejects.toThrow('Required prompt file missing: AGENTS.md')
    })

    it('should throw error when email-analyzer.md is missing for email-analyzer role', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      await expect(contextBuilder.buildSystemPrompt('email-analyzer'))
        .rejects.toThrow('Required prompt file missing: email-analyzer.md')
    })

    it('should throw error when draft-agent.md is missing for draft-agent role', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      await expect(contextBuilder.buildSystemPrompt('draft-agent'))
        .rejects.toThrow('Required prompt file missing: draft-agent.md')
    })
  })

  describe('buildSystemPrompt - Optional Files', () => {
    it('should gracefully skip optional USER.md for email-analyzer', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')
      expect(prompt).toBeDefined()
      expect(prompt).not.toContain('undefined')
    })

    it('should gracefully skip optional SOUL.md for draft-agent', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'draft-agent.md': 'Draft content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      const prompt = await contextBuilder.buildSystemPrompt('draft-agent')
      expect(prompt).toBeDefined()
      expect(prompt).not.toContain('<soul>')
    })

    it('should gracefully skip optional MEMORY.md for draft-agent', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'draft-agent.md': 'Draft content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      const prompt = await contextBuilder.buildSystemPrompt('draft-agent')
      expect(prompt).toBeDefined()
      expect(prompt).not.toContain('<memory>')
    })
  })

  describe('buildSystemPrompt - XML Tag Wrapping', () => {
    it('should wrap each file content with XML tags', async () => {
      mockFiles({
        'AGENTS.md': 'Agent behavior rules content',
        'email-analyzer.md': 'Email analysis rules content',
        'USER.md': 'User preferences',
        'TOOLS.md': 'Tool usage'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      expect(prompt).toContain('<agents>')
      expect(prompt).toContain('</agents>')
      expect(prompt).toContain('Agent behavior rules content')
      expect(prompt).toContain('<email-analyzer>')
      expect(prompt).toContain('</email-analyzer>')
      expect(prompt).toContain('Email analysis rules content')
    })

    it('should use lowercase file names for XML tags', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      // Should be lowercase, not AGENTS or EMAIL-ANALYZER
      expect(prompt).toMatch(/<agents>[\s\S]*<\/agents>/)
      expect(prompt).toMatch(/<email-analyzer>[\s\S]*<\/email-analyzer>/)
    })

    it('should not include XML tags for missing optional files', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content'
        // USER.md and TOOLS.md are missing
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      expect(prompt).not.toContain('<user>')
      expect(prompt).not.toContain('<tools>')
    })
  })

  describe('buildSystemPrompt - Memory Safeguard', () => {
    it('should truncate MEMORY.md when exceeding 5000 characters', async () => {
      const longMemory = 'x'.repeat(6000)
      mockFiles({
        'AGENTS.md': 'Agent content',
        'draft-agent.md': 'Draft content',
        'MEMORY.md': longMemory
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('draft-agent')

      // Should not contain the full 6000 characters
      expect(prompt).not.toContain('x'.repeat(6000))

      // Should contain truncated content (last 5000 chars)
      const truncatedMemory = longMemory.slice(-5000)
      expect(prompt).toContain(truncatedMemory)
    })

    it('should keep MEMORY.md content when under 5000 characters', async () => {
      const shortMemory = 'This is a short memory.'
      mockFiles({
        'AGENTS.md': 'Agent content',
        'draft-agent.md': 'Draft content',
        'SOUL.md': 'Soul content',
        'MEMORY.md': shortMemory,
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('draft-agent')

      expect(prompt).toContain(shortMemory)
    })
  })

  describe('buildSystemPrompt - Assembly Order', () => {
    it('should assemble prompt in correct order for email-analyzer', async () => {
      mockFiles({
        'AGENTS.md': 'FIRST',
        'USER.md': 'SECOND',
        'email-analyzer.md': 'THIRD',
        'TOOLS.md': 'FOURTH'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      // Verify order by checking indices
      const firstIndex = prompt.indexOf('FIRST')
      const secondIndex = prompt.indexOf('SECOND')
      const thirdIndex = prompt.indexOf('THIRD')
      const fourthIndex = prompt.indexOf('FOURTH')

      expect(firstIndex).toBeLessThan(secondIndex)
      expect(secondIndex).toBeLessThan(thirdIndex)
      expect(thirdIndex).toBeLessThan(fourthIndex)
    })

    it('should assemble prompt in correct order for draft-agent', async () => {
      mockFiles({
        'AGENTS.md': 'A_FIRST',
        'SOUL.md': 'B_SECOND',
        'MEMORY.md': 'C_THIRD',
        'USER.md': 'D_FOURTH',
        'draft-agent.md': 'E_FIFTH',
        'TOOLS.md': 'F_SIXTH'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('draft-agent')

      // Verify order
      const indices = {
        A: prompt.indexOf('A_FIRST'),
        B: prompt.indexOf('B_SECOND'),
        C: prompt.indexOf('C_THIRD'),
        D: prompt.indexOf('D_FOURTH'),
        E: prompt.indexOf('E_FIFTH'),
        F: prompt.indexOf('F_SIXTH')
      }

      expect(indices.A).toBeLessThan(indices.B)
      expect(indices.B).toBeLessThan(indices.C)
      expect(indices.C).toBeLessThan(indices.D)
      expect(indices.D).toBeLessThan(indices.E)
      expect(indices.E).toBeLessThan(indices.F)
    })
  })

  describe('buildSystemPrompt - File Content Handling', () => {
    it('should skip empty files', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': '', // Empty file
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      // Should have agents and email-analyzer tags
      expect(prompt).toContain('<agents>')
      expect(prompt).toContain('<email-analyzer>')

      // Should NOT have user tags (empty file skipped)
      expect(prompt).not.toContain('<user>')
    })

    it('should skip whitespace-only files', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': '   \n\n  \t  ', // Whitespace only
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      expect(prompt).not.toContain('<user>')
    })
  })

  describe('buildMessages - Role-based Context', () => {
    it('should build messages with role-based system prompt', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const messages = await contextBuilder.buildMessages({
        agentRole: 'email-analyzer',
        history: [],
        currentMessage: 'Analyze this email'
      })

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('system')
      expect(messages[1].role).toBe('user')
      expect(messages[1].content).toBe('Analyze this email')
    })

    it('should include history messages', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const history = [
        { role: 'user' as const, content: 'Previous message' },
        { role: 'assistant' as const, content: 'Previous response' }
      ]

      const messages = await contextBuilder.buildMessages({
        agentRole: 'email-analyzer',
        history,
        currentMessage: 'New message'
      })

      expect(messages).toHaveLength(4)
      expect(messages[1]).toEqual(history[0])
      expect(messages[2]).toEqual(history[1])
    })

    it('should support draft-agent role', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'draft-agent.md': 'Draft content',
        'SOUL.md': 'Soul content',
        'MEMORY.md': 'Memory content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const messages = await contextBuilder.buildMessages({
        agentRole: 'draft-agent',
        history: [],
        currentMessage: 'Draft a reply'
      })

      expect(messages[0].role).toBe('system')
      // Should include SOUL and MEMORY for draft-agent
      expect(messages[0].content).toContain('<soul>')
      expect(messages[0].content).toContain('<memory>')
    })

    it('should default to email-analyzer role when not specified', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const messages = await contextBuilder.buildMessages({
        history: [],
        currentMessage: 'Hello'
      })

      expect(messages[0].content).toContain('<email-analyzer>')
    })
  })

  describe('buildRuntimeContext', () => {
    beforeEach(() => {
      contextBuilder = new ContextBuilder()
    })

    it('should build runtime context with current time', () => {
      const time = new Date('2024-01-15T10:30:00Z')
      const ctx = contextBuilder.buildRuntimeContext({
        currentTime: time
      })

      expect(ctx).toContain('Current time:')
      expect(ctx).toContain('2024-01-15')
    })

    it('should include channel when provided', () => {
      const ctx = contextBuilder.buildRuntimeContext({
        channel: 'email'
      })

      expect(ctx).toContain('Channel: email')
    })

    it('should return empty string when no context provided', () => {
      const ctx = contextBuilder.buildRuntimeContext(undefined)
      expect(ctx).toBe('')
    })
  })

  describe('addAssistantMessage', () => {
    beforeEach(() => {
      contextBuilder = new ContextBuilder()
    })

    it('should add assistant message to history', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = [
        { role: 'user', content: 'Hello' }
      ]

      const response: LLMResponse = {
        content: 'Hi there!',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated).toHaveLength(2)
      expect(updated[1].role).toBe('assistant')
      expect(updated[1].content).toBe('Hi there!')
    })

    it('should include tool calls when present', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = []

      const toolCalls: ToolCallRequest[] = [
        { id: 'call-1', name: 'search_emails', arguments: { query: 'test' } }
      ]

      const response: LLMResponse = {
        content: null,
        toolCalls,
        finishReason: 'tool_calls',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated[0].toolCalls).toEqual(toolCalls)
    })

    it('should not add toolCalls field when empty', () => {
      const messages: Array<{ role: string; content: string | null; toolCalls?: ToolCallRequest[] }> = []

      const response: LLMResponse = {
        content: 'Response',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 }
      }

      const updated = contextBuilder.addAssistantMessage(messages, response)

      expect(updated[0].toolCalls).toBeUndefined()
    })
  })

  describe('addToolResult', () => {
    beforeEach(() => {
      contextBuilder = new ContextBuilder()
    })

    it('should add tool result to messages', () => {
      const messages: Array<{ role: string; content: string | null; toolCallId?: string }> = []

      const updated = contextBuilder.addToolResult(messages, 'call-1', 'Tool execution result')

      expect(updated).toHaveLength(1)
      expect(updated[0].role).toBe('tool')
      expect(updated[0].content).toBe('Tool execution result')
      expect(updated[0].toolCallId).toBe('call-1')
    })

    it('should sanitize empty content to (empty)', () => {
      const messages: Array<{ role: string; content: string | null; toolCallId?: string }> = []

      const updated = contextBuilder.addToolResult(messages, 'call-1', '')

      expect(updated[0].content).toBe('(empty)')
    })
  })

  describe('Edge Cases', () => {
    it('should handle concurrent file reads correctly', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      // Run multiple concurrent builds
      const results = await Promise.all([
        contextBuilder.buildSystemPrompt('email-analyzer'),
        contextBuilder.buildSystemPrompt('email-analyzer'),
        contextBuilder.buildSystemPrompt('email-analyzer')
      ])

      // All results should be identical
      expect(results[0]).toBe(results[1])
      expect(results[1]).toBe(results[2])
    })

    it('should handle special characters in file content', async () => {
      mockFiles({
        'AGENTS.md': 'Content with <special> & characters',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      // Content should be preserved as-is (no escaping in system prompt)
      expect(prompt).toContain('Content with <special> & characters')
    })

    it('should handle unicode in file content', async () => {
      mockFiles({
        'AGENTS.md': 'Unicode: \u4e16\u754c',
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')

      expect(prompt).toContain('Unicode: \u4e16\u754c')
    })

    it('should handle very large file content', async () => {
      const largeContent = 'x'.repeat(100000)
      mockFiles({
        'AGENTS.md': largeContent,
        'email-analyzer.md': 'Analyzer content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      // Should not throw
      const prompt = await contextBuilder.buildSystemPrompt('email-analyzer')
      expect(prompt).toContain(largeContent)
    })
  })
})