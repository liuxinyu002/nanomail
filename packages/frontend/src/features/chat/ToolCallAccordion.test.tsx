import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ToolCallAccordion } from './ToolCallAccordion'
import type { ToolCallStatus } from '@/hooks/useChat'

// Helper to create a ToolCallStatus
function createToolCall(overrides: Partial<ToolCallStatus> = {}): ToolCallStatus {
  return {
    id: `call-${Math.random().toString(36).slice(2, 9)}`,
    toolName: 'test_tool',
    status: 'success',
    ...overrides,
  }
}

describe('ToolCallAccordion', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('edge cases', () => {
    it('should render nothing when toolCalls is empty', () => {
      const { container } = render(<ToolCallAccordion toolCalls={[]} />)
      expect(container).toBeEmptyDOMElement()
    })

    it('should render nothing when toolCalls is undefined', () => {
      const { container } = render(<ToolCallAccordion toolCalls={undefined as unknown as ToolCallStatus[]} />)
      expect(container).toBeEmptyDOMElement()
    })
  })

  describe('single tool call', () => {
    it('should render single tool call inline without accordion', () => {
      const toolCalls = [createToolCall({ toolName: 'create_todo', status: 'success' })]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      // Should show the badge directly
      expect(screen.getByText('create_todo')).toBeInTheDocument()
      // Should NOT have accordion button
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })

  describe('multiple tool calls - accordion', () => {
    it('should show summary with action count', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      expect(screen.getByText('Performed 3 actions')).toBeInTheDocument()
    })

    it('should show singular "action" for single success', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'pending' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      expect(screen.getByText(/Processing 1 action/)).toBeInTheDocument()
    })

    it('should show processing message when pending', () => {
      const toolCalls = [
        createToolCall({ status: 'pending' }),
        createToolCall({ status: 'pending' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      expect(screen.getByText('Processing 2 actions...')).toBeInTheDocument()
    })

    it('should show error message when there are errors', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'error' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      expect(screen.getByText('Completed with 1 error')).toBeInTheDocument()
    })

    it('should show plural "errors" for multiple errors', () => {
      const toolCalls = [
        createToolCall({ status: 'error' }),
        createToolCall({ status: 'error' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      expect(screen.getByText('Completed with 2 errors')).toBeInTheDocument()
    })

    it('should be expandable/collapsible', () => {
      const toolCalls = [
        createToolCall({ toolName: 'tool_1', status: 'success' }),
        createToolCall({ toolName: 'tool_2', status: 'success' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      const button = screen.getByRole('button')

      // Initially collapsed - tool names not visible
      expect(screen.queryByText('tool_1')).not.toBeInTheDocument()

      // Expand
      fireEvent.click(button)
      expect(screen.getByText('tool_1')).toBeInTheDocument()
      expect(screen.getByText('tool_2')).toBeInTheDocument()

      // Collapse
      fireEvent.click(button)
      expect(screen.queryByText('tool_1')).not.toBeInTheDocument()
    })

    it('should show Settings icon in header', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
      ]

      const { container } = render(<ToolCallAccordion toolCalls={toolCalls} />)

      // Settings icon should be present
      const settingsIcon = container.querySelector('svg')
      expect(settingsIcon).toBeInTheDocument()
    })

    it('should rotate chevron when expanded', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
      ]

      const { container } = render(<ToolCallAccordion toolCalls={toolCalls} />)

      const chevron = container.querySelector('.rotate-180')
      expect(chevron).not.toBeInTheDocument()

      // Expand
      fireEvent.click(screen.getByRole('button'))

      const rotatedChevron = container.querySelector('.rotate-180')
      expect(rotatedChevron).toBeInTheDocument()
    })
  })

  describe('auto-expand/collapse behavior', () => {
    it('should auto-expand when there are pending tool calls', () => {
      const toolCalls = [
        createToolCall({ toolName: 'pending_tool', status: 'pending' }),
        createToolCall({ status: 'success' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      // Should be expanded (tool name visible with ellipsis for pending)
      expect(screen.getByText('pending_tool...')).toBeInTheDocument()
    })

    it('should auto-collapse 800ms after all tools complete', () => {
      const { rerender } = render(
        <ToolCallAccordion
          toolCalls={[
            createToolCall({ toolName: 'tool_1', status: 'pending' }),
            createToolCall({ toolName: 'tool_2', status: 'pending' }),
          ]}
        />
      )

      // Initially expanded (pending shows with ellipsis)
      expect(screen.getByText('tool_1...')).toBeInTheDocument()

      // Update to all success
      rerender(
        <ToolCallAccordion
          toolCalls={[
            createToolCall({ toolName: 'tool_1', status: 'success' }),
            createToolCall({ toolName: 'tool_2', status: 'success' }),
          ]}
        />
      )

      // Still expanded immediately after change (success shows without ellipsis)
      expect(screen.getByText('tool_1')).toBeInTheDocument()

      // Advance timers by 800ms
      vi.advanceTimersByTime(800)

      // Rerender to flush the state change
      rerender(
        <ToolCallAccordion
          toolCalls={[
            createToolCall({ toolName: 'tool_1', status: 'success' }),
            createToolCall({ toolName: 'tool_2', status: 'success' }),
          ]}
        />
      )

      // Should be collapsed now
      expect(screen.queryByText('tool_1')).not.toBeInTheDocument()
    })

    it('should NOT auto-collapse if user manually expanded', async () => {
      const toolCalls = [
        createToolCall({ toolName: 'tool_1', status: 'success' }),
        createToolCall({ toolName: 'tool_2', status: 'success' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      // Initially collapsed
      expect(screen.queryByText('tool_1')).not.toBeInTheDocument()

      // User manually expands
      fireEvent.click(screen.getByRole('button'))
      expect(screen.getByText('tool_1')).toBeInTheDocument()

      // Advance timers
      vi.advanceTimersByTime(1000)

      // Should still be expanded (user manually opened)
      expect(screen.getByText('tool_1')).toBeInTheDocument()
    })
  })

  describe('styling', () => {
    it('should have proper border styling', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
      ]

      const { container } = render(<ToolCallAccordion toolCalls={toolCalls} />)

      const accordion = container.firstChild as HTMLElement
      expect(accordion).toHaveClass('border', 'border-gray-200', 'rounded-lg')
    })

    it('should have proper header button styling', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
      ]

      render(<ToolCallAccordion toolCalls={toolCalls} />)

      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-full', 'flex', 'items-center', 'justify-between')
    })

    it('should have proper content area styling when expanded', () => {
      const toolCalls = [
        createToolCall({ status: 'success' }),
        createToolCall({ status: 'success' }),
      ]

      const { container } = render(<ToolCallAccordion toolCalls={toolCalls} />)

      fireEvent.click(screen.getByRole('button'))

      const content = container.querySelector('.bg-white')
      expect(content).toHaveClass('p-2', 'space-y-1')
    })
  })
})
