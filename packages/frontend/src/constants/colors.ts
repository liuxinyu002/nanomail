/**
 * Color constants for the application
 *
 * Contains macaron/pastel color palette used by ColorPicker component
 * and status indicators.
 */

/**
 * Macaron/Pastel color palette for UI elements
 * Lower saturation for softer, modern appearance
 * Used by ColorPicker component and status indicators
 */
export const MACARON_COLORS = [
  '#FFB5BA', // Pastel Red
  '#FFD8A8', // Pastel Orange
  '#FFF4B8', // Pastel Yellow
  '#B8E6C1', // Pastel Green
  '#B8D4FF', // Pastel Blue
  '#D4B8FF', // Pastel Purple
  '#C9CDD4', // Pastel Gray
] as const

export type MacaronColor = (typeof MACARON_COLORS)[number]

/**
 * Macaron color options with accessible names
 * Derived from MACARON_COLORS for use in ColorPicker
 */
export const MACARON_COLOR_OPTIONS = [
  { name: 'Pastel Red', hex: '#FFB5BA' },
  { name: 'Pastel Orange', hex: '#FFD8A8' },
  { name: 'Pastel Yellow', hex: '#FFF4B8' },
  { name: 'Pastel Green', hex: '#B8E6C1' },
  { name: 'Pastel Blue', hex: '#B8D4FF' },
  { name: 'Pastel Purple', hex: '#D4B8FF' },
  { name: 'Pastel Gray', hex: '#C9CDD4' },
] as const

export type MacaronColorOption = (typeof MACARON_COLOR_OPTIONS)[number]