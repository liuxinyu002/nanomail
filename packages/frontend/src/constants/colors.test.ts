import { describe, it, expect } from 'vitest'
import {
  MACARON_COLORS,
  type MacaronColor,
  BRAND_COLORS,
  MACARON_COLOR_OPTIONS,
  BOARD_COLUMN_COLORS,
  getColumnColorById,
  COLUMN_ID_TO_TAILWIND,
} from './colors'

describe('colors constants', () => {
  describe('MACARON_COLORS', () => {
    it('should export MACARON_COLORS with 6 pastel colors', () => {
      expect(MACARON_COLORS).toHaveLength(6)
    })

    it('should have correct hex values for macaron palette', () => {
      expect(MACARON_COLORS).toEqual([
        '#FFB5BA', // Pastel Red
        '#FFD8A8', // Pastel Orange
        '#FFF4B8', // Pastel Yellow
        '#B8E6C1', // Pastel Green
        '#B8D4FF', // Pastel Blue
        '#D4B8FF', // Pastel Purple
      ])
    })

    it('should be a const assertion (readonly tuple)', () => {
      // Type check: MACARON_COLORS should be readonly
      const colors: readonly ['#FFB5BA', '#FFD8A8', '#FFF4B8', '#B8E6C1', '#B8D4FF', '#D4B8FF'] = MACARON_COLORS
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

  describe('BRAND_COLORS', () => {
    it('should export BRAND_COLORS with 4 properties', () => {
      expect(BRAND_COLORS).toHaveProperty('vibrantBlue')
      expect(BRAND_COLORS).toHaveProperty('textPrimary')
      expect(BRAND_COLORS).toHaveProperty('textSecondary')
      expect(BRAND_COLORS).toHaveProperty('background')
    })

    it('should have correct hex values for brand colors', () => {
      expect(BRAND_COLORS.vibrantBlue).toBe('#2563EB')
      expect(BRAND_COLORS.textPrimary).toBe('#111827')
      expect(BRAND_COLORS.textSecondary).toBe('#6B7280')
      expect(BRAND_COLORS.background).toBe('#F7F8FA')
    })

    it('should be a const assertion', () => {
      expect(typeof BRAND_COLORS.vibrantBlue).toBe('string')
      expect(typeof BRAND_COLORS.textPrimary).toBe('string')
      expect(typeof BRAND_COLORS.textSecondary).toBe('string')
      expect(typeof BRAND_COLORS.background).toBe('string')
    })
  })

  describe('MACARON_COLOR_OPTIONS', () => {
    it('should export MACARON_COLOR_OPTIONS with 6 options', () => {
      expect(MACARON_COLOR_OPTIONS).toHaveLength(6)
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
      ])
    })

    it('should have hex values matching MACARON_COLORS', () => {
      const hexValues = MACARON_COLOR_OPTIONS.map(opt => opt.hex)
      expect(hexValues).toEqual([...MACARON_COLORS])
    })
  })

  describe('Existing exports (should remain unchanged)', () => {
    it('should still export BOARD_COLUMN_COLORS', () => {
      expect(BOARD_COLUMN_COLORS).toBeDefined()
      expect(BOARD_COLUMN_COLORS.inbox).toBeDefined()
      expect(BOARD_COLUMN_COLORS.todo).toBeDefined()
      expect(BOARD_COLUMN_COLORS.inProgress).toBeDefined()
      expect(BOARD_COLUMN_COLORS.done).toBeDefined()
    })

    it('should still export getColumnColorById', () => {
      expect(getColumnColorById).toBeDefined()
      expect(typeof getColumnColorById).toBe('function')
    })

    it('should still export COLUMN_ID_TO_TAILWIND', () => {
      expect(COLUMN_ID_TO_TAILWIND).toBeDefined()
      expect(COLUMN_ID_TO_TAILWIND[1]).toBe('bg-gray-500')
      expect(COLUMN_ID_TO_TAILWIND[2]).toBe('bg-blue-500')
    })
  })
})