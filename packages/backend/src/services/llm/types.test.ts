/**
 * Tests for LLM types and interfaces
 * TDD: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest'
import type {
  ToolCallRequest,
  LLMResponse,
  ProviderSpec,
  ChatParams,
  ChatMessage
} from './types'

describe('LLM Types', () => {
  describe('ToolCallRequest', () => {
    it('should define a valid tool call request', () => {
      const toolCall: ToolCallRequest = {
        id: 'call_123',
        name: 'search_emails',
        arguments: { query: 'test', limit: 5 }
      }

      expect(toolCall.id).toBe('call_123')
      expect(toolCall.name).toBe('search_emails')
      expect(toolCall.arguments).toEqual({ query: 'test', limit: 5 })
    })
  })

  describe('LLMResponse', () => {
    it('should define a basic LLM response', () => {
      const response: LLMResponse = {
        content: 'Hello, world!',
        toolCalls: [],
        finishReason: 'stop',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        }
      }

      expect(response.content).toBe('Hello, world!')
      expect(response.toolCalls).toEqual([])
      expect(response.finishReason).toBe('stop')
      expect(response.usage.totalTokens).toBe(15)
    })

    it('should support tool calls in response', () => {
      const response: LLMResponse = {
        content: null,
        toolCalls: [
          {
            id: 'call_abc',
            name: 'search_emails',
            arguments: { query: 'important' }
          }
        ],
        finishReason: 'tool_calls',
        usage: {
          promptTokens: 20,
          completionTokens: 10,
          totalTokens: 30
        }
      }

      expect(response.content).toBeNull()
      expect(response.toolCalls).toHaveLength(1)
      expect(response.toolCalls[0].name).toBe('search_emails')
      expect(response.finishReason).toBe('tool_calls')
    })

    it('should support extended reasoning for DeepSeek-R1', () => {
      const response: LLMResponse = {
        content: 'The answer is 42.',
        toolCalls: [],
        finishReason: 'stop',
        usage: {
          promptTokens: 100,
          completionTokens: 50,
          totalTokens: 150
        },
        reasoningContent: 'Let me think about this step by step...'
      }

      expect(response.reasoningContent).toBe('Let me think about this step by step...')
    })

    it('should support thinking blocks for Anthropic', () => {
      const response: LLMResponse = {
        content: 'The result is 10.',
        toolCalls: [],
        finishReason: 'stop',
        usage: {
          promptTokens: 50,
          completionTokens: 25,
          totalTokens: 75
        },
        thinkingBlocks: [
          {
            type: 'thinking',
            thinking: 'First, I need to add 5 and 5...'
          }
        ]
      }

      expect(response.thinkingBlocks).toBeDefined()
      expect(response.thinkingBlocks).toHaveLength(1)
      expect(response.thinkingBlocks![0].type).toBe('thinking')
    })

    it('should identify responses with tool calls', () => {
      const responseWithTools: LLMResponse = {
        content: null,
        toolCalls: [{ id: '1', name: 'test', arguments: {} }],
        finishReason: 'tool_calls',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }

      const responseWithoutTools: LLMResponse = {
        content: 'Hello',
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
      }

      expect(responseWithTools.toolCalls.length > 0).toBe(true)
      expect(responseWithoutTools.toolCalls.length === 0).toBe(true)
    })
  })

  describe('ProviderSpec', () => {
    it('should define OpenAI provider spec', () => {
      const openaiSpec: ProviderSpec = {
        name: 'openai',
        keywords: ['gpt', 'o1', 'o3', 'o4'],
        envKey: 'OPENAI_API_KEY',
        displayName: 'OpenAI',
        litellmPrefix: '',
        defaultApiBase: '',
        isGateway: false,
        isLocal: false,
        supportsPromptCaching: false
      }

      expect(openaiSpec.name).toBe('openai')
      expect(openaiSpec.keywords).toContain('gpt')
      expect(openaiSpec.isGateway).toBe(false)
    })

    it('should define DeepSeek provider spec', () => {
      const deepseekSpec: ProviderSpec = {
        name: 'deepseek',
        keywords: ['deepseek'],
        envKey: 'DEEPSEEK_API_KEY',
        displayName: 'DeepSeek',
        litellmPrefix: 'deepseek',
        defaultApiBase: 'https://api.deepseek.com/v1',
        isGateway: false,
        isLocal: false,
        supportsPromptCaching: false
      }

      expect(deepseekSpec.litellmPrefix).toBe('deepseek')
      expect(deepseekSpec.defaultApiBase).toBe('https://api.deepseek.com/v1')
    })

    it('should define Ollama as local provider', () => {
      const ollamaSpec: ProviderSpec = {
        name: 'ollama',
        keywords: ['llama', 'mistral', 'qwen', 'gemma'],
        envKey: 'OLLAMA_API_BASE',
        displayName: 'Ollama',
        litellmPrefix: 'ollama',
        defaultApiBase: 'http://localhost:11434/v1',
        isGateway: false,
        isLocal: true,
        supportsPromptCaching: false
      }

      expect(ollamaSpec.isLocal).toBe(true)
      expect(ollamaSpec.defaultApiBase).toBe('http://localhost:11434/v1')
    })

    it('should define OpenRouter as gateway', () => {
      const openrouterSpec: ProviderSpec = {
        name: 'openrouter',
        keywords: ['openrouter'],
        envKey: 'OPENROUTER_API_KEY',
        displayName: 'OpenRouter',
        litellmPrefix: 'openrouter',
        defaultApiBase: 'https://openrouter.ai/api/v1',
        isGateway: true,
        isLocal: false,
        supportsPromptCaching: true
      }

      expect(openrouterSpec.isGateway).toBe(true)
      expect(openrouterSpec.supportsPromptCaching).toBe(true)
    })
  })

  describe('ChatMessage', () => {
    it('should define system message', () => {
      const message: ChatMessage = {
        role: 'system',
        content: 'You are a helpful assistant.'
      }
      expect(message.role).toBe('system')
    })

    it('should define user message', () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello!'
      }
      expect(message.role).toBe('user')
    })

    it('should define assistant message with tool calls', () => {
      const message: ChatMessage = {
        role: 'assistant',
        content: null,
        toolCalls: [{ id: 'call_1', name: 'test', arguments: {} }]
      }
      expect(message.toolCalls).toBeDefined()
      expect(message.toolCalls).toHaveLength(1)
    })
  })

  describe('ChatParams', () => {
    it('should define chat parameters', () => {
      const params: ChatParams = {
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' }
        ],
        model: 'gpt-4o-mini',
        maxTokens: 4096,
        temperature: 0.7
      }

      expect(params.messages).toHaveLength(2)
      expect(params.model).toBe('gpt-4o-mini')
      expect(params.maxTokens).toBe(4096)
    })

    it('should support tools in chat params', () => {
      const params: ChatParams = {
        messages: [{ role: 'user', content: 'Search my emails' }],
        tools: [
          {
            type: 'function',
            function: {
              name: 'search_emails',
              description: 'Search emails',
              parameters: { type: 'object', properties: {} }
            }
          }
        ],
        model: 'gpt-4o'
      }

      expect(params.tools).toBeDefined()
      expect(params.tools).toHaveLength(1)
    })

    it('should support reasoning effort parameter', () => {
      const params: ChatParams = {
        messages: [{ role: 'user', content: 'Think carefully' }],
        model: 'o1-mini',
        reasoningEffort: 'high'
      }

      expect(params.reasoningEffort).toBe('high')
    })
  })
})