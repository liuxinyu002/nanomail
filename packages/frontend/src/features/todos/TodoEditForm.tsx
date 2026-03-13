import { useState } from 'react'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUpdateTodoMutation } from '@/hooks/useTodoMutations'
import type { TodoItem, Urgency } from '@/services'

// Constants for validation
const MIN_DESCRIPTION_LENGTH = 1
const MAX_DESCRIPTION_LENGTH = 2000

export interface TodoEditFormProps {
  todo: TodoItem
  onCancel: () => void
}

/**
 * TodoEditForm - Form for editing a todo item
 *
 * Supports editing:
 * - Description (textarea)
 * - Priority/Urgency (select)
 * - Deadline (calendar popover)
 *
 * Uses optimistic updates via useUpdateTodoMutation
 */
export function TodoEditForm({ todo, onCancel }: TodoEditFormProps) {
  const [description, setDescription] = useState(todo.description)
  const [urgency, setUrgency] = useState<Urgency>(todo.urgency)
  const [deadline, setDeadline] = useState<Date | null>(
    todo.deadline ? new Date(todo.deadline) : null
  )

  const updateMutation = useUpdateTodoMutation()

  const handleSave = () => {
    // Validate description
    const trimmedDescription = description.trim()
    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      return // Don't save empty descriptions
    }

    updateMutation.mutate({
      id: todo.id,
      data: {
        description: trimmedDescription.slice(0, MAX_DESCRIPTION_LENGTH),
        urgency,
        deadline: deadline?.toISOString() || null,
      },
    })
    onCancel()
  }

  const isValid = description.trim().length >= MIN_DESCRIPTION_LENGTH
  const isPending = updateMutation.isPending

  return (
    <div className="space-y-4 p-4">
      {/* Description */}
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full mt-1"
          rows={3}
        />
      </div>

      {/* Priority */}
      <div>
        <Label htmlFor="priority" className="text-sm font-medium">
          Priority
        </Label>
        <Select value={urgency} onValueChange={(v) => setUrgency(v as Urgency)}>
          <SelectTrigger id="priority" className="mt-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deadline */}
      <div>
        <Label htmlFor="deadline" className="text-sm font-medium">
          Deadline
        </Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="deadline"
              variant="outline"
              className="w-full mt-1 justify-start text-left font-normal"
            >
              {deadline ? format(deadline, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              selected={deadline}
              onSelect={(date) => setDeadline(date)}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={!isValid || isPending}>
          {isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  )
}