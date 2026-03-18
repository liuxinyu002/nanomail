import { useState, useCallback } from 'react'
import { Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface NewListButtonProps {
  /** Callback fired when a new column is created */
  onCreateColumn: (name: string) => void
}

/**
 * NewListButton - A ghost button for creating new columns in the Kanban board
 *
 * Features:
 * - Fixed width (280px) to prevent layout shift when switching modes
 * - Ghost button style with dashed border
 * - Inline input for column name
 * - Enter to create, Escape to cancel
 * - Add button and Cancel button in editing mode
 */
export function NewListButton({ onCreateColumn }: NewListButtonProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState('')

  const handleCreate = useCallback(() => {
    const trimmedName = name.trim()
    if (trimmedName) {
      onCreateColumn(trimmedName)
      setName('')
      setIsEditing(false)
    }
  }, [name, onCreateColumn])

  const handleCancel = useCallback(() => {
    setName('')
    setIsEditing(false)
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCreate()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }, [handleCreate, handleCancel])

  if (isEditing) {
    return (
      <div
        data-testid="new-list-editing-container"
        className={cn(
          // Fixed width to prevent layout shift
          'w-[280px] flex-shrink-0',
          // Dashed border style
          'h-full border-2 border-dashed border-primary bg-background',
          // Layout
          'flex flex-col p-3 gap-2 rounded-lg'
        )}
      >
        <input
          autoFocus
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter list name..."
          className="w-full px-2 py-1 text-sm border rounded outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="flex gap-2">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-primary text-primary-foreground rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-2 py-1 text-xs border rounded hover:bg-gray-100"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        // Fixed width to prevent layout shift
        'w-[280px] flex-shrink-0',
        // Ghost Button styling
        'h-full border-2 border-dashed border-gray-300',
        'bg-transparent hover:bg-gray-50',
        'text-gray-500 hover:text-gray-700',
        // Layout
        'flex items-center justify-center gap-2',
        'rounded-lg transition-colors'
      )}
    >
      <Plus className="w-4 h-4" />
      <span>New List</span>
    </button>
  )
}