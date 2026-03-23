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

    it('should define todo-agent role with correct files', () => {
      const config = ContextBuilder.ROLE_CONFIG['todo-agent']
      expect(config).toBeDefined()
      expect(config.files).toContain('AGENTS.md')
      expect(config.files).toContain('USER.md')
      expect(config.files).toContain('todo-agent.md')
      expect(config.files).toContain('TOOLS.md')
    })

    it('should define todo-agent required files correctly', () => {
      const config = ContextBuilder.ROLE_CONFIG['todo-agent']
      expect(config.required).toContain('AGENTS.md')
      expect(config.required).toContain('todo-agent.md')
      expect(config.required).not.toContain('USER.md') // USER.md is optional
    })

    it('should order files according to primacy-recency effect', () => {
      const emailAnalyzerConfig = ContextBuilder.ROLE_CONFIG['email-analyzer']
      const todoAgentConfig = ContextBuilder.ROLE_CONFIG['todo-agent']

      // AGENTS.md should be first (primacy effect)
      expect(emailAnalyzerConfig.files[0]).toBe('AGENTS.md')
      expect(todoAgentConfig.files[0]).toBe('AGENTS.md')

      // TOOLS.md should be last (recency effect)
      expect(emailAnalyzerConfig.files[emailAnalyzerConfig.files.length - 1]).toBe('TOOLS.md')
      expect(todoAgentConfig.files[todoAgentConfig.files.length - 1]).toBe('TOOLS.md')
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

    it('should throw error when todo-agent.md is missing for todo-agent role', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      await expect(contextBuilder.buildSystemPrompt('todo-agent'))
        .rejects.toThrow('Required prompt file missing: todo-agent.md')
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

    it('should gracefully skip optional USER.md for todo-agent', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'todo-agent.md': 'Todo content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      const prompt = await contextBuilder.buildSystemPrompt('todo-agent')
      expect(prompt).toBeDefined()
      expect(prompt).not.toContain('<user>')
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
    // Note: Memory Safeguard is implemented but no current role uses MEMORY.md
    // The safeguard will activate when a role includes MEMORY.md in its config
    // This test verifies the safeguard logic works correctly with any file named MEMORY.md
    it('should skip memory safeguard when MEMORY.md is not in role config', async () => {
      // todo-agent does not include MEMORY.md in its config
      mockFiles({
        'AGENTS.md': 'Agent content',
        'todo-agent.md': 'Todo content',
        'MEMORY.md': 'This should be ignored since not in config'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('todo-agent')

      // MEMORY.md should NOT be included since it's not in todo-agent's file list
      expect(prompt).not.toContain('This should be ignored since not in config')
    })

    it('should handle large content files gracefully', async () => {
      const largeContent = 'x'.repeat(100000)
      mockFiles({
        'AGENTS.md': largeContent,
        'todo-agent.md': 'Todo content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)

      // Should not throw
      const prompt = await contextBuilder.buildSystemPrompt('todo-agent')
      expect(prompt).toContain(largeContent)
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

    it('should assemble prompt in correct order for todo-agent', async () => {
      mockFiles({
        'AGENTS.md': 'A_FIRST',
        'USER.md': 'B_SECOND',
        'todo-agent.md': 'C_THIRD',
        'TOOLS.md': 'D_FOURTH'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const prompt = await contextBuilder.buildSystemPrompt('todo-agent')

      // Verify order
      const indices = {
        A: prompt.indexOf('A_FIRST'),
        B: prompt.indexOf('B_SECOND'),
        C: prompt.indexOf('C_THIRD'),
        D: prompt.indexOf('D_FOURTH')
      }

      expect(indices.A).toBeLessThan(indices.B)
      expect(indices.B).toBeLessThan(indices.C)
      expect(indices.C).toBeLessThan(indices.D)
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

    it('should support todo-agent role', async () => {
      mockFiles({
        'AGENTS.md': 'Agent content',
        'todo-agent.md': 'Todo content',
        'USER.md': 'User content',
        'TOOLS.md': 'Tools content'
      })

      contextBuilder = new ContextBuilder(defaultPromptsDir)
      const messages = await contextBuilder.buildMessages({
        agentRole: 'todo-agent',
        history: [],
        currentMessage: 'Create a todo'
      })

      expect(messages[0].role).toBe('system')
      // Should include todo-agent prompt
      expect(messages[0].content).toContain('<todo-agent>')
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

  // ==========================================================================
  // Phase 4: Prompt Caching Tests
  // ==========================================================================

  describe('Phase 4: Prompt Caching', () => {
    beforeEach(() => {
      contextBuilder = new ContextBuilder('/nonexistent/prompts')
    })

    describe('setCachedPrompt / getCachedPrompt', () => {
      it('should set and get a cached prompt', () => {
        const promptContent = '# Todo Agent\n\nYou are a todo assistant.'
        contextBuilder.setCachedPrompt('todo-agent', promptContent)

        const cached = contextBuilder.getCachedPrompt('todo-agent')
        expect(cached).toBe(promptContent)
      })

      it('should return undefined for non-existent prompt', () => {
        const cached = contextBuilder.getCachedPrompt('non-existent')
        expect(cached).toBeUndefined()
      })

      it('should allow multiple prompts to be cached', () => {
        contextBuilder.setCachedPrompt('todo-agent', 'Todo prompt')
        contextBuilder.setCachedPrompt('email-analyzer', 'Email analyzer prompt')

        expect(contextBuilder.getCachedPrompt('todo-agent')).toBe('Todo prompt')
        expect(contextBuilder.getCachedPrompt('email-analyzer')).toBe('Email analyzer prompt')
      })

      it('should overwrite existing cached prompt', () => {
        contextBuilder.setCachedPrompt('todo-agent', 'Original prompt')
        contextBuilder.setCachedPrompt('todo-agent', 'Updated prompt')

        expect(contextBuilder.getCachedPrompt('todo-agent')).toBe('Updated prompt')
      })
    })

    describe('buildRuntimeContext - Phase 4', () => {
      it('should include timeZone if provided', () => {
        const ctx = contextBuilder.buildRuntimeContext({
          currentTime: new Date('2024-01-15T10:30:00.000Z'),
          timeZone: 'Asia/Shanghai'
        })

        expect(ctx).toContain('Time zone: Asia/Shanghai')
      })

      it('should include channel if provided', () => {
        const ctx = contextBuilder.buildRuntimeContext({
          currentTime: new Date('2024-01-15T10:30:00.000Z'),
          channel: 'web'
        })

        expect(ctx).toContain('Channel: web')
      })

      it('should include chatId if provided', () => {
        const ctx = contextBuilder.buildRuntimeContext({
          currentTime: new Date('2024-01-15T10:30:00.000Z'),
          chatId: 'chat-123'
        })

        expect(ctx).toContain('Chat ID: chat-123')
      })
    })

    describe('buildSystemMessage', () => {
      it('should combine cached prompt with runtime context', () => {
        const promptContent = '# Todo Agent\n\nYou are a todo assistant.'
        contextBuilder.setCachedPrompt('todo-agent', promptContent)

        const result = contextBuilder.buildSystemMessage('todo-agent', {
          currentTime: new Date('2024-01-15T10:30:00.000Z'),
          timeZone: 'Asia/Shanghai'
        })

        // Should contain the base prompt
        expect(result).toContain('# Todo Agent')
        expect(result).toContain('You are a todo assistant')

        // Should contain runtime context
        expect(result).toContain('Current time: 2024-01-15T10:30:00.000Z')
        expect(result).toContain('Time zone: Asia/Shanghai')

        // Should have separator
        expect(result).toContain('---')
      })

      it('should throw error if prompt not found in cache', () => {
        expect(() => {
          contextBuilder.buildSystemMessage('non-existent', {
            currentTime: new Date('2024-01-15T10:30:00.000Z')
          })
        }).toThrow("Prompt 'non-existent' not found in cache")
      })

      it('should work without runtime context', () => {
        const promptContent = 'Simple prompt'
        contextBuilder.setCachedPrompt('test-prompt', promptContent)

        // Should not throw even without context
        const result = contextBuilder.buildSystemMessage('test-prompt')
        expect(result).toContain('Simple prompt')
      })

      it('should format output correctly with all context fields', () => {
        const promptContent = 'Base prompt'
        contextBuilder.setCachedPrompt('full-test', promptContent)

        const result = contextBuilder.buildSystemMessage('full-test', {
          currentTime: new Date('2024-03-20T14:00:00.000Z'),
          timeZone: 'America/New_York',
          channel: 'api',
          chatId: 'chat-456'
        })

        // Verify all parts are included
        expect(result).toContain('Base prompt')
        expect(result).toContain('[Runtime Context]')
        expect(result).toContain('Current time: 2024-03-20T14:00:00.000Z')
        expect(result).toContain('Time zone: America/New_York')
        expect(result).toContain('Channel: api')
        expect(result).toContain('Chat ID: chat-456')
      })
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