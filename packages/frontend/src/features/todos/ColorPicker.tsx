import { cn } from '@/lib/utils'

/**
 * Preset colors for column backgrounds
 *
 * Each color has:
 * - name: Display name for accessibility
 * - hex: The actual color value (used for background)
 * - tailwind: Tailwind class for reference
 */
export const PRESET_COLORS = [
  { name: 'Gray', hex: '#E5E7EB', tailwind: 'bg-gray-200' },
  { name: 'Blue', hex: '#DBEAFE', tailwind: 'bg-blue-100' },
  { name: 'Green', hex: '#D1FAE5', tailwind: 'bg-green-100' },
  { name: 'Yellow', hex: '#FEF3C7', tailwind: 'bg-yellow-100' },
  { name: 'Purple', hex: '#EDE9FE', tailwind: 'bg-purple-100' },
  { name: 'Pink', hex: '#FCE7F3', tailwind: 'bg-pink-100' },
] as const

export type PresetColor = (typeof PRESET_COLORS)[number]

export interface ColorPickerProps {
  /** Currently selected color (hex value) or null for no selection */
  value: string | null
  /** Callback when a color is selected or deselected */
  onChange: (color: string | null) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * ColorPicker - A color picker component with preset colors
 *
 * Features:
 * - 6 preset colors displayed in a grid
 * - Click to select a color
 * - Click selected color to deselect (set to null)
 * - Visual feedback with ring effect on selected color
 * - Accessible with aria-labels and aria-pressed states
 */
export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  // Normalize hex for comparison (case-insensitive)
  const normalizedValue = value?.toUpperCase() ?? null

  const handleClick = (colorHex: string) => {
    // If clicking the selected color, deselect it
    if (normalizedValue === colorHex.toUpperCase()) {
      onChange(null)
    } else {
      onChange(colorHex)
    }
  }

  return (
    <div
      data-testid="color-picker"
      className={cn(
        'grid grid-cols-6 gap-2',
        className
      )}
    >
      {PRESET_COLORS.map((color) => {
        const isSelected = normalizedValue === color.hex.toUpperCase()

        return (
          <button
            key={color.hex}
            type="button"
            aria-label={color.name}
            aria-pressed={isSelected}
            onClick={() => handleClick(color.hex)}
            className={cn(
              'w-6 h-6 rounded-full cursor-pointer',
              'transition-transform hover:scale-110',
              'border border-gray-300',
              isSelected && 'ring-2 ring-blue-500'
            )}
            style={{ backgroundColor: color.hex }}
          />
        )
      })}
    </div>
  )
}