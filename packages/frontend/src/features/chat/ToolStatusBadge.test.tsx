import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ToolStatusBadge } from './ToolStatusBadge'
import type { ToolCallStatus } from '@/hooks/useChat'

function createToolCall(overrides: Partial<ToolCallStatus> = {}): ToolCallStatus {
  return {
    id: 'test-id',
    toolName: 'test_tool',
    status: 'pending',
    ...overrides,
  }
}

describe('ToolStatusBadge', () => {
  it('maps todo tool names to Chinese labels', () => {
    render(<ToolStatusBadge {...createToolCall({ toolName: 'createTodo', status: 'success' })} />)

    expect(screen.getByText('创建待办')).toBeInTheDocument()
  })

  it('shows pending todo label with ellipsis', () => {
    render(<ToolStatusBadge {...createToolCall({ toolName: 'updateTodo', status: 'pending' })} />)

    expect(screen.getByText('修改待办中...')).toBeInTheDocument()
  })

  it('uses macaron color chips for todo tools', () => {
    render(<ToolStatusBadge {...createToolCall({ toolName: 'deleteTodo', status: 'success' })} />)

    const badge = screen.getByText('删除待办').closest('div')
    expect(badge).toHaveStyle({ backgroundColor: '#FFB5BA' })
  })

  it('keeps non-todo tools in gray style', () => {
    const { container } = render(
      <ToolStatusBadge {...createToolCall({ toolName: 'search_mail', status: 'success' })} />
    )

    const badge = container.querySelector('.inline-flex')
    expect(badge).toHaveClass('bg-gray-50', 'text-gray-600')
    expect(screen.getByText('search_mail')).toBeInTheDocument()
  })

  it('shows output.message as lightweight fallback for todo tools without cards', () => {
    render(
      <ToolStatusBadge
        {...createToolCall({
          toolName: 'deleteTodo',
          status: 'success',
          output: { message: '已删除 1 条待办' },
        })}
      />
    )

    expect(screen.getByText('删除待办')).toBeInTheDocument()
    expect(screen.getByText('已删除 1 条待办')).toBeInTheDocument()
  })

  it('falls back to string output.result when output.message is missing', () => {
    render(
      <ToolStatusBadge
        {...createToolCall({
          toolName: 'deleteTodo',
          status: 'success',
          output: { result: '删除完成' },
        })}
      />
    )

    expect(screen.getByText('删除完成')).toBeInTheDocument()
  })

  it('does not duplicate error message inline when expandable details are shown', () => {
    render(
      <ToolStatusBadge
        {...createToolCall({
          toolName: 'deleteTodo',
          status: 'error',
          message: '删除失败',
        })}
      />
    )

    expect(screen.getByText('删除待办')).toBeInTheDocument()
    expect(screen.queryByText('删除失败')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('显示错误详情'))
    expect(screen.getByText('删除失败')).toBeInTheDocument()
  })

  it('does not render fallback text when createTodo already returns structured todo payload', () => {
    render(
      <ToolStatusBadge
        {...createToolCall({
          toolName: 'createTodo',
          status: 'success',
          output: {
            message: '已创建待办',
            todo: {
              id: 1,
              description: 'Test todo',
            },
          },
        })}
      />
    )

    expect(screen.getByText('创建待办')).toBeInTheDocument()
    expect(screen.queryByText('已创建待办')).not.toBeInTheDocument()
  })
})
