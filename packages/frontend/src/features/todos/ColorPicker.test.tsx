import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ColorPicker, type ColorPickerProps, PRESET_COLORS } from './ColorPicker'

describe('ColorPicker', () => {
  const defaultProps: ColorPickerProps = {
    value: null,
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Preset Colors Configuration', () => {
    it('should export PRESET_COLORS with 6 colors', () => {
      expect(PRESET_COLORS).toHaveLength(6)
    })

    it('should have correct color values', () => {
      const expectedColors = [
        { name: 'Gray', hex: '#E5E7EB', tailwind: 'bg-gray-200' },
        { name: 'Blue', hex: '#DBEAFE', tailwind: 'bg-blue-100' },
        { name: 'Green', hex: '#D1FAE5', tailwind: 'bg-green-100' },
        { name: 'Yellow', hex: '#FEF3C7', tailwind: 'bg-yellow-100' },
        { name: 'Purple', hex: '#EDE9FE', tailwind: 'bg-purple-100' },
        { name: 'Pink', hex: '#FCE7F3', tailwind: 'bg-pink-100' },
      ]

      expectedColors.forEach((expected, index) => {
        expect(PRESET_COLORS[index].name).toBe(expected.name)
        expect(PRESET_COLORS[index].hex).toBe(expected.hex)
        expect(PRESET_COLORS[index].tailwind).toBe(expected.tailwind)
      })
    })
  })

  describe('Rendering', () => {
    it('should render all 6 color buttons', () => {
      render(<ColorPicker {...defaultProps} />)

      const colorButtons = screen.getAllByRole('button')
      expect(colorButtons).toHaveLength(6)
    })

    it('should render color buttons with accessible labels', () => {
      render(<ColorPicker {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Gray' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Blue' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Green' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Yellow' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Purple' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Pink' })).toBeInTheDocument()
    })

    it('should have correct background colors on buttons', () => {
      render(<ColorPicker {...defaultProps} />)

      const grayButton = screen.getByRole('button', { name: 'Gray' })
      expect(grayButton).toHaveStyle({ backgroundColor: '#E5E7EB' })

      const blueButton = screen.getByRole('button', { name: 'Blue' })
      expect(blueButton).toHaveStyle({ backgroundColor: '#DBEAFE' })
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
      render(<ColorPicker {...defaultProps} value="#DBEAFE" />)

      const blueButton = screen.getByRole('button', { name: 'Blue' })
      expect(blueButton).toHaveClass('ring-2')
      expect(blueButton).toHaveClass('ring-blue-500')
    })

    it('should have aria-pressed true for selected color', () => {
      render(<ColorPicker {...defaultProps} value="#D1FAE5" />)

      const greenButton = screen.getByRole('button', { name: 'Green' })
      expect(greenButton).toHaveAttribute('aria-pressed', 'true')
    })

    it('should have aria-pressed false for non-selected colors', () => {
      render(<ColorPicker {...defaultProps} value="#DBEAFE" />)

      const grayButton = screen.getByRole('button', { name: 'Gray' })
      expect(grayButton).toHaveAttribute('aria-pressed', 'false')

      const greenButton = screen.getByRole('button', { name: 'Green' })
      expect(greenButton).toHaveAttribute('aria-pressed', 'false')
    })

    it('should select correct color when value matches a preset', () => {
      render(<ColorPicker {...defaultProps} value="#FCE7F3" />)

      const pinkButton = screen.getByRole('button', { name: 'Pink' })
      expect(pinkButton).toHaveClass('ring-2')
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

      const blueButton = screen.getByRole('button', { name: 'Blue' })
      await userEvent.click(blueButton)

      expect(onChange).toHaveBeenCalledWith('#DBEAFE')
    })

    it('should call onChange with null when clicking selected color (deselect)', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} value="#DBEAFE" onChange={onChange} />)

      const blueButton = screen.getByRole('button', { name: 'Blue' })
      await userEvent.click(blueButton)

      expect(onChange).toHaveBeenCalledWith(null)
    })

    it('should call onChange with new color when clicking different color', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} value="#DBEAFE" onChange={onChange} />)

      const greenButton = screen.getByRole('button', { name: 'Green' })
      await userEvent.click(greenButton)

      expect(onChange).toHaveBeenCalledWith('#D1FAE5')
    })

    it('should call onChange exactly once per click', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} onChange={onChange} />)

      const yellowButton = screen.getByRole('button', { name: 'Yellow' })
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
      expect(buttons).toHaveLength(6)
    })

    it('should have aria-label for each color button', () => {
      render(<ColorPicker {...defaultProps} />)

      const colorNames = ['Gray', 'Blue', 'Green', 'Yellow', 'Purple', 'Pink']
      colorNames.forEach(name => {
        expect(screen.getByRole('button', { name })).toBeInTheDocument()
      })
    })

    it('should have aria-pressed attribute on all buttons', () => {
      render(<ColorPicker {...defaultProps} value="#E5E7EB" />)

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
      // #dbEaFe should match #DBEAFE
      render(<ColorPicker {...defaultProps} value="#dbEaFe" />)

      const blueButton = screen.getByRole('button', { name: 'Blue' })
      expect(blueButton).toHaveClass('ring-2')
    })

    it('should handle rapid clicks', async () => {
      const onChange = vi.fn()
      render(<ColorPicker {...defaultProps} onChange={onChange} />)

      const blueButton = screen.getByRole('button', { name: 'Blue' })

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