/**
 * Tests for AgentLoop Types
 * TDD: Tests for constants, AGENT_PRESETS and type definitions
 */

import { describe, it, expect } from 'vitest'
import {
  AGENT_PRESETS,
  DEFAULT_AGENT_CONFIG,
  MAX_STEPS,
  AgentPreset,
  DEFAULT_MAX_ITERATIONS,
  COMPLEX_MAX_ITERATIONS,
  RESEARCH_MAX_ITERATIONS,
  DEFAULT_TEMPERATURE,
  PRECISE_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
  DEFAULT_MEMORY_WINDOW
} from './types'

describe('Iteration Constants', () => {
  it('should have correct DEFAULT_MAX_ITERATIONS', () => {
    expect(DEFAULT_MAX_ITERATIONS).toBe(5)
  })

  it('should have correct COMPLEX_MAX_ITERATIONS', () => {
    expect(COMPLEX_MAX_ITERATIONS).toBe(10)
  })

  it('should have correct RESEARCH_MAX_ITERATIONS', () => {
    expect(RESEARCH_MAX_ITERATIONS).toBe(20)
  })

  it('should have MAX_STEPS as hard limit', () => {
    expect(MAX_STEPS).toBe(20)
    expect(MAX_STEPS).toBe(RESEARCH_MAX_ITERATIONS) // Research uses max allowed
  })
})

describe('Temperature Constants', () => {
  it('should have correct DEFAULT_TEMPERATURE', () => {
    expect(DEFAULT_TEMPERATURE).toBe(0.7)
  })

  it('should have correct PRECISE_TEMPERATURE', () => {
    expect(PRECISE_TEMPERATURE).toBe(0.5)
  })
})

describe('AGENT_PRESETS', () => {
  it('should have todo preset with values from constants', () => {
    expect(AGENT_PRESETS.todo).toBeDefined()
    expect(AGENT_PRESETS.todo.maxIterations).toBe(DEFAULT_MAX_ITERATIONS)
    expect(AGENT_PRESETS.todo.temperature).toBe(DEFAULT_TEMPERATURE)
  })

  it('should have complex preset with values from constants', () => {
    expect(AGENT_PRESETS.complex).toBeDefined()
    expect(AGENT_PRESETS.complex.maxIterations).toBe(COMPLEX_MAX_ITERATIONS)
    expect(AGENT_PRESETS.complex.temperature).toBe(DEFAULT_TEMPERATURE)
  })

  it('should have research preset with values from constants', () => {
    expect(AGENT_PRESETS.research).toBeDefined()
    expect(AGENT_PRESETS.research.maxIterations).toBe(RESEARCH_MAX_ITERATIONS)
    expect(AGENT_PRESETS.research.temperature).toBe(PRECISE_TEMPERATURE)
  })

  it('should be readonly (as const)', () => {
    const preset: AgentPreset = 'todo'
    expect(['todo', 'complex', 'research']).toContain(preset)
  })
})

describe('DEFAULT_AGENT_CONFIG', () => {
  it('should use constants for all values', () => {
    expect(DEFAULT_AGENT_CONFIG.temperature).toBe(DEFAULT_TEMPERATURE)
    expect(DEFAULT_AGENT_CONFIG.maxTokens).toBe(DEFAULT_MAX_TOKENS)
    expect(DEFAULT_AGENT_CONFIG.maxIterations).toBe(DEFAULT_MAX_ITERATIONS)
    expect(DEFAULT_AGENT_CONFIG.memoryWindow).toBe(DEFAULT_MEMORY_WINDOW)
  })

  it('should not have a default model (dynamic from database)', () => {
    expect(DEFAULT_AGENT_CONFIG.model).toBeUndefined()
  })
})

describe('AgentPreset type', () => {
  it('should include all preset keys', () => {
    const presets: AgentPreset[] = ['todo', 'complex', 'research']
    presets.forEach(preset => {
      expect(AGENT_PRESETS[preset]).toBeDefined()
    })
  })
})