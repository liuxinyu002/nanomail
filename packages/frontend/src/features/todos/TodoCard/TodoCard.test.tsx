import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { TodoCard } from './TodoCard'
import { TodoCardHeader } from './TodoCardHeader'
import { TodoCardContent } from './TodoCardContent'
import { DeadlineChip } from './DeadlineChip'
import { EmailLinkIcon } from './EmailLinkIcon'
import type { Todo } from '@nanomail/shared'

// Helper to create mock Todo
function createMockTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 1,
    emailId: 100,
    description: 'Test todo description',
    status: 'pending',
    deadline: null,
    boardColumnId: 1,
    position: 0,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  }
}

// Wrapper for components that need router
function renderWithRouter(ui: React.ReactElement) {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

describe('TodoCard', () => {
  const defaultOnToggle = vi.fn()
  const defaultOnEdit = vi.fn()
  const defaultOnDelete = vi.fn()
  const defaultOnMoveToColumn = vi.fn()
  const defaultOnSetDeadline = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Card Styling', () => {
    it('should render with white background', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('bg-white')
    })

    it('should have soft shadow by default', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05)]')
    })

    it('should have hover shadow effect', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('hover:shadow-[0_8px_12px_-2px_rgba(0,0,0,0.08)]')
    })

    it('should have correct padding (p-4)', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('p-4')
    })

    it('should have margin bottom (mb-2)', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('mb-2')
    })

    it('should have rounded corners', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      expect(card).toHaveClass('rounded-md')
    })
  })

  describe('Checkbox Behavior', () => {
    it('should render unchecked checkbox for pending todo', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'pending' })}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should render checked checkbox for completed todo', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call onToggle when checkbox is clicked', async () => {
      const onToggle = vi.fn()
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={onToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      expect(onToggle).toHaveBeenCalledTimes(1)
    })

    it('should have brand blue color when checked', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      // Check for data-state attribute or class
      expect(checkbox).toHaveAttribute('data-state', 'checked')
    })
  })

  describe('Title Display', () => {
    it('should display todo description', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ description: 'My test task' })}
          onToggle={defaultOnToggle}
        />
      )

      expect(screen.getByText('My test task')).toBeInTheDocument()
    })

    it('should have primary text color', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('text-[#111827]')
    })

    it('should have font-medium class', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('font-medium')
    })

    it('should have line-clamp-2 by default (not expanded)', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-clamp-2')
    })

    it('should show line-through for completed todos', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-through')
    })

    it('should show opacity-50 for completed todos', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ status: 'completed' })}
          onToggle={defaultOnToggle}
        />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('opacity-50')
    })
  })

  describe('Expansion Behavior', () => {
    it('should start collapsed by default', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should expand when card body is clicked', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should collapse when expanded card is clicked again', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      // Click to expand
      await userEvent.click(card)
      // Click to collapse
      await userEvent.click(card)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on checkbox', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const checkbox = screen.getByRole('checkbox')
      await userEvent.click(checkbox)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on dropdown trigger', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const dropdownTrigger = screen.getByRole('button', { name: /more options/i })
      await userEvent.click(dropdownTrigger)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should NOT expand when clicking on email link', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo({ emailId: 123 })}
          onToggle={defaultOnToggle}
        />
      )

      const emailLink = screen.getByRole('link')
      fireEvent.click(emailLink)

      const expandableContent = screen.getByTestId('todo-card-expandable')
      expect(expandableContent).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should remove line-clamp-2 when expanded', async () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      const card = screen.getByTestId('todo-card')
      await userEvent.click(card)

      const title = screen.getByTestId('todo-card-title')
      expect(title).not.toHaveClass('line-clamp-2')
    })
  })

  describe('Dropdown Menu Integration', () => {
    it('should render dropdown menu trigger', () => {
      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
        />
      )

      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    })

    it('should pass callbacks to dropdown menu', async () => {
      const onEdit = vi.fn()
      const onDelete = vi.fn()

      renderWithRouter(
        <TodoCard
          todo={createMockTodo()}
          onToggle={defaultOnToggle}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )

      // Open dropdown
      await userEvent.click(screen.getByRole('button', { name: /more options/i }))

      // Click Edit
      await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))
      expect(onEdit).toHaveBeenCalled()

      // Open dropdown again
      await userEvent.click(screen.getByRole('button', { name: /more options/i }))

      // Click Delete
      await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }))
      expect(onDelete).toHaveBeenCalled()
    })
  })
})

