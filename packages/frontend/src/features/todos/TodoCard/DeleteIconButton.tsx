import { useState } from 'react'
import { Trash2 } from 'lucide-react'
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
import { cn } from '@/lib/utils'

interface DeleteIconButtonProps {
  /** Callback when delete is confirmed */
  onDelete?: () => void
}

/**
 * DeleteIconButton - A delete button with confirmation dialog
 *
 * Features:
 * - Trash2 icon from lucide-react
 * - Gray default color, red on hover
 * - AlertDialog confirmation before delete
 * - Stops propagation to prevent card expansion
 */
export function DeleteIconButton({ onDelete }: DeleteIconButtonProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleConfirmDelete = () => {
    setShowDeleteDialog(false)
    onDelete?.()
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setShowDeleteDialog(true)
        }}
        className={cn(
          'p-1 rounded transition-colors',
          'text-[#6B7280]',
          'hover:text-red-500 hover:bg-red-50'
        )}
        aria-label="Delete"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={handleConfirmDelete}
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}