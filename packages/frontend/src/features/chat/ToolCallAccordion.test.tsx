import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToolCallAccordion } from './ToolCallAccordion'
import type { ToolCallStatus } from '@/hooks/useChat'

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

  it('renders nothing when toolCalls is empty', () => {
    const { container } = render(<ToolCallAccordion toolCalls={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a single tool call inline without accordion', () => {
    render(
      <ToolCallAccordion
        toolCalls={[createToolCall({ toolName: 'create_todo', status: 'success' })]}
      />
    )

    expect(screen.getByText('创建待办')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows grouped summary text by todo operation type', () => {
    render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'create_todo' }),
          createToolCall({ toolName: 'update_todo' }),
          createToolCall({ toolName: 'update_todo' }),
          createToolCall({ toolName: 'delete_todo' }),
        ]}
      />
    )

    expect(screen.getByText('创建 1 项 · 修改 2 项 · 删除 1 项')).toBeInTheDocument()
  })

  it('falls back to 其他 for unknown tools', () => {
    render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'search_mail' }),
          createToolCall({ toolName: 'send_email' }),
        ]}
      />
    )

    expect(screen.getByText('其他 2 项')).toBeInTheDocument()
  })

  it('appends unknown tool count when mixed with todo tools', () => {
    render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'create_todo' }),
          createToolCall({ toolName: 'search_mail' }),
        ]}
      />
    )

    expect(screen.getByText('创建 1 项 · 其他 1 项')).toBeInTheDocument()
  })

  it('is expandable and collapsible', () => {
    render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'tool_1' }),
          createToolCall({ toolName: 'tool_2' }),
        ]}
      />
    )

    const button = screen.getByRole('button')
    expect(screen.queryByText('tool_1')).not.toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.getByText('tool_1')).toBeInTheDocument()
    expect(screen.getByText('tool_2')).toBeInTheDocument()

    fireEvent.click(button)
    expect(screen.queryByText('tool_1')).not.toBeInTheDocument()
  })

  it('auto-expands when there are pending tool calls', () => {
    render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'create_todo', status: 'pending' }),
          createToolCall({ toolName: 'update_todo', status: 'success' }),
        ]}
      />
    )

    expect(screen.getByText('创建待办中...')).toBeInTheDocument()
  })

  it('auto-collapses 800ms after all tools complete', () => {
    const { rerender } = render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'create_todo', status: 'pending' }),
          createToolCall({ toolName: 'update_todo', status: 'pending' }),
        ]}
      />
    )

    expect(screen.getByText('创建待办中...')).toBeInTheDocument()

    rerender(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'create_todo', status: 'success' }),
          createToolCall({ toolName: 'update_todo', status: 'success' }),
        ]}
      />
    )

    expect(screen.getByText('创建待办')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(800)
    })

    rerender(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'create_todo', status: 'success' }),
          createToolCall({ toolName: 'update_todo', status: 'success' }),
        ]}
      />
    )

    expect(screen.queryByText('创建待办')).not.toBeInTheDocument()
  })

  it('stays collapsed for completed tools until manually expanded', () => {
    render(
      <ToolCallAccordion
        toolCalls={[
          createToolCall({ toolName: 'tool_1', status: 'success' }),
          createToolCall({ toolName: 'tool_2', status: 'success' }),
        ]}
      />
    )

    expect(screen.queryByText('tool_1')).not.toBeInTheDocument()
    expect(screen.queryByText('tool_2')).not.toBeInTheDocument()
  })
})
