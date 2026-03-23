import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToolStatusBadge } from './ToolStatusBadge'
import type { ToolCallStatus } from '@/hooks/useChat'

// Helper to create a partial ToolCallStatus for testing
function createToolCall(overrides: Partial<ToolCallStatus> = {}): ToolCallStatus {
  return {
    id: 'test-id',
    toolName: 'test_tool',
    status: 'pending',
    ...overrides,
  }
}

describe('ToolStatusBadge', () => {
  describe('basic rendering', () => {
    it('should render the tool name', () => {
      render(<ToolStatusBadge {...createToolCall({ toolName: 'create_todo' })} />)

      expect(screen.getByText(/create_todo/)).toBeInTheDocument()
    })

    it('should have inline-flex layout', () => {
      const { container } = render(<ToolStatusBadge {...createToolCall()} />)

      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('inline-flex')
    })

    it('should have correct padding and styling', () => {
      const { container } = render(<ToolStatusBadge {...createToolCall()} />)

      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('px-2', 'py-1', 'rounded')
    })
  })

  describe('status: pending', () => {
    it('should show spinning loader icon when pending', () => {
      const { container } = render(
        <ToolStatusBadge {...createToolCall({ status: 'pending' })} />
      )

      const spinner = container.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
    })

    it('should show ellipsis after tool name when pending', () => {
      render(
        <ToolStatusBadge {...createToolCall({ toolName: 'create_todo', status: 'pending' })} />
      )

      expect(screen.getByText('create_todo...')).toBeInTheDocument()
    })

    it('should have gray color scheme when pending', () => {
      const { container } = render(
        <ToolStatusBadge {...createToolCall({ status: 'pending' })} />
      )

      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('bg-gray-50', 'text-gray-600')
    })
  })

  describe('status: success', () => {
    it('should show checkmark icon when success', () => {
      const { container } = render(
        <ToolStatusBadge {...createToolCall({ status: 'success' })} />
      )

      // Check icon is present (it should have text-green-600 class)
      const icon = container.querySelector('.text-green-600')
      expect(icon).toBeInTheDocument()
    })

    it('should display message when provided on success', () => {
      render(
        <ToolStatusBadge
          {...createToolCall({
            toolName: 'create_todo',
            status: 'success',
            message: 'Todo created successfully'
          })}
        />
      )

      expect(screen.getByText('Todo created successfully')).toBeInTheDocument()
    })

    it('should display tool name when no message on success', () => {
      render(
        <ToolStatusBadge {...createToolCall({ toolName: 'update_todo', status: 'success' })} />
      )

      expect(screen.getByText('update_todo')).toBeInTheDocument()
    })
  })

  describe('status: error', () => {
    it('should show X icon when error', () => {
      const { container } = render(
        <ToolStatusBadge {...createToolCall({ status: 'error' })} />
      )

      const icon = container.querySelector('.text-red-600')
      expect(icon).toBeInTheDocument()
    })

    it('should display error message when provided', () => {
      render(
        <ToolStatusBadge
          {...createToolCall({
            toolName: 'delete_todo',
            status: 'error',
            message: 'Failed to delete'
          })}
        />
      )

      expect(screen.getByText('Failed to delete')).toBeInTheDocument()
    })

    it('should display tool name when no message on error', () => {
      render(
        <ToolStatusBadge {...createToolCall({ toolName: 'delete_todo', status: 'error' })} />
      )

      expect(screen.getByText('delete_todo')).toBeInTheDocument()
    })
  })

  describe('icon sizes', () => {
    it('should have small icons (h-3 w-3)', () => {
      const { container } = render(
        <ToolStatusBadge {...createToolCall({ status: 'pending' })} />
      )

      const icon = container.querySelector('svg')
      expect(icon).toHaveClass('h-3', 'w-3')
    })
  })

  describe('text styling', () => {
    it('should have small text', () => {
      const { container } = render(<ToolStatusBadge {...createToolCall()} />)

      const badge = container.firstChild as HTMLElement
      expect(badge).toHaveClass('text-xs')
    })
  })
})
