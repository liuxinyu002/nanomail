import { useState, useRef, useEffect, useCallback } from 'react'
import { MoreHorizontal } from 'lucide-react'
import type { BoardColumn } from '@nanomail/shared'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ColorPicker } from './ColorPicker'

export interface ColumnHeaderProps {
  /** The column to display */
  column: BoardColumn
  /** Number of items in the column */
  itemCount: number
  /** Callback when column is renamed */
  onRename: (name: string) => void
  /** Callback when column color changes */
  onColorChange: (color: string | null) => void
  /** Callback when column is deleted */
  onDelete: () => void
  /** Whether the column name is being edited (controlled) */
  isEditing?: boolean
  /** Callback when editing starts */
  onStartEdit?: () => void
  /** Callback when editing ends */
  onEndEdit?: () => void
}

const VALID_HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/

function isValidHexColor(color: string | null | undefined): boolean {
  if (!color) return false
  return VALID_HEX_COLOR_REGEX.test(color)
}

function getSafeColor(color: string | null | undefined): string | undefined {
  if (!isValidHexColor(color)) return undefined
  return color ?? undefined
}

/**
 * ColumnHeader - A standalone header component for a Kanban board column
 *
 * Features:
 * - Displays column name with color indicator and item count
 * - Hover-reveal settings button
 * - Popover menu with Rename, Change Color, and Delete options
 * - Inline editing via double-click
 */
export function ColumnHeader({
  column,
  itemCount,
  onRename,
  onColorChange,
  onDelete,
  isEditing: isEditingExternal,
  onStartEdit,
  onEndEdit,
}: ColumnHeaderProps) {
  // Internal edit state (for uncontrolled mode)
  const [isEditingInternal, setIsEditingInternal] = useState(false)
  const [editValue, setEditValue] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Determine if we're in controlled or uncontrolled mode
  const isEditing = isEditingExternal ?? isEditingInternal
  const isControlled = isEditingExternal !== undefined

  const safeColor = getSafeColor(column.color)

  // Handle starting edit mode
  const handleStartEdit = useCallback(() => {
    setEditValue(column.name)
    if (isControlled) {
      onStartEdit?.()
    } else {
      setIsEditingInternal(true)
      onStartEdit?.()
    }
  }, [column.name, isControlled, onStartEdit])

  // Handle ending edit mode
  const handleEndEdit = useCallback(() => {
    if (isControlled) {
      onEndEdit?.()
    } else {
      setIsEditingInternal(false)
      onEndEdit?.()
    }
  }, [isControlled, onEndEdit])

  // Handle saving the rename
  const handleSave = useCallback(() => {
    const trimmedValue = editValue.trim()
    if (trimmedValue && trimmedValue !== column.name) {
      onRename(trimmedValue)
    }
    handleEndEdit()
  }, [editValue, column.name, onRename, handleEndEdit])

  // Handle canceling the edit
  const handleCancel = useCallback(() => {
    setEditValue(column.name)
    handleEndEdit()
  }, [column.name, handleEndEdit])

  // Auto-focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle key events in the input
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  // Handle input blur
  const handleBlur = () => {
    handleSave()
  }

  // Handle double-click on column name
  const handleDoubleClick = () => {
    handleStartEdit()
  }

  return (
    <div
      data-testid="column-header"
      className="p-3 border-b flex items-center justify-between group"
    >
      {/* Left side: color indicator and name */}
      <div className="flex items-center gap-2">
        {safeColor && (
          <div
            data-testid="column-color-indicator"
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: safeColor }}
          />
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="w-full px-1 py-0.5 text-sm font-medium border border-blue-500 rounded outline-none focus:ring-1 focus:ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3
            className="font-medium text-sm cursor-pointer"
            onDoubleClick={handleDoubleClick}
          >
            {column.name}
          </h3>
        )}
      </div>

      {/* Right side: count and settings */}
      <div className="flex items-center gap-2">
        <span
          className="text-sm text-gray-500"
          aria-label={`${itemCount} ${itemCount === 1 ? 'item' : 'items'}`}
        >
          {itemCount}
        </span>

        {/* Settings popover */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              aria-label="Column settings"
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-gray-200"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-500" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-48 p-1 shadow-md"
            align="end"
          >
            <div className="flex flex-col">
              <button
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                onClick={() => {
                  handleStartEdit()
                }}
              >
                Rename
              </button>
              <button
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100"
                onClick={() => {
                  setShowColorPicker(!showColorPicker)
                }}
              >
                Change Color
              </button>
              {showColorPicker && (
                <div className="px-3 py-2">
                  <ColorPicker
                    value={column.color}
                    onChange={(color) => {
                      onColorChange(color)
                      setShowColorPicker(false)
                    }}
                  />
                </div>
              )}
              <hr className="my-1 border-gray-200" data-testid="dropdown-menu-separator" />
              <button
                className="w-full text-left px-3 py-2 text-sm rounded hover:bg-red-50 text-red-600"
                onClick={() => setShowDeleteDialog(true)}
              >
                Delete
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{column.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              {itemCount === 1
                ? '1 task will be moved to Inbox.'
                : `${itemCount} tasks will be moved to Inbox.`}{' '}
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                setShowDeleteDialog(false)
                onDelete()
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}