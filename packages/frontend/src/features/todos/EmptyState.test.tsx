import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { EmptyState, type EmptyStateVariant } from './EmptyState'

describe('EmptyState', () => {
  describe('Rendering', () => {
    it('should render the component', () => {
      render(<EmptyState />)
      expect(screen.getByTestId('empty-state')).toBeInTheDocument()
    })

    it('should render an SVG illustration', () => {
      render(<EmptyState />)
      expect(screen.getByTestId('empty-state-svg')).toBeInTheDocument()
    })

    it('should render the default message "No tasks yet"', () => {
      render(<EmptyState />)
      expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    })

    it('should render a custom message when provided', () => {
      render(<EmptyState message="Custom empty message" />)
      expect(screen.getByText('Custom empty message')).toBeInTheDocument()
    })
  })

  describe('Text Styling', () => {
    it('should use text-[#6B7280] color for the message', () => {
      render(<EmptyState />)
      const message = screen.getByText('No tasks yet')
      expect(message).toHaveClass('text-[#6B7280]')
    })

    it('should use text-sm size for the message', () => {
      render(<EmptyState />)
      const message = screen.getByText('No tasks yet')
      expect(message).toHaveClass('text-sm')
    })

    it('should center the text', () => {
      render(<EmptyState />)
      const message = screen.getByText('No tasks yet')
      expect(message).toHaveClass('text-center')
    })
  })

  describe('SVG Styling', () => {
    it('should have width and height classes for proper sizing', () => {
      render(<EmptyState />)
      const svg = screen.getByTestId('empty-state-svg')
      // Check that the SVG has appropriate sizing classes
      // SVG className is SVGAnimatedString, convert to string for matching
      const className = svg.getAttribute('class') || ''
      expect(className).toMatch(/w-\d+/)
      expect(className).toMatch(/h-\d+/)
    })

    it('should be vertically centered with proper layout', () => {
      render(<EmptyState />)
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('flex')
      expect(container).toHaveClass('flex-col')
      expect(container).toHaveClass('items-center')
      expect(container).toHaveClass('justify-center')
    })
  })

  describe('Macaron Colors', () => {
    it('should use macaron/pastel colors in SVG elements', () => {
      render(<EmptyState />)
      const svg = screen.getByTestId('empty-state-svg')

      // The SVG should contain elements with macaron colors
      // We check the SVG content for our defined macaron colors
      const svgContent = svg.innerHTML

      // Check for at least one of the MACARON_COLORS
      const macaronColors = ['#FFB5BA', '#FFD8A8', '#FFF4B8', '#B8E6C1', '#B8D4FF', '#D4B8FF']
      const hasMacaronColor = macaronColors.some(color =>
        svgContent.toLowerCase().includes(color.toLowerCase())
      )

      expect(hasMacaronColor).toBe(true)
    })

    it('should NOT use 3D-style gradients or shadows in SVG', () => {
      render(<EmptyState />)
      const svg = screen.getByTestId('empty-state-svg')
      const svgContent = svg.innerHTML.toLowerCase()

      // Should not contain typical 3D-style elements
      expect(svgContent).not.toContain('<filter')  // No filter effects
      expect(svgContent).not.toContain('dropshadow')
      expect(svgContent).not.toContain('gradient')  // No gradients for flat style
    })
  })

  describe('Variants', () => {
    it('should render default variant by default', () => {
      render(<EmptyState />)
      expect(screen.getByText('No tasks yet')).toBeInTheDocument()
    })

    it('should render completed variant with appropriate message', () => {
      render(<EmptyState variant="completed" />)
      expect(screen.getByText('All done!')).toBeInTheDocument()
    })

    it('should render archive variant with appropriate message', () => {
      render(<EmptyState variant="archive" />)
      expect(screen.getByText('No archived tasks')).toBeInTheDocument()
    })

    it('should allow custom message to override variant default', () => {
      render(<EmptyState variant="completed" message="Great work!" />)
      expect(screen.getByText('Great work!')).toBeInTheDocument()
      expect(screen.queryByText('All done!')).not.toBeInTheDocument()
    })

    it('should render different SVG for completed variant', () => {
      const { rerender } = render(<EmptyState variant="default" />)
      const defaultSvg = screen.getByTestId('empty-state-svg').innerHTML

      rerender(<EmptyState variant="completed" />)
      const completedSvg = screen.getByTestId('empty-state-svg').innerHTML

      // The SVGs should be different for different variants
      expect(completedSvg).not.toBe(defaultSvg)
    })

    it('should render different SVG for archive variant', () => {
      const { rerender } = render(<EmptyState variant="default" />)
      const defaultSvg = screen.getByTestId('empty-state-svg').innerHTML

      rerender(<EmptyState variant="archive" />)
      const archiveSvg = screen.getByTestId('empty-state-svg').innerHTML

      // The SVGs should be different for different variants
      expect(archiveSvg).not.toBe(defaultSvg)
    })
  })

  describe('Custom ClassName', () => {
    it('should apply custom className to container', () => {
      render(<EmptyState className="custom-class" />)
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('custom-class')
    })

    it('should merge custom className with default classes', () => {
      render(<EmptyState className="min-h-[160px] bg-white" />)
      const container = screen.getByTestId('empty-state')
      expect(container).toHaveClass('min-h-[160px]')
      expect(container).toHaveClass('bg-white')
      expect(container).toHaveClass('flex') // Still has default classes
    })
  })

  describe('Layout', () => {
    it('should have appropriate padding for spacing', () => {
      render(<EmptyState />)
      const container = screen.getByTestId('empty-state')
      // Should have vertical padding for spacing
      expect(container.className).toMatch(/py-\d+/)
    })

    it('should have margin between SVG and text', () => {
      render(<EmptyState />)
      const svg = screen.getByTestId('empty-state-svg')
      // SVG should have margin-bottom for spacing with text
      const className = svg.getAttribute('class') || ''
      expect(className).toMatch(/mb-\d+/)
    })
  })

  describe('Accessibility', () => {
    it('should have role="img" on SVG for screen readers', () => {
      render(<EmptyState />)
      const svg = screen.getByTestId('empty-state-svg')
      expect(svg).toHaveAttribute('role', 'img')
    })

    it('should have aria-label on SVG', () => {
      render(<EmptyState variant="default" />)
      const svg = screen.getByTestId('empty-state-svg')
      expect(svg).toHaveAttribute('aria-label')
    })

    it('should have descriptive aria-label for each variant', () => {
      const variants: EmptyStateVariant[] = ['default', 'completed', 'archive']

      variants.forEach(variant => {
        const { unmount } = render(<EmptyState variant={variant} />)
        const svg = screen.getByTestId('empty-state-svg')
        expect(svg).toHaveAttribute('aria-label')
        expect(svg.getAttribute('aria-label')?.length).toBeGreaterThan(0)
        unmount()
      })
    })
  })
})