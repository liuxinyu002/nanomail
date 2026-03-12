import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DraftEditor, type DraftEditorProps } from './DraftEditor'

// Mock fetch for SSE
const mockFetch = vi.fn()
global.fetch = mockFetch

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

// Mock ReadableStream for SSE
function createMockReadableStream(chunks: string[]) {
  let index = 0
  return {
    getReader: () => ({
      async read() {
        if (index < chunks.length) {
          const value = new TextEncoder().encode(chunks[index])
          index++
          return { done: false, value }
        }
        return { done: true, value: undefined }
      },
    }),
  }
}

describe('DraftEditor', () => {
  const defaultProps: DraftEditorProps = {
    emailId: 100,
    instruction: 'Please reply with a detailed timeline',
    onClose: vi.fn(),
    onSend: vi.fn(),
  }

  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('SSE Connection', () => {
    it('should start SSE connection on mount', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"thought","content":"Analyzing email..."}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      expect(mockFetch).toHaveBeenCalledWith('/api/agent/draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailId: 100,
          instruction: 'Please reply with a detailed timeline',
        }),
        signal: expect.any(AbortSignal),
      })
    })

    it('should handle SSE thought events', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"thought","content":"Analyzing email context"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Thought Process (1)')).toBeInTheDocument()
      })
    })

    it('should handle SSE draft events with typewriter effect', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"draft","content":"Dear "}\n\n',
          'data: {"type":"draft","content":"Client,"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        const textarea = screen.getByTestId('draft-textarea')
        expect(textarea).toHaveValue('Dear Client,')
      })
    })
  })

  describe('Status Indicators', () => {
    it('should show thinking status initially', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      expect(screen.getByText('Thinking...')).toBeInTheDocument()
    })

    it('should show done status when complete', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Done')).toBeInTheDocument()
      })
    })

    it('should show error status on failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument()
      })
    })
  })

  describe('Cancel Generation', () => {
    it('should show cancel button during generation', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})) // Never resolves

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('should abort SSE when cancel is clicked', async () => {
      const abortSpy = vi.fn()
      const mockAbortController = {
        abort: abortSpy,
        signal: {} as AbortSignal,
      }

      // Mock AbortController
      const originalAbortController = global.AbortController
      global.AbortController = vi.fn(() => mockAbortController) as unknown as typeof AbortController

      mockFetch.mockImplementation(() => new Promise(() => {}))

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      const cancelButton = screen.getByTestId('cancel-button')
      await act(async () => {
        fireEvent.click(cancelButton)
      })

      expect(abortSpy).toHaveBeenCalled()

      // Restore
      global.AbortController = originalAbortController
    })

    it('should hide cancel button after cancellation', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      const cancelButton = screen.getByTestId('cancel-button')
      await act(async () => {
        fireEvent.click(cancelButton)
      })

      await waitFor(() => {
        expect(screen.queryByTestId('cancel-button')).not.toBeInTheDocument()
      })
    })
  })

  describe('Thought Process Display', () => {
    it('should show collapsible thought process', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"thought","content":"First thought"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Thought Process (1)')).toBeInTheDocument()
      })
    })

    it('should expand thought process when clicked', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"thought","content":"First thought"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByText('Thought Process (1)')).toBeInTheDocument()
      })

      // Click to expand
      await user.click(screen.getByText('Thought Process (1)'))

      expect(screen.getByText('First thought')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should show retry button on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })
    })

    it('should retry when retry button is clicked', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('retry-button')).toBeInTheDocument()
      })

      // Set up success response for retry
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"done","content":""}\n\n',
        ]),
      }
      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        fireEvent.click(screen.getByTestId('retry-button'))
      })

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2)
      })
    })

    it('should preserve draft text on error', async () => {
      // First, have a successful draft
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"draft","content":"Draft content"}\n\n',
          'data: {"type":"error","content":"Something went wrong"}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        const textarea = screen.getByTestId('draft-textarea')
        expect(textarea).toHaveValue('Draft content')
      })
    })
  })

  describe('Send Button', () => {
    it('should be disabled during drafting', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {}))

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      // Send button should not be visible during drafting
      expect(screen.queryByTestId('send-button')).not.toBeInTheDocument()
    })

    it('should be enabled when draft is complete', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"draft","content":"Draft content"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toBeInTheDocument()
      })
    })

    it('should call onSend when send is clicked', async () => {
      const onSend = vi.fn().mockResolvedValue(undefined)
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"draft","content":"Draft content"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} onSend={onSend} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('send-button'))
      })

      expect(onSend).toHaveBeenCalledWith('Draft content')
    })

    it('should show sending state during send', async () => {
      const onSend = vi.fn().mockImplementation(() => new Promise(() => {}))
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"draft","content":"Draft"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} onSend={onSend} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('send-button')).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByTestId('send-button'))
      })

      expect(screen.getByText('Sending...')).toBeInTheDocument()
    })
  })

  describe('Back Button', () => {
    it('should show back button when draft is complete', async () => {
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
      })
    })

    it('should call onClose when back is clicked', async () => {
      const onClose = vi.fn()
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} onClose={onClose} />)
      })

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument()
      })

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /back/i }))
      })

      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('Draft Editing', () => {
    it('should allow editing the draft', async () => {
      const user = userEvent.setup()
      const mockResponse = {
        ok: true,
        body: createMockReadableStream([
          'data: {"type":"draft","content":"Original draft"}\n\n',
          'data: {"type":"done","content":""}\n\n',
        ]),
      }

      mockFetch.mockResolvedValueOnce(mockResponse)

      await act(async () => {
        render(<DraftEditor {...defaultProps} />)
      })

      await waitFor(() => {
        expect(screen.getByTestId('draft-textarea')).toBeInTheDocument()
      })

      const textarea = screen.getByTestId('draft-textarea')
      await user.clear(textarea)
      await user.type(textarea, 'Edited draft')

      expect(textarea).toHaveValue('Edited draft')
    })
  })
})