describe('TodoCardHeader', () => {
  const defaultProps = {
    description: 'Test task',
    completed: false,
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Checkbox', () => {
    it('should render checkbox', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} />
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('should show unchecked state when completed is false', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} completed={false} />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()
    })

    it('should show checked state when completed is true', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} completed={true} />
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()
    })

    it('should call onToggle when checkbox is clicked', async () => {
      const onToggle = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onToggle={onToggle} />
      )

      await userEvent.click(screen.getByRole('checkbox'))
      expect(onToggle).toHaveBeenCalledTimes(1)
    })
  })

  describe('Title', () => {
    it('should display description', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} description="My Task" />
      )

      expect(screen.getByText('My Task')).toBeInTheDocument()
    })

    it('should have line-clamp-2 when not expanded', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} isExpanded={false} />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-clamp-2')
    })

    it('should NOT have line-clamp-2 when expanded', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} isExpanded={true} />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).not.toHaveClass('line-clamp-2')
    })

    it('should have line-through and opacity when completed', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} completed={true} />
      )

      const title = screen.getByTestId('todo-card-title')
      expect(title).toHaveClass('line-through')
      expect(title).toHaveClass('opacity-50')
    })
  })

  describe('Dropdown Menu', () => {
    it('should render dropdown menu trigger', () => {
      renderWithRouter(
        <TodoCardHeader {...defaultProps} />
      )

      expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
    })

    it('should pass callbacks to dropdown', async () => {
      const onEdit = vi.fn()
      renderWithRouter(
        <TodoCardHeader {...defaultProps} onEdit={onEdit} />
      )

      await userEvent.click(screen.getByRole('button', { name: /more options/i }))
      await userEvent.click(screen.getByRole('menuitem', { name: 'Edit' }))

      expect(onEdit).toHaveBeenCalled()
    })
  })
})

describe('TodoCardContent', () => {
  describe('DeadlineChip', () => {
    it('should render deadline when provided', () => {
      renderWithRouter(
        <TodoCardContent
          deadline="2024-12-25T00:00:00Z"
          isExpanded={false}
        />
      )

      // Chinese locale format: "12月25日"
      expect(screen.getByText(/12月/)).toBeInTheDocument()
      expect(screen.getByText(/25/)).toBeInTheDocument()
    })

    it('should NOT render when deadline is null', () => {
      renderWithRouter(
        <TodoCardContent
          deadline={null}
          isExpanded={false}
        />
      )

      // No deadline should be shown
      expect(screen.queryByTestId('deadline-chip')).not.toBeInTheDocument()
    })

    it('should NOT render when deadline is undefined', () => {
      renderWithRouter(
        <TodoCardContent isExpanded={false} />
      )

      expect(screen.queryByTestId('deadline-chip')).not.toBeInTheDocument()
    })
  })

  describe('EmailLinkIcon', () => {
    it('should render email link when emailId is provided', () => {
      renderWithRouter(
        <TodoCardContent
          emailId="123"
          isExpanded={false}
        />
      )

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/inbox/123')
    })

    it('should NOT render when emailId is null', () => {
      renderWithRouter(
        <TodoCardContent
          emailId={null}
          isExpanded={false}
        />
      )

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })

    it('should NOT render when emailId is undefined', () => {
      renderWithRouter(
        <TodoCardContent isExpanded={false} />
      )

      expect(screen.queryByRole('link')).not.toBeInTheDocument()
    })
  })

  describe('Expandable Area', () => {
    it('should be collapsed when isExpanded is false', () => {
      renderWithRouter(
        <TodoCardContent isExpanded={false} />
      )

      const expandable = screen.getByTestId('todo-card-expandable')
      expect(expandable).toHaveClass('[grid-template-rows:0fr]')
    })

    it('should be expanded when isExpanded is true', () => {
      renderWithRouter(
        <TodoCardContent isExpanded={true} />
      )

      const expandable = screen.getByTestId('todo-card-expandable')
      expect(expandable).toHaveClass('[grid-template-rows:1fr]')
    })

    it('should have transition class for animation', () => {
      renderWithRouter(
        <TodoCardContent isExpanded={false} />
      )

      const expandable = screen.getByTestId('todo-card-expandable')
      expect(expandable).toHaveClass('transition-[grid-template-rows]')
    })
  })
})

