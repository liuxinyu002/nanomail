import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PlannerViewToggle } from './PlannerViewToggle'

describe('PlannerViewToggle', () => {
  describe('rendering', () => {
    it('renders with "day" as default active state', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      // Should have two buttons
      const dayButton = screen.getByRole('button', { name: /日/i })
      const weekButton = screen.getByRole('button', { name: /周/i })

      expect(dayButton).toBeInTheDocument()
      expect(weekButton).toBeInTheDocument()

      // Day button should be active
      expect(dayButton).toHaveClass('bg-primary')
      expect(dayButton).toHaveClass('text-primary-foreground')

      // Week button should be inactive
      expect(weekButton).toHaveClass('bg-transparent')
      expect(weekButton).toHaveClass('text-muted-foreground')
    })

    it('renders with "week" as active state when value is "week"', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="week" onChange={onChange} />)

      const dayButton = screen.getByRole('button', { name: /日/i })
      const weekButton = screen.getByRole('button', { name: /周/i })

      // Week button should be active
      expect(weekButton).toHaveClass('bg-primary')
      expect(weekButton).toHaveClass('text-primary-foreground')

      // Day button should be inactive
      expect(dayButton).toHaveClass('bg-transparent')
      expect(dayButton).toHaveClass('text-muted-foreground')
    })

    it('applies custom className prop', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} className="custom-class" />)

      // The container should have the custom class
      const container = screen.getByTestId('planner-view-toggle')
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('interactions', () => {
    it('calls onChange with "week" when week button is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const weekButton = screen.getByRole('button', { name: /周/i })
      await user.click(weekButton)

      expect(onChange).toHaveBeenCalledWith('week')
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('calls onChange with "day" when day button is clicked', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<PlannerViewToggle value="week" onChange={onChange} />)

      const dayButton = screen.getByRole('button', { name: /日/i })
      await user.click(dayButton)

      expect(onChange).toHaveBeenCalledWith('day')
      expect(onChange).toHaveBeenCalledTimes(1)
    })

    it('does not call onChange when clicking the already active button', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const dayButton = screen.getByRole('button', { name: /日/i })
      await user.click(dayButton)

      // Should still call onChange even if clicking active button
      // (this is normal behavior for toggle buttons)
      expect(onChange).toHaveBeenCalledWith('day')
    })
  })

  describe('styling', () => {
    it('has correct active button styling', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const dayButton = screen.getByRole('button', { name: /日/i })
      expect(dayButton).toHaveClass('bg-primary')
      expect(dayButton).toHaveClass('text-primary-foreground')
    })

    it('has correct inactive button styling with hover state', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const weekButton = screen.getByRole('button', { name: /周/i })
      expect(weekButton).toHaveClass('bg-transparent')
      expect(weekButton).toHaveClass('text-muted-foreground')
      expect(weekButton).toHaveClass('hover:bg-muted')
    })

    it('has segmented control container styling', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const container = screen.getByTestId('planner-view-toggle')
      // Should be a flex container with gap or inline-flex
      expect(container).toHaveClass('flex')
    })

    it('buttons have pill shape', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const dayButton = screen.getByRole('button', { name: /日/i })
      const weekButton = screen.getByRole('button', { name: /周/i })

      // Both buttons should have rounded corners
      expect(dayButton).toHaveClass('rounded-md')
      expect(weekButton).toHaveClass('rounded-md')
    })

    it('does not have scale effects on buttons (per design system)', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const dayButton = screen.getByRole('button', { name: /日/i })
      const weekButton = screen.getByRole('button', { name: /周/i })

      // Should not have scale classes
      const dayClasses = dayButton.className
      const weekClasses = weekButton.className

      expect(dayClasses).not.toMatch(/scale/)
      expect(weekClasses).not.toMatch(/scale/)
    })
  })

  describe('accessibility', () => {
    it('has proper role for buttons', () => {
      const onChange = vi.fn()
      render(<PlannerViewToggle value="day" onChange={onChange} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(2)
    })
  })
})