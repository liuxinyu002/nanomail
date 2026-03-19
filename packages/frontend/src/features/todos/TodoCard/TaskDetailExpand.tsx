import { useState, useRef, useEffect, useId } from 'react'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

const MAX_TEXT_LENGTH = 2000

interface TaskDetailExpandProps {
  description: string
  notes: string | null
  deadline: string | null
  isExpanded: boolean
  readonly?: boolean
  onSaveDescription: (value: string) => void
  onSaveNotes: (value: string | null) => void
  onSaveDeadline: (value: string | null) => void
}

/**
 * Expandable detail area for Todo cards
 * Shows description, notes, and deadline fields
 * Supports editable mode (Inbox/Board) and readonly mode (Planner)
 */
export function TaskDetailExpand({
  description,
  notes,
  deadline,
  isExpanded,
  readonly = false,
  onSaveDescription,
  onSaveNotes,
  onSaveDeadline,
}: TaskDetailExpandProps) {
  // Generate unique IDs for form elements
  const descriptionId = useId()
  const notesId = useId()
  const deadlineId = useId()

  // Local state for controlled inputs
  const [localDescription, setLocalDescription] = useState(description)
  const [localNotes, setLocalNotes] = useState(notes ?? '')
  const [isSaving, setIsSaving] = useState(false)

  // Refs for tracking initial values (for change detection)
  const descriptionRef = useRef(description)
  const notesRef = useRef(notes)

  // Sync local state when props change
  useEffect(() => {
    setLocalDescription(description)
    descriptionRef.current = description
  }, [description])

  useEffect(() => {
    setLocalNotes(notes ?? '')
    notesRef.current = notes
  }, [notes])

  // Save handlers with change detection
  const handleDescriptionBlur = async () => {
    if (localDescription !== descriptionRef.current) {
      setIsSaving(true)
      try {
        await onSaveDescription(localDescription)
        descriptionRef.current = localDescription
      } catch (error) {
        // Revert on error
        setLocalDescription(descriptionRef.current)
        console.error('Failed to save description:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleNotesBlur = async () => {
    const newNotes = localNotes.trim() || null
    if (newNotes !== notesRef.current) {
      setIsSaving(true)
      try {
        await onSaveNotes(newNotes)
        notesRef.current = newNotes
      } catch (error) {
        setLocalNotes(notesRef.current ?? '')
        console.error('Failed to save notes:', error)
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleDeadlineChange = async (value: string | null) => {
    setIsSaving(true)
    try {
      await onSaveDeadline(value)
    } catch (error) {
      console.error('Failed to save deadline:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // Format deadline for display
  const formatDeadline = (deadlineStr: string): string => {
    const d = new Date(deadlineStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Read-only rendering
  if (readonly) {
    return (
      <div
        data-testid="task-detail-expand"
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          isExpanded ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="pt-3 mt-3 border-t border-[#E5E7EB] bg-[#F7F8FA]/50 -mx-4 px-4 pb-2 space-y-3">
            {description && (
              <div>
                <label className="text-xs text-[#6B7280] uppercase tracking-wide">描述</label>
                <p className="text-sm text-[#111827] mt-1 whitespace-pre-wrap">{description}</p>
              </div>
            )}
            {notes && (
              <div>
                <label className="text-xs text-[#6B7280] uppercase tracking-wide">笔记</label>
                <p className="text-sm text-[#111827] mt-1 whitespace-pre-wrap">{notes}</p>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-2 text-sm text-[#6B7280]">
                <Calendar className="w-4 h-4" />
                <span>{formatDeadline(deadline)}</span>
              </div>
            )}
            {!description && !notes && !deadline && (
              <p className="text-sm text-[#9CA3AF]">无详细信息</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Editable rendering
  return (
    <div
      data-testid="task-detail-expand"
      className={cn(
        'grid transition-[grid-template-rows] duration-300 ease-out',
        isExpanded ? '[grid-template-rows:1fr]' : '[grid-template-rows:0fr]'
      )}
    >
      <div className="overflow-hidden">
        <div className="pt-3 mt-3 border-t border-[#E5E7EB] bg-[#F7F8FA]/50 -mx-4 px-4 pb-2 space-y-3">
          {/* Description */}
          <div>
            <label htmlFor={descriptionId} className="text-xs text-[#6B7280] uppercase tracking-wide">描述</label>
            <textarea
              id={descriptionId}
              value={localDescription}
              onChange={(e) => {
                setLocalDescription(e.target.value)
                // Auto-resize: reset to auto first to get accurate scrollHeight
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onBlur={handleDescriptionBlur}
              placeholder="添加描述..."
              rows={2}
              maxLength={MAX_TEXT_LENGTH}
              className={cn(
                'w-full mt-1 text-sm text-[#111827] resize-y',
                'bg-transparent border-none outline-none',
                'placeholder:text-[#9CA3AF]',
                'focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:rounded px-1 -mx-1',
                'min-h-[2.5rem] max-h-[12rem] overflow-y-auto'
              )}
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor={notesId} className="text-xs text-[#6B7280] uppercase tracking-wide">笔记</label>
            <textarea
              id={notesId}
              value={localNotes}
              onChange={(e) => {
                setLocalNotes(e.target.value)
                // Auto-resize: reset to auto first to get accurate scrollHeight
                e.target.style.height = 'auto'
                e.target.style.height = e.target.scrollHeight + 'px'
              }}
              onBlur={handleNotesBlur}
              placeholder="添加笔记..."
              rows={3}
              maxLength={MAX_TEXT_LENGTH}
              className={cn(
                'w-full mt-1 text-sm text-[#111827] resize-y',
                'bg-transparent border-none outline-none',
                'placeholder:text-[#9CA3AF]',
                'focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:rounded px-1 -mx-1',
                'min-h-[3.75rem] max-h-[12rem] overflow-y-auto'
              )}
            />
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor={deadlineId} className="text-xs text-[#6B7280] uppercase tracking-wide">截止时间</label>
            <div className="flex items-center gap-2 mt-1">
              <Calendar className="w-4 h-4 text-[#6B7280]" />
              <input
                id={deadlineId}
                type="date"
                value={deadline ? deadline.split('T')[0] : ''}
                onChange={(e) => {
                  const value = e.target.value
                  handleDeadlineChange(value ? `${value}T23:59:59.999Z` : null)
                }}
                className={cn(
                  'text-sm text-[#111827]',
                  'bg-transparent border-none outline-none',
                  'focus:bg-white focus:ring-1 focus:ring-[#2563EB] focus:rounded px-1'
                )}
              />
              {deadline && (
                <button
                  type="button"
                  onClick={() => handleDeadlineChange(null)}
                  className="text-xs text-[#6B7280] hover:text-[#EF4444]"
                >
                  清除
                </button>
              )}
            </div>
          </div>

          {/* Saving indicator */}
          {isSaving && (
            <div className="text-xs text-[#9CA3AF]">保存中...</div>
          )}
        </div>
      </div>
    </div>
  )
}