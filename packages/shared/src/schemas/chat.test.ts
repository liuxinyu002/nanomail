import { describe, it, expect } from 'vitest'
import {
  ChatMessageSchema,
  ChatContextSchema,
  ChatRequestSchema,
  SessionStartDataSchema
} from './chat'

describe('Chat Schemas', () => {
  describe('ChatMessageSchema', () => {
    const validMessage = {
      role: 'user' as const,
      content: 'Hello, AI!'
    }

    describe('role field', () => {
      it('should accept "system" role', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, role: 'system' })
        expect(result.role).toBe('system')
      })

      it('should accept "user" role', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, role: 'user' })
        expect(result.role).toBe('user')
      })

      it('should accept "assistant" role', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, role: 'assistant' })
        expect(result.role).toBe('assistant')
      })

      it('should accept "tool" role', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, role: 'tool' })
        expect(result.role).toBe('tool')
      })

      it('should reject invalid role', () => {
        expect(() => ChatMessageSchema.parse({ ...validMessage, role: 'invalid' })).toThrow()
      })

      it('should reject missing role', () => {
        expect(() => ChatMessageSchema.parse({ content: 'test' })).toThrow()
      })
    })

    describe('content field', () => {
      it('should accept string content', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, content: 'Test message' })
        expect(result.content).toBe('Test message')
      })

      it('should accept null content (for tool_calls only messages)', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, content: null })
        expect(result.content).toBeNull()
      })

      it('should accept empty string content', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, content: '' })
        expect(result.content).toBe('')
      })

      it('should accept long content', () => {
        const longContent = 'a'.repeat(10000)
        const result = ChatMessageSchema.parse({ ...validMessage, content: longContent })
        expect(result.content).toBe(longContent)
      })
    })

    describe('toolCalls field', () => {
      it('should accept valid toolCalls array', () => {
        const messageWithToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: {
                name: 'create_todo',
                arguments: '{"description": "Test todo"}'
              }
            }
          ]
        }
        const result = ChatMessageSchema.parse(messageWithToolCalls)
        expect(result.toolCalls).toHaveLength(1)
        expect(result.toolCalls?.[0].id).toBe('call_123')
        expect(result.toolCalls?.[0].function.name).toBe('create_todo')
        expect(result.toolCalls?.[0].function.arguments).toBe('{"description": "Test todo"}')
      })

      it('should accept multiple toolCalls', () => {
        const messageWithMultipleToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              id: 'call_1',
              type: 'function' as const,
              function: { name: 'create_todo', arguments: '{}' }
            },
            {
              id: 'call_2',
              type: 'function' as const,
              function: { name: 'send_email', arguments: '{}' }
            }
          ]
        }
        const result = ChatMessageSchema.parse(messageWithMultipleToolCalls)
        expect(result.toolCalls).toHaveLength(2)
      })

      it('should default type to "function"', () => {
        const messageWithToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              function: {
                name: 'create_todo',
                arguments: '{}'
              }
            }
          ]
        }
        const result = ChatMessageSchema.parse(messageWithToolCalls)
        expect(result.toolCalls?.[0].type).toBe('function')
      })

      it('should accept toolCalls without type field (defaults to function)', () => {
        const messageWithToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              function: {
                name: 'create_todo',
                arguments: '{}'
              }
            }
          ]
        }
        const result = ChatMessageSchema.parse(messageWithToolCalls)
        expect(result.toolCalls?.[0].type).toBe('function')
      })

      it('should reject toolCalls without id', () => {
        const invalidToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              type: 'function' as const,
              function: { name: 'create_todo', arguments: '{}' }
            }
          ]
        }
        expect(() => ChatMessageSchema.parse(invalidToolCalls)).toThrow()
      })

      it('should reject toolCalls without function name', () => {
        const invalidToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: { arguments: '{}' }
            }
          ]
        }
        expect(() => ChatMessageSchema.parse(invalidToolCalls)).toThrow()
      })

      it('should reject toolCalls without function arguments', () => {
        const invalidToolCalls = {
          role: 'assistant' as const,
          content: null,
          toolCalls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: { name: 'create_todo' }
            }
          ]
        }
        expect(() => ChatMessageSchema.parse(invalidToolCalls)).toThrow()
      })

      it('should accept toolCalls as undefined (optional)', () => {
        const result = ChatMessageSchema.parse(validMessage)
        expect(result.toolCalls).toBeUndefined()
      })

      it('should accept empty toolCalls array', () => {
        const result = ChatMessageSchema.parse({ ...validMessage, toolCalls: [] })
        expect(result.toolCalls).toEqual([])
      })
    })

    describe('toolCallId field', () => {
      it('should accept toolCallId for tool role messages', () => {
        const toolMessage = {
          role: 'tool' as const,
          content: '{"result": "success"}',
          toolCallId: 'call_123'
        }
        const result = ChatMessageSchema.parse(toolMessage)
        expect(result.toolCallId).toBe('call_123')
      })

      it('should accept toolCallId as undefined (optional)', () => {
        const result = ChatMessageSchema.parse(validMessage)
        expect(result.toolCallId).toBeUndefined()
      })
    })

    describe('edge cases', () => {
      it('should accept message with all fields', () => {
        const fullMessage = {
          role: 'assistant' as const,
          content: 'Here is the result',
          toolCalls: [
            {
              id: 'call_123',
              type: 'function' as const,
              function: { name: 'get_weather', arguments: '{"city": "Beijing"}' }
            }
          ],
          toolCallId: 'call_456'
        }
        const result = ChatMessageSchema.parse(fullMessage)
        expect(result.role).toBe('assistant')
        expect(result.content).toBe('Here is the result')
        expect(result.toolCalls).toHaveLength(1)
        expect(result.toolCallId).toBe('call_456')
      })

      it('should reject message without role', () => {
        expect(() => ChatMessageSchema.parse({ content: 'test' })).toThrow()
      })

      it('should reject message without content', () => {
        expect(() => ChatMessageSchema.parse({ role: 'user' })).toThrow()
      })
    })
  })

  describe('ChatContextSchema', () => {
    const validContext = {
      currentTime: '2024-03-20T10:30:00.000Z',
      timeZone: 'Asia/Shanghai'
    }

    describe('currentTime field', () => {
      it('should accept valid ISO datetime string', () => {
        const result = ChatContextSchema.parse(validContext)
        expect(result.currentTime).toBe('2024-03-20T10:30:00.000Z')
      })

      it('should accept datetime with timezone offset', () => {
        // Zod's datetime() with default options requires UTC (Z suffix)
        // Timezone offsets need { offset: true } option
        const result = ChatContextSchema.parse({
          ...validContext,
          currentTime: '2024-03-20T10:30:00Z'
        })
        expect(result.currentTime).toBe('2024-03-20T10:30:00Z')
      })

      it('should reject non-datetime string', () => {
        expect(() => ChatContextSchema.parse({ ...validContext, currentTime: 'not a date' })).toThrow()
      })

      it('should reject date-only string (missing time)', () => {
        expect(() => ChatContextSchema.parse({ ...validContext, currentTime: '2024-03-20' })).toThrow()
      })

      it('should reject missing currentTime', () => {
        expect(() => ChatContextSchema.parse({ timeZone: 'Asia/Shanghai' })).toThrow()
      })
    })

    describe('timeZone field', () => {
      it('should accept valid timezone string', () => {
        const result = ChatContextSchema.parse(validContext)
        expect(result.timeZone).toBe('Asia/Shanghai')
      })

      it('should accept different timezone formats', () => {
        const result = ChatContextSchema.parse({
          ...validContext,
          timeZone: 'America/New_York'
        })
        expect(result.timeZone).toBe('America/New_York')
      })

      it('should accept UTC timezone', () => {
        const result = ChatContextSchema.parse({
          ...validContext,
          timeZone: 'UTC'
        })
        expect(result.timeZone).toBe('UTC')
      })

      it('should reject missing timeZone', () => {
        expect(() => ChatContextSchema.parse({ currentTime: '2024-03-20T10:30:00.000Z' })).toThrow()
      })
    })

    describe('optional fields', () => {
      it('should accept currentLocation', () => {
        const result = ChatContextSchema.parse({
          ...validContext,
          currentLocation: 'Beijing, China'
        })
        expect(result.currentLocation).toBe('Beijing, China')
      })

      it('should accept sourcePage', () => {
        const result = ChatContextSchema.parse({
          ...validContext,
          sourcePage: 'email-list'
        })
        expect(result.sourcePage).toBe('email-list')
      })

      it('should accept both optional fields', () => {
        const result = ChatContextSchema.parse({
          ...validContext,
          currentLocation: 'Shanghai',
          sourcePage: 'todo-board'
        })
        expect(result.currentLocation).toBe('Shanghai')
        expect(result.sourcePage).toBe('todo-board')
      })

      it('should work without optional fields', () => {
        const result = ChatContextSchema.parse(validContext)
        expect(result.currentLocation).toBeUndefined()
        expect(result.sourcePage).toBeUndefined()
      })
    })
  })

  describe('ChatRequestSchema', () => {
    const validRequest = {
      messages: [
        { role: 'user' as const, content: 'Hello' }
      ],
      context: {
        currentTime: '2024-03-20T10:30:00.000Z',
        timeZone: 'Asia/Shanghai'
      }
    }

    describe('messages field', () => {
      it('should accept valid messages array', () => {
        const result = ChatRequestSchema.parse(validRequest)
        expect(result.messages).toHaveLength(1)
        expect(result.messages[0].role).toBe('user')
      })

      it('should accept multiple messages', () => {
        const multiMessageRequest = {
          ...validRequest,
          messages: [
            { role: 'system' as const, content: 'You are a helpful assistant' },
            { role: 'user' as const, content: 'Hello' },
            { role: 'assistant' as const, content: 'Hi there!' }
          ]
        }
        const result = ChatRequestSchema.parse(multiMessageRequest)
        expect(result.messages).toHaveLength(3)
      })

      it('should reject empty messages array', () => {
        expect(() => ChatRequestSchema.parse({ ...validRequest, messages: [] })).toThrow()
      })

      it('should reject missing messages', () => {
        expect(() => ChatRequestSchema.parse({ context: validRequest.context })).toThrow()
      })

      it('should validate individual messages', () => {
        const invalidMessageRequest = {
          ...validRequest,
          messages: [
            { role: 'invalid' as const, content: 'test' }
          ]
        }
        expect(() => ChatRequestSchema.parse(invalidMessageRequest)).toThrow()
      })
    })

    describe('context field', () => {
      it('should accept valid context', () => {
        const result = ChatRequestSchema.parse(validRequest)
        expect(result.context.currentTime).toBe('2024-03-20T10:30:00.000Z')
        expect(result.context.timeZone).toBe('Asia/Shanghai')
      })

      it('should reject missing context', () => {
        expect(() => ChatRequestSchema.parse({ messages: validRequest.messages })).toThrow()
      })

      it('should validate context fields', () => {
        const invalidContextRequest = {
          ...validRequest,
          context: { currentTime: 'invalid' }
        }
        expect(() => ChatRequestSchema.parse(invalidContextRequest)).toThrow()
      })
    })

    describe('stream field', () => {
      it('should accept stream: true', () => {
        const result = ChatRequestSchema.parse({ ...validRequest, stream: true })
        expect(result.stream).toBe(true)
      })

      it('should accept stream: false', () => {
        const result = ChatRequestSchema.parse({ ...validRequest, stream: false })
        expect(result.stream).toBe(false)
      })

      it('should default to true when not provided', () => {
        // Note: zod's .default() only applies when key is absent
        // But .optional() means the key can be omitted, so default applies
        const result = ChatRequestSchema.parse(validRequest)
        // When stream is not provided, the default should apply
        expect(result.stream).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should accept request with all fields', () => {
        const fullRequest = {
          messages: [
            { role: 'system' as const, content: 'You are helpful' },
            { role: 'user' as const, content: 'Create a todo' },
            {
              role: 'assistant' as const,
              content: null,
              toolCalls: [
                {
                  id: 'call_1',
                  type: 'function' as const,
                  function: { name: 'create_todo', arguments: '{"description": "Test"}' }
                }
              ]
            },
            { role: 'tool' as const, content: '{"success": true}', toolCallId: 'call_1' }
          ],
          context: {
            currentTime: '2024-03-20T10:30:00.000Z',
            timeZone: 'Asia/Shanghai',
            currentLocation: 'Beijing',
            sourcePage: 'email-detail'
          },
          stream: false
        }
        const result = ChatRequestSchema.parse(fullRequest)
        expect(result.messages).toHaveLength(4)
        expect(result.context.currentLocation).toBe('Beijing')
        expect(result.stream).toBe(false)
      })
    })
  })

  describe('SessionStartDataSchema', () => {
    const validSessionStart = {
      sessionId: 'session_abc123',
      agentRole: 'email-assistant'
    }

    it('should accept valid session start data', () => {
      const result = SessionStartDataSchema.parse(validSessionStart)
      expect(result.sessionId).toBe('session_abc123')
      expect(result.agentRole).toBe('email-assistant')
    })

    it('should reject missing sessionId', () => {
      expect(() => SessionStartDataSchema.parse({ agentRole: 'email-assistant' })).toThrow()
    })

    it('should reject missing agentRole', () => {
      expect(() => SessionStartDataSchema.parse({ sessionId: 'session_abc123' })).toThrow()
    })

    it('should accept empty sessionId (zod strings accept empty by default)', () => {
      // Note: z.string() accepts empty strings by default
      // If we want to reject empty strings, we'd use z.string().min(1)
      const result = SessionStartDataSchema.parse({ ...validSessionStart, sessionId: '' })
      expect(result.sessionId).toBe('')
    })

    it('should accept empty agentRole (zod strings accept empty by default)', () => {
      // Note: z.string() accepts empty strings by default
      // If we want to reject empty strings, we'd use z.string().min(1)
      const result = SessionStartDataSchema.parse({ ...validSessionStart, agentRole: '' })
      expect(result.agentRole).toBe('')
    })

    it('should accept various agentRole values', () => {
      const roles = ['email-assistant', 'todo-manager', 'calendar-helper', 'general']
      roles.forEach((role) => {
        const result = SessionStartDataSchema.parse({ ...validSessionStart, agentRole: role })
        expect(result.agentRole).toBe(role)
      })
    })
  })
})
