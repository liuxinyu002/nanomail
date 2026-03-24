import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChat, type UIMessage } from './useChat'
import type { ConversationEvent } from '@/services/chat.service'

// Mock ChatService module
vi.mock('@/services/chat.service', () => ({
  ChatService: {
    streamChat: vi.fn(),
  },
}))

// Import after mock
import { ChatService } from '@/services/chat.service'

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
  }
})()

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

// Mock requestAnimationFrame - execute immediately (synchronous)
// This ensures RAF batching works correctly in tests
vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
  // Execute synchronously for tests
  callback(0)
  return 1
})
vi.stubGlobal('cancelAnimationFrame', vi.fn())

// Helper to create async generator from events
function createEventGenerator(events: ConversationEvent[]): AsyncGenerator<ConversationEvent> {
  return {
    [Symbol.asyncIterator]() {
      let index = 0
      return {
        async next() {
          if (index < events.length) {
            return { done: false, value: events[index++] }
          }
          return { done: true, value: undefined }
        },
      }
    },
  } as AsyncGenerator<ConversationEvent>
}

// Helper to create a generator that throws an error on first iteration
async function* createErrorGenerator(error: Error): AsyncGenerator<ConversationEvent> {
  throw error
}

describe('useChat', () => {
  const mockStreamChat = vi.mocked(ChatService.streamChat)

  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorageMock.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should initialize with empty messages', () => {
      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual([])
      expect(result.current.isStreaming).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should restore messages from sessionStorage on mount', () => {
      const cachedMessages: UIMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: '2024-01-01T00:00:01.000Z',
        },
      ]
      sessionStorageMock.getItem.mockReturnValueOnce(JSON.stringify(cachedMessages))

      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual(cachedMessages)
    })

    it('should handle invalid sessionStorage data gracefully', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      sessionStorageMock.getItem.mockReturnValueOnce('invalid-json')

      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual([])
      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })

    it('should handle empty sessionStorage gracefully', () => {
      sessionStorageMock.getItem.mockReturnValueOnce(null)

      const { result } = renderHook(() => useChat())

      expect(result.current.messages).toEqual([])
    })
  })

  describe('sendMessage', () => {
    it('should add user message to state', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages).toHaveLength(2) // user + assistant placeholder
      expect(result.current.messages[0].role).toBe('user')
      expect(result.current.messages[0].content).toBe('Hello')
    })

    it('should create assistant message placeholder', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].role).toBe('assistant')
      expect(result.current.messages[1].content).toBe('')
    })

    it('should set isStreaming to true during streaming', async () => {
      let resolveGenerator: () => void

      const generatorPromise = new Promise<void>((resolve) => {
        resolveGenerator = resolve
      })

      mockStreamChat.mockImplementationOnce(async function* () {
        await generatorPromise
        yield { type: 'session_end', data: null }
      })

      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.sendMessage('Hello')
      })

      await waitFor(() => expect(result.current.isStreaming).toBe(true))

      // Resolve the generator
      act(() => resolveGenerator!())

      await waitFor(() => expect(result.current.isStreaming).toBe(false))
    })

    it('should call ChatService.streamChat with correct parameters', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Test message')
      })

      expect(mockStreamChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ role: 'user', content: 'Test message' }),
          ]),
          context: expect.objectContaining({
            currentTime: expect.any(String),
            timeZone: expect.any(String),
          }),
          stream: true,
        }),
        expect.any(AbortSignal)
      )
    })

    it('should accumulate result_chunk events to assistant message', async () => {
      const events: ConversationEvent[] = [
        { type: 'result_chunk', data: { content: 'Hello' } },
        { type: 'result_chunk', data: { content: ' world' } },
        { type: 'result_chunk', data: { content: '!' } },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hi')
      })

      // RAF executes synchronously in tests, and flush() is called in finally
      expect(result.current.messages[1].content).toBe('Hello world!')
    })

    it('should handle tool_call_start event', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: { description: 'Test' },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create a todo')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls).toHaveLength(1)
      expect(assistantMessage.toolCalls?.[0]).toEqual({
        id: 'call-1',
        toolName: 'create_todo',
        status: 'pending',
        input: { description: 'Test' },
      })
    })

    it('should handle tool_call_end event', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: { success: true, id: 1 },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create a todo')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls).toHaveLength(1)
      expect(assistantMessage.toolCalls?.[0].status).toBe('success')
      expect(assistantMessage.toolCalls?.[0].output).toEqual({ success: true, id: 1 })

      // Should also create a tool message
      const toolMessage = result.current.messages.find(m => m.role === 'tool')
      expect(toolMessage).toBeDefined()
      expect(toolMessage?.toolCallId).toBe('call-1')
    })

    it('should mark tool calls as error when tool execution fails', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: { description: 'Test' },
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: {
              error: 'Database connection failed',
              status: 'failed',
            },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create a todo')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls).toHaveLength(1)
      expect(assistantMessage.toolCalls?.[0].status).toBe('error')
      expect(assistantMessage.toolCalls?.[0].message).toBe('Database connection failed')
      expect(assistantMessage.toolCalls?.[0].output).toEqual({
        error: 'Database connection failed',
        status: 'failed',
      })
    })

    it('should use a fallback message when failed tool output has no error text', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: { status: 'failed' },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create a todo')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls?.[0].status).toBe('error')
      expect(assistantMessage.toolCalls?.[0].message).toBe('Tool execution failed')
    })

    it('should extract nested error messages from failed tool output', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: {
              error: { message: 'Connection timeout', code: 'ETIMEDOUT' },
              status: 'failed',
            },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create a todo')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls?.[0].status).toBe('error')
      expect(assistantMessage.toolCalls?.[0].message).toBe('Connection timeout')
    })

    it('should mark success false tool output as error', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: {
              success: false,
              reason: 'TODO_NOT_FOUND',
              message: 'Todo with ID 1 does not exist',
            },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Update todo 1')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls?.[0].status).toBe('error')
      expect(assistantMessage.toolCalls?.[0].message).toBe('Todo with ID 1 does not exist')
    })

    it('should mark error result strings as error', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: {
              result: 'Error: Tool "create_todo" validation failed',
            },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create todo')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls?.[0].status).toBe('error')
      expect(assistantMessage.toolCalls?.[0].message).toBe('Error: Tool "create_todo" validation failed')
    })

    it('should preserve mixed success and error tool call statuses', async () => {
      const events: ConversationEvent[] = [
        { type: 'tool_call_start', data: { toolCallId: 'call-1', toolName: 'create_todo', toolInput: {} } },
        { type: 'tool_call_end', data: { toolCallId: 'call-1', toolName: 'create_todo', toolInput: {}, toolOutput: { success: true } } },
        { type: 'tool_call_start', data: { toolCallId: 'call-2', toolName: 'update_todo', toolInput: {} } },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-2',
            toolName: 'update_todo',
            toolInput: {},
            toolOutput: { error: 'Not found', status: 'failed' },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Do stuff')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls).toHaveLength(2)
      expect(assistantMessage.toolCalls?.[0].status).toBe('success')
      expect(assistantMessage.toolCalls?.[1].status).toBe('error')
      expect(assistantMessage.toolCalls?.[1].message).toBe('Not found')
    })

    it('should handle multiple tool calls', async () => {
      const events: ConversationEvent[] = [
        { type: 'tool_call_start', data: { toolCallId: 'call-1', toolName: 'create_todo', toolInput: {} } },
        { type: 'tool_call_end', data: { toolCallId: 'call-1', toolName: 'create_todo', toolInput: {}, toolOutput: { done: true } } },
        { type: 'tool_call_start', data: { toolCallId: 'call-2', toolName: 'update_todo', toolInput: {} } },
        { type: 'tool_call_end', data: { toolCallId: 'call-2', toolName: 'update_todo', toolInput: {}, toolOutput: { done: true } } },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Do stuff')
      })

      const assistantMessage = result.current.messages[1]
      expect(assistantMessage.toolCalls).toHaveLength(2)
      expect(assistantMessage.toolCalls?.[0].toolName).toBe('create_todo')
      expect(assistantMessage.toolCalls?.[1].toolName).toBe('update_todo')
    })

    it('should handle error event', async () => {
      const events: ConversationEvent[] = [
        { type: 'error', data: { code: 'ERR', message: 'Something went wrong' } },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('Something went wrong')
    })

    it('should handle fetch errors', async () => {
      mockStreamChat.mockReturnValueOnce(createErrorGenerator(new Error('Network error')))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.error).toBe('Network error')
      expect(result.current.isStreaming).toBe(false)
    })
  })

  describe('stopGeneration', () => {
    it('should abort the SSE connection', async () => {
      let capturedSignal: AbortSignal | undefined
      let resolveGenerator: () => void

      const generatorPromise = new Promise<void>((resolve) => {
        resolveGenerator = resolve
      })

      mockStreamChat.mockImplementationOnce(async function* (_request, signal) {
        capturedSignal = signal
        await generatorPromise
        yield { type: 'session_end', data: null }
      })

      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.sendMessage('Hello')
      })

      await waitFor(() => expect(result.current.isStreaming).toBe(true))

      // Stop generation
      act(() => {
        result.current.stopGeneration()
      })

      // Verify abort signal was passed and aborted
      expect(capturedSignal).toBeDefined()
      expect(capturedSignal?.aborted).toBe(true)

      // Resolve to clean up
      act(() => resolveGenerator!())

      await waitFor(() => expect(result.current.isStreaming).toBe(false))
    })

    it('should keep partial response after stopping', async () => {
      mockStreamChat.mockImplementationOnce(async function* () {
        yield { type: 'result_chunk', data: { content: 'Partial' } }
        // Simulate abort
        const error = new Error('Aborted')
        error.name = 'AbortError'
        throw error
      })

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      // The partial content should still be in the message
      // RAF executes synchronously in tests
      expect(result.current.messages[1].content).toBe('Partial')
    })
  })

  describe('clearSession', () => {
    it('should clear messages and error', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(result.current.messages.length).toBeGreaterThan(0)

      act(() => {
        result.current.clearSession()
      })

      expect(result.current.messages).toEqual([])
      expect(result.current.error).toBeNull()
    })

    it('should remove messages from sessionStorage', () => {
      const { result } = renderHook(() => useChat())

      act(() => {
        result.current.clearSession()
      })

      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('nanomail_chat_messages')
    })
  })

  describe('sessionStorage backup', () => {
    it('should save messages to sessionStorage on change', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      // Wait for sessionStorage.setItem to be called
      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalledWith(
          'nanomail_chat_messages',
          expect.any(String)
        )
      })

      const savedData = JSON.parse(sessionStorageMock.setItem.mock.calls.at(-1)?.[1] || '[]')
      expect(savedData).toHaveLength(2)
    })

    it('should prune toolCalls input/output before saving to sessionStorage', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: { largeData: 'x'.repeat(10000) },
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: { result: 'y'.repeat(10000) },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create todo')
      })

      // Wait for sessionStorage.setItem to be called
      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(sessionStorageMock.setItem.mock.calls.at(-1)?.[1] || '[]')
      const assistantMessage = savedData.find((m: UIMessage) => m.role === 'assistant')

      expect(assistantMessage).toBeDefined()
      expect(assistantMessage.toolCalls).toBeDefined()
      expect(assistantMessage.toolCalls).toHaveLength(1)

      // input and output should be stripped
      expect(assistantMessage.toolCalls[0].input).toBeUndefined()
      expect(assistantMessage.toolCalls[0].output).toBeUndefined()
      // metadata should be preserved
      expect(assistantMessage.toolCalls[0].id).toBe('call-1')
      expect(assistantMessage.toolCalls[0].toolName).toBe('create_todo')
      expect(assistantMessage.toolCalls[0].status).toBe('success')
    })

    it('should preserve error status and message when pruning tool calls for sessionStorage', async () => {
      const events: ConversationEvent[] = [
        {
          type: 'tool_call_start',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: { description: 'Test' },
          },
        },
        {
          type: 'tool_call_end',
          data: {
            toolCallId: 'call-1',
            toolName: 'create_todo',
            toolInput: {},
            toolOutput: { error: 'Failed', status: 'failed' },
          },
        },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Create todo')
      })

      await waitFor(() => {
        expect(sessionStorageMock.setItem).toHaveBeenCalled()
      })

      const savedData = JSON.parse(sessionStorageMock.setItem.mock.calls.at(-1)?.[1] || '[]')
      const assistantMessage = savedData.find((m: UIMessage) => m.role === 'assistant')

      expect(assistantMessage.toolCalls[0].status).toBe('error')
      expect(assistantMessage.toolCalls[0].message).toBe('Failed')
      expect(assistantMessage.toolCalls[0].input).toBeUndefined()
      expect(assistantMessage.toolCalls[0].output).toBeUndefined()
    })

    it('should handle QuotaExceededError gracefully', async () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      sessionStorageMock.setItem.mockImplementationOnce(() => {
        const error = new Error('Quota exceeded')
        error.name = 'QuotaExceededError'
        throw error
      })

      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      expect(consoleWarnSpy).toHaveBeenCalled()
      consoleWarnSpy.mockRestore()
    })
  })

  describe('StreamingBuffer', () => {
    it('should batch result_chunk updates and flush on completion', async () => {
      const events: ConversationEvent[] = [
        { type: 'result_chunk', data: { content: 'A' } },
        { type: 'result_chunk', data: { content: 'B' } },
        { type: 'result_chunk', data: { content: 'C' } },
        { type: 'session_end', data: null },
      ]
      mockStreamChat.mockReturnValueOnce(createEventGenerator(events))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Hello')
      })

      // After streaming ends and flush is called, content should be accumulated
      expect(result.current.messages[1].content).toBe('ABC')
    })
  })

  describe('edge cases', () => {
    it('should handle empty message', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('')
      })

      expect(result.current.messages[0].content).toBe('')
    })

    it('should handle sending multiple messages in sequence', async () => {
      mockStreamChat
        .mockReturnValueOnce(createEventGenerator([{ type: 'result_chunk', data: { content: 'Response 1' } }, { type: 'session_end', data: null }]))
        .mockReturnValueOnce(createEventGenerator([{ type: 'result_chunk', data: { content: 'Response 2' } }, { type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('Message 1')
      })

      expect(result.current.messages).toHaveLength(2)
      expect(result.current.messages[1].content).toBe('Response 1')

      await act(async () => {
        await result.current.sendMessage('Message 2')
      })

      expect(result.current.messages).toHaveLength(4) // 2 messages per send
      expect(result.current.messages[0].content).toBe('Message 1')
      expect(result.current.messages[2].content).toBe('Message 2')
      expect(result.current.messages[3].content).toBe('Response 2')
    })

    it('should preserve message order', async () => {
      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      const { result } = renderHook(() => useChat())

      await act(async () => {
        await result.current.sendMessage('First')
      })

      mockStreamChat.mockReturnValueOnce(createEventGenerator([{ type: 'session_end', data: null }]))

      await act(async () => {
        await result.current.sendMessage('Second')
      })

      expect(result.current.messages[0].content).toBe('First')
      expect(result.current.messages[2].content).toBe('Second')
    })
  })
})
