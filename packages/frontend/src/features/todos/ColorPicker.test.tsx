import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPicker, type ColorPickerProps } from './ColorPicker'
import { MACARON_COLOR_OPTIONS } from '@/constants/colors'

describe('ColorPicker', () => {
  const defaultProps: ColorPickerProps = {
    value: null,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Macaron Color Configuration', () => {
    it('should render 7 macaron color options', () => {
      render(<ColorPicker {...defaultProps} />)

      const colorButtons = screen.getAllByRole('button')
      expect(colorButtons).toHaveLength(7)
    })

    it('should have correct macaron color hex values', () => {
      render(<ColorPicker {...defaultProps} />)

      // Verify the macaron colors are rendered
      const redButton = screen.getByRole('button', { name: 'Pastel Red' })
      expect(redButton).toHaveStyle({ backgroundColor: '#FFB5BA' })

      const orangeButton = screen.getByRole('button', { name: 'Pastel Orange' })
      expect(orangeButton).toHaveStyle({ backgroundColor: '#FFD8A8' })

      const yellowButton = screen.getByRole('button', { name: 'Pastel Yellow' })
      expect(yellowButton).toHaveStyle({ backgroundColor: '#FFF4B8' })

      const greenButton = screen.getByRole('button', { name: 'Pastel Green' })
      expect(greenButton).toHaveStyle({ backgroundColor: '#B8E6C1' })

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })
      expect(blueButton).toHaveStyle({ backgroundColor: '#B8D4FF' })

      const purpleButton = screen.getByRole('button', { name: 'Pastel Purple' })
      expect(purpleButton).toHaveStyle({ backgroundColor: '#D4B8FF' })

      const grayButton = screen.getByRole('button', { name: 'Pastel Gray' })
      expect(grayButton).toHaveStyle({ backgroundColor: '#C9CDD4' })
    })

    it('should use MACARON_COLOR_OPTIONS from constants', () => {
      // Verify MACARON_COLOR_OPTIONS has expected structure
      expect(MACARON_COLOR_OPTIONS).toHaveLength(7)
      expect(MACARON_COLOR_OPTIONS[0].name).toBe('Pastel Red')
      expect(MACARON_COLOR_OPTIONS[0].hex).toBe('#FFB5BA')
    })
  })

  describe('Rendering', () => {
    it('should render all 7 color buttons', () => {
      render(<ColorPicker {...defaultProps} />)

      const colorButtons = screen.getAllByRole('button')
      expect(colorButtons).toHaveLength(7)
    })

    it('should render color buttons with accessible labels (macaron palette)', () => {
      render(<ColorPicker {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Pastel Red' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pastel Orange' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pastel Yellow' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pastel Green' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pastel Blue' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pastel Purple' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pastel Gray' })).toBeInTheDocument()
    })

    it('should have correct background colors on buttons (macaron palette)', () => {
      render(<ColorPicker {...defaultProps} />)

      const redButton = screen.getByRole('button', { name: 'Pastel Red' })
      expect(redButton).toHaveStyle({ backgroundColor: '#FFB5BA' })

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })
      expect(blueButton).toHaveStyle({ backgroundColor: '#B8D4FF' })
    })

    it('should render in a grid layout', () => {
      const { container } = render(<ColorPicker {...defaultProps} />)

      const gridContainer = container.firstChild
      expect(gridContainer).toHaveClass('grid')
      expect(gridContainer).toHaveClass('grid-cols-6')
    })
  })

  describe('Selection State', () => {
    it('should show no selection when value is null', () => {
      render(<ColorPicker {...defaultProps} value={null} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveAttribute('aria-pressed', 'true')
      })
    })

    it('should highlight selected color with ring effect', () => {
      render(<ColorPicker {...defaultProps} value="#B8D4FF" />)

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })
      expect(blueButton).toHaveClass('ring-2')
      expect(blueButton).toHaveClass('ring-blue-500')
    })

    it('should have aria-pressed true for selected color', () => {
      render(<ColorPicker {...defaultProps} value="#B8E6C1" />)

      const greenButton = screen.getByRole('button', { name: 'Pastel Green' })
      expect(greenButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have aria-pressed false for non-selected colors', () => {
      render(<ColorPicker {...defaultProps} value="#B8D4FF" />)

      const redButton = screen.getByRole('button', { name: 'Pastel Red' })
      expect(redButton).toHaveAttribute('aria-pressed', 'false')

      const greenButton = screen.getByRole('button', { name: 'Pastel Green' })
      expect(greenButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should select correct color when value matches a preset', () => {
      render(<ColorPicker {...defaultProps} value="#D4B8FF" />)

      const purpleButton = screen.getByRole('button', { name: 'Pastel Purple' })
      expect(purpleButton).toHaveClass('ring-2')
    })

    it('should show no selection for non-preset color', () => {
      render(<ColorPicker {...defaultProps} value="#FF0000" />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveClass('ring-2')
      })
    })
  })

  describe('Click Interactions', () => {
    it('should call onChange with color hex when clicking unselected color', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} onChange={onChange} />)

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })
      await userEvent.click(blueButton)

      expect(onChange).toHaveBeenCalledWith('#B8D4FF')
    })

    it('should call onChange with null when clicking selected color (deselect)', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} value="#B8D4FF" onChange={onChange} />)

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })
      await userEvent.click(blueButton)

      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('should call onChange with new color when clicking different color', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} value="#B8D4FF" onChange={onChange} />)

      const greenButton = screen.getByRole('button', { name: 'Pastel Green' })
      await userEvent.click(greenButton)

      expect(onChange).toHaveBeenCalledWith('#B8E6C1')
    })

    it('should call onChange exactly once per click', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} onChange={onChange} />)

      const yellowButton = screen.getByRole('button', { name: 'Pastel Yellow' })
      await userEvent.click(yellowButton)

      expect(onChange).toHaveBeenCalledTimes(1)
    })
  })

  describe('Button Styling', () => {
    it('should have rounded buttons', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('rounded-full')
      })
    })

    it('should have appropriate size for buttons', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('w-6')
        expect(button).toHaveClass('h-6')
      })
    })

    it('should have hover effect', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('hover:scale-110')
      })
    })

    it('should have transition effect', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('transition-transform')
      })
    })

    it('should have cursor pointer', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveClass('cursor-pointer')
      })
    })
  })

  describe('Accessibility', () => {
    it('should have role="button" for all color options', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      expect(buttons).toHaveLength(7)
    })

    it('should have aria-label for each color button (macaron palette)', () => {
      render(<ColorPicker {...defaultProps} />)

      const colorNames = ['Pastel Red', 'Pastel Orange', 'Pastel Yellow', 'Pastel Green', 'Pastel Blue', 'Pastel Purple', 'Pastel Gray']
      colorNames.forEach(name => {
        expect(screen.getByRole('button', { name })).toBeInTheDocument()
      })
    })

    it('should have aria-pressed attribute on all buttons', () => {
      render(<ColorPicker {...defaultProps} value="#FFB5BA" />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('aria-pressed')
      })
    })

    it('should be keyboard focusable', () => {
      render(<ColorPicker {...defaultProps} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).toHaveAttribute('type', 'button')
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string as no selection', () => {
      render(<ColorPicker {...defaultProps} value="" />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveClass('ring-2')
      })
    })

    it('should handle undefined value as no selection', () => {
      render(<ColorPicker {...defaultProps} value={undefined as unknown as string | null} />)

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        expect(button).not.toHaveClass('ring-2')
      })
    })

    it('should handle case-insensitive hex comparison', () => {
      // #b8d4fF should match #B8D4FF
      render(<ColorPicker {...defaultProps} value="#b8d4fF" />)

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })
      expect(blueButton).toHaveClass('ring-2')
    })

    it('should handle rapid clicks', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} onChange={onChange} />)

      const blueButton = screen.getByRole('button', { name: 'Pastel Blue' })

      await userEvent.click(blueButton)
      await userEvent.click(blueButton)
      await userEvent.click(blueButton)

      expect(onChange).toHaveBeenCalledTimes(3)
    })
  })

  describe('Container Styling', () => {
    it('should have gap between buttons', () => {
      const { container } = render(<ColorPicker {...defaultProps} />)

      const gridContainer = container.firstChild
      expect(gridContainer).toHaveClass('gap-2')
    })

    it('should accept custom className', () => {
      const { container } = render(<ColorPicker {...defaultProps} className="custom-class" />)

      const gridContainer = container.firstChild
      expect(gridContainer).toHaveClass('custom-class')
    })
  })
})