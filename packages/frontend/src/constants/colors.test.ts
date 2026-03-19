import { describe, it, expect } from 'vitest'
import {
  MACARON_COLORS,
  type MacaronColor,
  MACARON_COLOR_OPTIONS,
} from './colors'

describe('colors constants', () => {
  describe('MACARON_COLORS', () => {
    it('should export MACARON_COLORS with 7 pastel colors', () => {
      expect(MACARON_COLORS).toHaveLength(7)
    })

    it('should have correct hex values for macaron palette', () => {
      expect(MACARON_COLORS).toEqual([
        '#FFB5BA', // Pastel Red
        '#FFD8A8', // Pastel Orange
        '#FFF4B8', // Pastel Yellow
        '#B8E6C1', // Pastel Green
        '#B8D4FF', // Pastel Blue
        '#D4B8FF', // Pastel Purple
        '#C9CDD4', // Pastel Gray
      ])
    })

    it('should be a const assertion (readonly tuple)', () => {
      // Type check: MACARON_COLORS should be readonly
      const colors: readonly ['#FFB5BA', '#FFD8A8', '#FFF4B8', '#B8E6C1', '#B8D4FF', '#D4B8FF', '#C9CDD4'] = MACARON_COLORS
      expect(colors).toBe(MACARON_COLORS)
    })
  })

  describe('MacaronColor type', () => {
    it('should allow valid macaron color hex values', () => {
      const red: MacaronColor = '#FFB5BA'
      const blue: MacaronColor = '#B8D4FF'
      expect([red, blue]).toHaveLength(2)
    })
  })

  describe('MACARON_COLOR_OPTIONS', () => {
    it('should export MACARON_COLOR_OPTIONS with 7 options', () => {
      expect(MACARON_COLOR_OPTIONS).toHaveLength(7)
    })

    it('should have name and hex for each option', () => {
      MACARON_COLOR_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('name')
        expect(option).toHaveProperty('hex')
        expect(typeof option.name).toBe('string')
        expect(typeof option.hex).toBe('string')
      })
    })

    it('should have descriptive names for accessibility', () => {
      const names = MACARON_COLOR_OPTIONS.map(opt => opt.name)
      expect(names).toEqual([
        'Pastel Red',
        'Pastel Orange',
        'Pastel Yellow',
        'Pastel Green',
        'Pastel Blue',
        'Pastel Purple',
        'Pastel Gray',
      ])
    })

    it('should have hex values matching MACARON_COLORS', () => {
      const hexValues = MACARON_COLOR_OPTIONS.map(opt => opt.hex)
      expect(hexValues).toEqual([...MACARON_COLORS])
    })
  })
})