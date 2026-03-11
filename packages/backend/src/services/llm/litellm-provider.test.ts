/**
 * Tests for LLMProvider and LiteLLMProvider
 * TDD: Write tests first, then implement
 */

import { describe, it, expect } from 'vitest'
import { LLMProvider } from './base-provider'
import { LiteLLMProvider } from './litellm-provider'
import type { ChatParams, LLMResponse } from './types'

describe('LLMProvider', () => {
  describe('constructor', () => {
    it('should create provider with config', () => {
      class TestProvider extends LLMProvider {
        async chat(): Promise<LLMResponse> {
          return {
            content: 'test',
            toolCalls: [],
            finishReason: 'stop',
            usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
          }
        }
        getDefaultModel(): string {
          return 'test-model'
        }
      }

      const provider = new TestProvider({ apiKey: 'test-key', apiBase: 'https://api.test.com' })
      expect(provider).toBeDefined()
    })
  })

  describe('sanitizeEmptyContent', () => {
    class TestProvider extends LLMProvider {
      async chat(): Promise<LLMResponse> {
        return {
          content: '',
          toolCalls: [],
          finishReason: 'stop',
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
        }
      }
      getDefaultModel(): string {
        return 'test'
      }
    }

    it('should replace empty string content with (empty)', () => {
      const messages = [{ role: 'user' as const, content: '' }]
      const sanitized = LLMProvider.sanitizeEmptyContent(messages)

      expect(sanitized[0].content).toBe('(empty)')
    })

    it('should keep non-empty content unchanged', () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }]
      const sanitized = LLMProvider.sanitizeEmptyContent(messages)

      expect(sanitized[0].content).toBe('Hello')
    })

    it('should handle null content', () => {
      const messages = [{ role: 'assistant' as const, content: null }]
      const sanitized = LLMProvider.sanitizeEmptyContent(messages)

      expect(sanitized[0].content).toBeNull()
    })
  })

  describe('sanitizeRequestMessages', () => {
    it('should keep only allowed keys', () => {
      const messages = [
        { role: 'user' as const, content: 'Hello', extraKey: 'should be removed' }
      ]
      const allowedKeys = new Set(['role', 'content'])
      const sanitized = LLMProvider.sanitizeRequestMessages(messages, allowedKeys)

      expect(sanitized[0]).toEqual({ role: 'user', content: 'Hello' })
    })

    it('should ensure assistant messages have content key', () => {
      const messages = [{ role: 'assistant' as const, toolCalls: [] }]
      const allowedKeys = new Set(['role', 'content', 'toolCalls'])
      const sanitized = LLMProvider.sanitizeRequestMessages(messages, allowedKeys)

      expect(sanitized[0].content).toBeNull()
    })
  })
})

describe('LiteLLMProvider', () => {
  describe('constructor', () => {
    it('should create provider with default config', () => {
      const provider = new LiteLLMProvider({ defaultModel: 'gpt-4o' })
      expect(provider).toBeDefined()
    })

    it('should accept custom api key and base', () => {
      const provider = new LiteLLMProvider({
        apiKey: 'custom-key',
        apiBase: 'https://custom.api.com/v1',
        defaultModel: 'claude-3-opus'
      })
      expect(provider).toBeDefined()
    })

    it('should use gpt-4o-mini as default model', () => {
      const provider = new LiteLLMProvider()
      expect(provider.getDefaultModel()).toBe('gpt-4o-mini')
    })
  })

  describe('getDefaultModel', () => {
    it('should return configured default model', () => {
      const provider = new LiteLLMProvider({ defaultModel: 'gpt-4o' })
      expect(provider.getDefaultModel()).toBe('gpt-4o')
    })
  })

  describe('applyModelPrefix', () => {
    const provider = new LiteLLMProvider()

    it('should add deepseek prefix to deepseek models', () => {
      expect(provider.applyModelPrefix('deepseek-chat')).toBe('deepseek/deepseek-chat')
    })

    it('should not add prefix to models that already have it', () => {
      expect(provider.applyModelPrefix('deepseek/deepseek-chat')).toBe('deepseek/deepseek-chat')
    })

    it('should not add prefix to OpenAI models', () => {
      expect(provider.applyModelPrefix('gpt-4o')).toBe('gpt-4o')
    })

    it('should add ollama prefix to llama models', () => {
      expect(provider.applyModelPrefix('llama3.1')).toBe('ollama/llama3.1')
    })

    it('should add gemini prefix to gemini models', () => {
      expect(provider.applyModelPrefix('gemini-pro')).toBe('gemini/gemini-pro')
    })

    it('should add ollama prefix to mistral models', () => {
      expect(provider.applyModelPrefix('mistral-7b')).toBe('ollama/mistral-7b')
    })

    it('should add ollama prefix to qwen models', () => {
      expect(provider.applyModelPrefix('qwen2.5')).toBe('ollama/qwen2.5')
    })
  })

  describe('detectProvider', () => {
    const provider = new LiteLLMProvider()

    it('should detect OpenAI from gpt models', () => {
      const detected = provider.detectProvider('gpt-4o')
      expect(detected?.name).toBe('openai')
    })

    it('should detect DeepSeek from deepseek models', () => {
      const detected = provider.detectProvider('deepseek-chat')
      expect(detected?.name).toBe('deepseek')
    })

    it('should detect Anthropic from claude models', () => {
      const detected = provider.detectProvider('claude-3-opus')
      expect(detected?.name).toBe('anthropic')
    })

    it('should return null for unknown models', () => {
      const detected = provider.detectProvider('unknown-model-xyz')
      expect(detected).toBeNull()
    })
  })

  describe('chat', () => {
    it('should have chat method', () => {
      const provider = new LiteLLMProvider()
      expect(typeof provider.chat).toBe('function')
    })

    it('should accept ChatParams', () => {
      const provider = new LiteLLMProvider()
      const params: ChatParams = {
        messages: [{ role: 'user', content: 'Hello' }],
        model: 'gpt-4o-mini',
        maxTokens: 100,
        temperature: 0.7
      }

      // Just verify the method accepts the params
      expect(() => provider.chat(params)).not.toThrow()
    })
  })

  describe('testConnection', () => {
    it('should have testConnection method', () => {
      const provider = new LiteLLMProvider()
      expect(typeof provider.testConnection).toBe('function')
    })
  })
})