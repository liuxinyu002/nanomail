import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WeekDateNav } from './WeekDateNav'
import { addDays, startOfWeek } from 'date-fns'

describe('WeekDateNav', () => {
  // Reference date: Wednesday, March 18, 2026
  const testDate = new Date(2026, 2, 18) // March 18, 2026 (Wednesday)
  const weekStart = startOfWeek(testDate, { weekStartsOn: 0 }) // Sunday, March 15, 2026

  const defaultProps = {
    weekStart,
    selectedDate: testDate,
    onDateSelect: vi.fn(),
    onWeekChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders 7 date items for the week', () => {
      render(<WeekDateNav {...defaultProps} />)

      // Should have 7 date buttons (excluding navigation arrows)
      const dateButtons = screen.getAllByTestId(/date-item-/i)
      expect(dateButtons).toHaveLength(7)
    })

    it('displays correct weekday labels in Chinese (日、一、二、三、四、五、六)', () => {
      render(<WeekDateNav {...defaultProps} />)

      // Chinese weekday abbreviations
      const expectedLabels = ['日', '一', '二', '三', '四', '五', '六']

      expectedLabels.forEach((label) => {
        expect(screen.getByText(new RegExp(label))).toBeInTheDocument()
      })
    })

    it('displays correct day numbers for the week', () => {
      render(<WeekDateNav {...defaultProps} />)

      // Week starting March 15, 2026 (Sunday) to March 21, 2026 (Saturday)
      const expectedDays = [15, 16, 17, 18, 19, 20, 21]

      expectedDays.forEach((day) => {
        expect(screen.getByText(day.toString())).toBeInTheDocument()
      })
    })

    it('renders left and right navigation arrows', () => {
      render(<WeekDateNav {...defaultProps} />)

      const leftArrow = screen.getByRole('button', { name: /上一周/i })
      const rightArrow = screen.getByRole('button', { name: /下一周/i })

      expect(leftArrow).toBeInTheDocument()
      expect(rightArrow).toBeInTheDocument()
    })

    it('applies custom className prop', () => {
      render(<WeekDateNav {...defaultProps} className="custom-class" />)

      const container = screen.getByTestId('week-date-nav')
      expect(container).toHaveClass('custom-class')
    })
  })

  describe('selected date styling', () => {
    it('selected date shows bg-blue-600 and text-white', () => {
      render(<WeekDateNav {...defaultProps} />)

      // March 18 is selected
      const selectedButton = screen.getByTestId('date-item-3') // 0-indexed, Wednesday is index 3
      expect(selectedButton).toHaveClass('bg-blue-600')
      expect(selectedButton).toHaveClass('text-white')
    })

    it('non-selected dates do not have selected styling', () => {
      render(<WeekDateNav {...defaultProps} />)

      // Sunday (index 0) is not selected
      const sundayButton = screen.getByTestId('date-item-0')
      expect(sundayButton).not.toHaveClass('bg-blue-600')
      expect(sundayButton).not.toHaveClass('text-white')
    })
  })

  describe('today indicator styling', () => {
    it('today (not selected) shows text-blue-600 font-bold', () => {
      // Use today's date as the selected date to test the "today when selected" case
      const today = new Date()
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      const yesterday = addDays(today, -1)

      render(
        <WeekDateNav
          weekStart={todayWeekStart}
          selectedDate={yesterday}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      // Find today's button (it should not be selected since we selected yesterday)
      const todayIndex = today.getDay() // 0 = Sunday, 1 = Monday, etc.
      const todayButton = screen.getByTestId(`date-item-${todayIndex}`)

      // Today should have blue text and bold styling (but not selected bg)
      expect(todayButton).toHaveClass('text-blue-600')
      expect(todayButton).toHaveClass('font-bold')
    })

    it('today when selected applies selected state style (priority over today style)', () => {
      const today = new Date()
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 })

      render(
        <WeekDateNav
          weekStart={todayWeekStart}
          selectedDate={today}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      const todayIndex = today.getDay()
      const todayButton = screen.getByTestId(`date-item-${todayIndex}`)

      // Selected state takes priority
      expect(todayButton).toHaveClass('bg-blue-600')
      expect(todayButton).toHaveClass('text-white')
    })

    it('shows dot indicator for today when not selected', () => {
      const today = new Date()
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 })
      const yesterday = addDays(today, -1)

      render(
        <WeekDateNav
          weekStart={todayWeekStart}
          selectedDate={yesterday}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      const todayIndex = today.getDay()
      const todayButton = screen.getByTestId(`date-item-${todayIndex}`)

      // Should have a dot indicator
      const dotIndicator = todayButton.querySelector('.today-dot')
      expect(dotIndicator).toBeInTheDocument()
    })

    it('does not show dot indicator for today when selected', () => {
      const today = new Date()
      const todayWeekStart = startOfWeek(today, { weekStartsOn: 0 })

      render(
        <WeekDateNav
          weekStart={todayWeekStart}
          selectedDate={today}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      const todayIndex = today.getDay()
      const todayButton = screen.getByTestId(`date-item-${todayIndex}`)

      // Should NOT have a dot indicator when selected
      const dotIndicator = todayButton.querySelector('.today-dot')
      expect(dotIndicator).not.toBeInTheDocument()
    })
  })

  describe('normal date styling', () => {
    it('non-selected, non-today dates have hover effect', () => {
      // Use a date that is not today
      const pastDate = new Date(2026, 0, 1) // January 1, 2026
      const pastWeekStart = startOfWeek(pastDate, { weekStartsOn: 0 })

      render(
        <WeekDateNav
          weekStart={pastWeekStart}
          selectedDate={pastDate}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      // Monday (index 1) should not be selected or today
      const mondayButton = screen.getByTestId('date-item-1')
      expect(mondayButton).toHaveClass('hover:bg-gray-50')
    })
  })

  describe('interactions', () => {
    it('click date triggers onDateSelect with correct date', async () => {
      const user = userEvent.setup()
      const onDateSelect = vi.fn()
      render(<WeekDateNav {...defaultProps} onDateSelect={onDateSelect} />)

      // Click on Monday (index 1, March 16)
      const mondayButton = screen.getByTestId('date-item-1')
      await user.click(mondayButton)

      expect(onDateSelect).toHaveBeenCalledTimes(1)
      const calledDate = onDateSelect.mock.calls[0][0]
      expect(calledDate.getDate()).toBe(16)
      expect(calledDate.getMonth()).toBe(2) // March
      expect(calledDate.getFullYear()).toBe(2026)
    })

    it('click left arrow triggers onWeekChange with "prev"', async () => {
      const user = userEvent.setup()
      const onWeekChange = vi.fn()
      render(<WeekDateNav {...defaultProps} onWeekChange={onWeekChange} />)

      const leftArrow = screen.getByRole('button', { name: /上一周/i })
      await user.click(leftArrow)

      expect(onWeekChange).toHaveBeenCalledWith('prev')
      expect(onWeekChange).toHaveBeenCalledTimes(1)
    })

    it('click right arrow triggers onWeekChange with "next"', async () => {
      const user = userEvent.setup()
      const onWeekChange = vi.fn()
      render(<WeekDateNav {...defaultProps} onWeekChange={onWeekChange} />)

      const rightArrow = screen.getByRole('button', { name: /下一周/i })
      await user.click(rightArrow)

      expect(onWeekChange).toHaveBeenCalledWith('next')
      expect(onWeekChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('has proper button roles for all interactive elements', () => {
      render(<WeekDateNav {...defaultProps} />)

      // 7 date buttons + 2 navigation arrows = 9 buttons total
      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(9)
    })

    it('date buttons are focusable', () => {
      render(<WeekDateNav {...defaultProps} />)

      const dateButtons = screen.getAllByTestId(/date-item-/i)
      dateButtons.forEach((button) => {
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })

    it('navigation arrows have accessible labels', () => {
      render(<WeekDateNav {...defaultProps} />)

      expect(screen.getByRole('button', { name: /上一周/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /下一周/i })).toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('handles week spanning across month boundary', () => {
      // Last week of March 2026: March 29 - April 4
      const weekStart = new Date(2026, 2, 29) // March 29, 2026 (Sunday)
      const selectedDate = new Date(2026, 2, 31) // March 31

      render(
        <WeekDateNav
          weekStart={weekStart}
          selectedDate={selectedDate}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      // Should display days from both months
      expect(screen.getByText('29')).toBeInTheDocument() // March 29
      expect(screen.getByText('31')).toBeInTheDocument() // March 31
      expect(screen.getByText('1')).toBeInTheDocument() // April 1
      expect(screen.getByText('4')).toBeInTheDocument() // April 4
    })

    it('handles week spanning across year boundary', () => {
      // Last week of December 2025: Dec 28 - Jan 3
      const weekStart = new Date(2025, 11, 28) // December 28, 2025 (Sunday)
      const selectedDate = new Date(2025, 11, 31) // December 31

      render(
        <WeekDateNav
          weekStart={weekStart}
          selectedDate={selectedDate}
          onDateSelect={vi.fn()}
          onWeekChange={vi.fn()}
        />
      )

      // Should display days from both years
      expect(screen.getByText('28')).toBeInTheDocument() // Dec 28
      expect(screen.getByText('31')).toBeInTheDocument() // Dec 31
      expect(screen.getByText('1')).toBeInTheDocument() // Jan 1
      expect(screen.getByText('3')).toBeInTheDocument() // Jan 3
    })
  })
})