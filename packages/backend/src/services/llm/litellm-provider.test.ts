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

    it('should return model name unchanged (Zero Magic strategy)', () => {
      // Zero Magic: user has full control over model name
      // Direct API: model = "deepseek-chat"
      // LiteLLM proxy: model = "deepseek/deepseek-chat"
      expect(provider.applyModelPrefix('deepseek-chat')).toBe('deepseek-chat')
    })

    it('should not modify models with existing prefixes', () => {
      // If user explicitly provides prefix, keep it
      expect(provider.applyModelPrefix('deepseek/deepseek-chat')).toBe('deepseek/deepseek-chat')
      expect(provider.applyModelPrefix('ollama/llama3.1')).toBe('ollama/llama3.1')
    })

    it('should not modify OpenAI models', () => {
      expect(provider.applyModelPrefix('gpt-4o')).toBe('gpt-4o')
      expect(provider.applyModelPrefix('gpt-4o-mini')).toBe('gpt-4o-mini')
    })

    it('should not add prefix to ollama-style models', () => {
      // Zero Magic: let user control the prefix
      expect(provider.applyModelPrefix('llama3.1')).toBe('llama3.1')
      expect(provider.applyModelPrefix('mistral-7b')).toBe('mistral-7b')
      expect(provider.applyModelPrefix('qwen2.5')).toBe('qwen2.5')
    })

    it('should not add prefix to gemini models', () => {
      // Zero Magic: user specifies full model name
      expect(provider.applyModelPrefix('gemini-pro')).toBe('gemini-pro')
    })

    it('should return any model name unchanged', () => {
      // Zero Magic design: no automatic transformations
      expect(provider.applyModelPrefix('claude-3-opus')).toBe('claude-3-opus')
      expect(provider.applyModelPrefix('custom-model')).toBe('custom-model')
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