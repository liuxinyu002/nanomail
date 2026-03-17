import { useState } from 'react'
import { format } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useUpdateTodoMutation } from '@/hooks/useTodoMutations'
import type { TodoItem } from '@/services'

const MIN_DESCRIPTION_LENGTH = 1
const MAX_DESCRIPTION_LENGTH = 2000

export interface TodoEditFormProps {
  todo: TodoItem
  onCancel: () => void
}

export function TodoEditForm({ todo, onCancel }: TodoEditFormProps) {
  const [description, setDescription] = useState(todo.description)
  const [deadline, setDeadline] = useState<Date | null>(
    todo.deadline ? new Date(todo.deadline) : null
  )
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useUpdateTodoMutation()

  const handleSave = () => {
    const trimmedDescription = description.trim()
    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      setValidationError('Description cannot be empty')
      return
    }

    setValidationError(null)
    updateMutation.mutate({
      id: todo.id,
      data: {
        description: trimmedDescription.slice(0, MAX_DESCRIPTION_LENGTH),
        deadline: deadline?.toISOString() || null,
      },
    })
    onCancel()
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    if (validationError && value.trim().length >= MIN_DESCRIPTION_LENGTH) {
      setValidationError(null)
    }
  }

  const isValid = description.trim().length >= MIN_DESCRIPTION_LENGTH
  const isPending = updateMutation.isPending

  return (
    <div className="space-y-4 p-4">
      <div>
        <Label htmlFor="description" className="text-sm font-medium">
          Description
        </Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          className="w-full mt-1"
          rows={3}
        />
        {validationError && (
          <p className="text-sm text-destructive mt-1">{validationError}</p>
        )}
      </div>

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