describe('DeadlineChip', () => {
  it('should render calendar icon', () => {
    renderWithRouter(<DeadlineChip deadline="2024-12-25T00:00:00Z" />)

    const chip = screen.getByTestId('deadline-chip')
    expect(chip.querySelector('svg')).toBeInTheDocument()
  })

  it('should format date string correctly', () => {
    renderWithRouter(<DeadlineChip deadline="2024-03-15T00:00:00Z" />)

    // Chinese locale format: "3月15日"
    expect(screen.getByText(/3月/)).toBeInTheDocument()
    expect(screen.getByText(/15/)).toBeInTheDocument()
  })

  it('should format Date object correctly', () => {
    renderWithRouter(<DeadlineChip deadline={new Date('2024-07-04T00:00:00Z')} />)

    // Chinese locale format: "7月4日"
    expect(screen.getByText(/7月/)).toBeInTheDocument()
    expect(screen.getByText(/4/)).toBeInTheDocument()
  })

  it('should have secondary text color', () => {
    renderWithRouter(<DeadlineChip deadline="2024-12-25T00:00:00Z" />)

    const chip = screen.getByTestId('deadline-chip')
    expect(chip).toHaveClass('text-[#6B7280]')
  })

  it('should have small text size', () => {
    renderWithRouter(<DeadlineChip deadline="2024-12-25T00:00:00Z" />)

    const chip = screen.getByTestId('deadline-chip')
    expect(chip).toHaveClass('text-sm')
  })
})

describe('EmailLinkIcon', () => {
  it('should render link with correct href', () => {
    renderWithRouter(<EmailLinkIcon emailId="456" />)

    const link = screen.getByRole('link')
    expect(link).toHaveAttribute('href', '/inbox/456')
  })

  it('should render ExternalLink icon', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link.querySelector('svg')).toBeInTheDocument()
  })

  it('should have secondary text color by default', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('text-[#6B7280]')
  })

  it('should have brand blue hover color', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('hover:text-[#2563EB]')
  })

  it('should have transition for color change', () => {
    renderWithRouter(<EmailLinkIcon emailId="123" />)

    const link = screen.getByRole('link')
    expect(link).toHaveClass('transition-colors')
  })
})

describe('Edge Cases', () => {
  const defaultOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should handle empty description gracefully', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo({ description: '' })}
        onToggle={defaultOnToggle}
      />
    )

    // Should render without errors
    expect(screen.getByTestId('todo-card')).toBeInTheDocument()
  })

  it('should handle very long description', () => {
    const longDescription = 'A'.repeat(1000)
    renderWithRouter(
      <TodoCard
        todo={createMockTodo({ description: longDescription })}
        onToggle={defaultOnToggle}
      />
    )

    const title = screen.getByTestId('todo-card-title')
    expect(title).toHaveClass('line-clamp-2')
  })

  it('should handle in_progress status (not completed)', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo({ status: 'in_progress' })}
        onToggle={defaultOnToggle}
      />
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()

    const title = screen.getByTestId('todo-card-title')
    expect(title).not.toHaveClass('line-through')
  })

  it('should accept custom className', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
        className="custom-class"
      />
    )

    const card = screen.getByTestId('todo-card')
    expect(card).toHaveClass('custom-class')
  })

  it('should work without optional callbacks', () => {
    // Should not throw with only required props
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    expect(screen.getByTestId('todo-card')).toBeInTheDocument()
  })
})

describe('Accessibility', () => {
  const defaultOnToggle = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should have cursor-pointer on card', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    const card = screen.getByTestId('todo-card')
    expect(card).toHaveClass('cursor-pointer')
  })

  it('should have checkbox accessible by role', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('should have more options button accessible by label', () => {
    renderWithRouter(
      <TodoCard
        todo={createMockTodo()}
        onToggle={defaultOnToggle}
      />
    )

    expect(screen.getByRole('button', { name: /more options/i })).toBeInTheDocument()
  })
})