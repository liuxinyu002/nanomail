/**
 * Tests for ProviderRegistry
 * TDD: Write tests first, then implement
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { ProviderRegistry, PROVIDER_SPECS } from './provider-registry'
import type { ProviderSpec } from './types'

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry

  beforeEach(() => {
    registry = new ProviderRegistry()
  })

  describe('get', () => {
    it('should get provider by name', () => {
      const openai = registry.get('openai')
      expect(openai).toBeDefined()
      expect(openai?.name).toBe('openai')
      expect(openai?.displayName).toBe('OpenAI')
    })

    it('should return undefined for unknown provider', () => {
      const unknown = registry.get('unknown_provider')
      expect(unknown).toBeUndefined()
    })

    it('should get deepseek provider', () => {
      const deepseek = registry.get('deepseek')
      expect(deepseek).toBeDefined()
      expect(deepseek?.litellmPrefix).toBe('deepseek')
    })

    it('should get ollama provider', () => {
      const ollama = registry.get('ollama')
      expect(ollama).toBeDefined()
      expect(ollama?.isLocal).toBe(true)
    })
  })

  describe('detectByModel', () => {
    it('should detect OpenAI from gpt models', () => {
      expect(registry.detectByModel('gpt-4o')?.name).toBe('openai')
      expect(registry.detectByModel('gpt-4o-mini')?.name).toBe('openai')
      expect(registry.detectByModel('gpt-3.5-turbo')?.name).toBe('openai')
    })

    it('should detect OpenAI from o1/o3 models', () => {
      expect(registry.detectByModel('o1-preview')?.name).toBe('openai')
      expect(registry.detectByModel('o1-mini')?.name).toBe('openai')
      expect(registry.detectByModel('o3-mini')?.name).toBe('openai')
    })

    it('should detect DeepSeek from deepseek models', () => {
      expect(registry.detectByModel('deepseek-chat')?.name).toBe('deepseek')
      expect(registry.detectByModel('deepseek-coder')?.name).toBe('deepseek')
      expect(registry.detectByModel('deepseek-reasoner')?.name).toBe('deepseek')
    })

    it('should detect Anthropic from claude models', () => {
      expect(registry.detectByModel('claude-3-opus')?.name).toBe('anthropic')
      expect(registry.detectByModel('claude-3-sonnet')?.name).toBe('anthropic')
      expect(registry.detectByModel('claude-3-haiku')?.name).toBe('anthropic')
      expect(registry.detectByModel('claude-3-5-sonnet')?.name).toBe('anthropic')
    })

    it('should detect Ollama from llama models', () => {
      expect(registry.detectByModel('llama3.1')?.name).toBe('ollama')
      expect(registry.detectByModel('llama3.2')?.name).toBe('ollama')
      expect(registry.detectByModel('llama-3-8b')?.name).toBe('ollama')
    })

    it('should detect Ollama from mistral models', () => {
      expect(registry.detectByModel('mistral-7b')?.name).toBe('ollama')
    })

    it('should detect Ollama from qwen models', () => {
      expect(registry.detectByModel('qwen2.5')?.name).toBe('ollama')
    })

    it('should detect OpenRouter from openrouter prefix', () => {
      expect(registry.detectByModel('openrouter/claude-3-opus')?.name).toBe('openrouter')
    })

    it('should return undefined for unknown model', () => {
      expect(registry.detectByModel('unknown-model-xyz')).toBeUndefined()
    })
  })

  describe('detectByApiKeyPrefix', () => {
    it('should detect OpenRouter from sk-or- prefix', () => {
      expect(registry.detectByApiKeyPrefix('sk-or-v1-abc123')?.name).toBe('openrouter')
      expect(registry.detectByApiKeyPrefix('sk-or-12345')?.name).toBe('openrouter')
    })

    it('should return undefined for unknown prefix', () => {
      expect(registry.detectByApiKeyPrefix('sk-unknown')).toBeUndefined()
    })
  })

  describe('detectByApiBase', () => {
    it('should detect OpenRouter from api base URL', () => {
      expect(
        registry.detectByApiBase('https://openrouter.ai/api/v1')?.name
      ).toBe('openrouter')
    })

    it('should detect DeepSeek from api base URL', () => {
      expect(
        registry.detectByApiBase('https://api.deepseek.com/v1')?.name
      ).toBe('deepseek')
    })

    it('should detect Ollama from localhost', () => {
      expect(
        registry.detectByApiBase('http://localhost:11434/v1')?.name
      ).toBe('ollama')
    })

    it('should return undefined for unknown base URL', () => {
      expect(
        registry.detectByApiBase('https://unknown-api.com/v1')
      ).toBeUndefined()
    })
  })

  describe('getAll', () => {
    it('should return all provider specs', () => {
      const all = registry.getAll()
      expect(all.length).toBeGreaterThan(0)
      expect(all.find(p => p.name === 'openai')).toBeDefined()
      expect(all.find(p => p.name === 'deepseek')).toBeDefined()
      expect(all.find(p => p.name === 'ollama')).toBeDefined()
    })
  })

  describe('PROVIDER_SPECS constant', () => {
    it('should contain essential providers', () => {
      const names = PROVIDER_SPECS.map(s => s.name)
      expect(names).toContain('openai')
      expect(names).toContain('anthropic')
      expect(names).toContain('deepseek')
      expect(names).toContain('ollama')
    })

    it('should have correct OpenAI spec', () => {
      const openai = PROVIDER_SPECS.find(s => s.name === 'openai')
      expect(openai).toMatchObject({
        name: 'openai',
        envKey: 'OPENAI_API_KEY',
        displayName: 'OpenAI',
        isGateway: false,
        isLocal: false
      })
    })

    it('should have correct DeepSeek spec with prefix', () => {
      const deepseek = PROVIDER_SPECS.find(s => s.name === 'deepseek')
      expect(deepseek).toMatchObject({
        name: 'deepseek',
        litellmPrefix: 'deepseek',
        defaultApiBase: 'https://api.deepseek.com/v1'
      })
    })

    it('should have correct Ollama spec as local', () => {
      const ollama = PROVIDER_SPECS.find(s => s.name === 'ollama')
      expect(ollama).toMatchObject({
        name: 'ollama',
        isLocal: true,
        defaultApiBase: 'http://localhost:11434/v1'
      })
    })
  })
})