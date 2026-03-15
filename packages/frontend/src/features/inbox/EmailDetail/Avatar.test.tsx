import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Avatar } from './Avatar'

describe('Avatar', () => {
  describe('initial letter extraction', () => {
    it('displays first letter of sender name (uppercase)', () => {
      render(<Avatar name="John Doe" />)
      expect(screen.getByText('J')).toBeInTheDocument()
    })

    it('converts lowercase to uppercase', () => {
      render(<Avatar name="alice" />)
      expect(screen.getByText('A')).toBeInTheDocument()
    })

    it('handles single character names', () => {
      render(<Avatar name="X" />)
      expect(screen.getByText('X')).toBeInTheDocument()
    })
  })

  describe('null name handling', () => {
    it('shows "?" when name is null', () => {
      render(<Avatar name={null} />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })

    it('shows "?" when name is undefined', () => {
      render(<Avatar name={undefined as unknown as null} />)
      expect(screen.getByText('?')).toBeInTheDocument()
    })
  })

  describe('color consistency', () => {
    it('background color is consistent for same name', () => {
      const { container: container1 } = render(<Avatar name="Alice" />)
      const { container: container2 } = render(<Avatar name="Alice" />)

      const avatar1 = container1.firstChild as HTMLElement
      const avatar2 = container2.firstChild as HTMLElement

      // Both should have the same color class
      const colorClasses1 = avatar1.className.split(' ').filter(c => c.startsWith('bg-'))
      const colorClasses2 = avatar2.className.split(' ').filter(c => c.startsWith('bg-'))

      expect(colorClasses1).toEqual(colorClasses2)
    })

    it('different names can have different colors', () => {
      const { container: container1 } = render(<Avatar name="Alice" />)
      const { container: container2 } = render(<Avatar name="Bob" />)

      const avatar1 = container1.firstChild as HTMLElement
      const avatar2 = container2.firstChild as HTMLElement

      // Extract color classes
      const colorClasses1 = avatar1.className.split(' ').filter(c => c.startsWith('bg-'))
      const colorClasses2 = avatar2.className.split(' ').filter(c => c.startsWith('bg-'))

      // They might be the same or different, but should be valid colors
      expect(colorClasses1.length).toBeGreaterThan(0)
      expect(colorClasses2.length).toBeGreaterThan(0)
    })
  })

  describe('size variants', () => {
    it('applies small size classes', () => {
      const { container } = render(<Avatar name="Test" size="sm" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('h-8')
      expect(avatar.className).toContain('w-8')
      expect(avatar.className).toContain('text-sm')
    })

    it('applies medium size classes (default)', () => {
      const { container } = render(<Avatar name="Test" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('h-10')
      expect(avatar.className).toContain('w-10')
      expect(avatar.className).toContain('text-base')
    })

    it('applies large size classes', () => {
      const { container } = render(<Avatar name="Test" size="lg" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('h-12')
      expect(avatar.className).toContain('w-12')
      expect(avatar.className).toContain('text-lg')
    })
  })

  describe('styling', () => {
    it('has rounded-full class', () => {
      const { container } = render(<Avatar name="Test" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('rounded-full')
    })

    it('has flex and centering classes', () => {
      const { container } = render(<Avatar name="Test" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('flex')
      expect(avatar.className).toContain('items-center')
      expect(avatar.className).toContain('justify-center')
    })

    it('has white text color', () => {
      const { container } = render(<Avatar name="Test" />)
      const avatar = container.firstChild as HTMLElement
      expect(avatar.className).toContain('text-white')
    })
  })
})