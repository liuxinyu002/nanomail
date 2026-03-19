import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useUpdateTodoMutation } from '@/hooks/useTodoMutations'
import type { TodoItem } from '@/services'

const MIN_DESCRIPTION_LENGTH = 1
const MAX_DESCRIPTION_LENGTH = 2000

export interface TodoEditFormProps {
  todo: TodoItem
  onCancel: () => void
}

// Parse date value from ISO string (YYYY-MM-DD format for date input)
function getDateValue(isoString: string | null): string {
  if (!isoString) return ''
  const d = new Date(isoString)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function TodoEditForm({ todo, onCancel }: TodoEditFormProps) {
  const [description, setDescription] = useState(todo.description)
  const [deadlineValue, setDeadlineValue] = useState<string>(getDateValue(todo.deadline))
  const [validationError, setValidationError] = useState<string | null>(null)

  const updateMutation = useUpdateTodoMutation()

  const handleSave = () => {
    const trimmedDescription = description.trim()
    if (trimmedDescription.length < MIN_DESCRIPTION_LENGTH) {
      setValidationError('Description cannot be empty')
      return
    }

    setValidationError(null)
    // Convert date value (YYYY-MM-DD) to ISO string with end of day
    const deadlineIso = deadlineValue ? `${deadlineValue}T23:59:59.999Z` : null
    updateMutation.mutate({
      id: todo.id,
      data: {
        description: trimmedDescription.slice(0, MAX_DESCRIPTION_LENGTH),
        deadline: deadlineIso,
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
        <input
          id="deadline"
          type="date"
          value={deadlineValue}
          onChange={(e) => setDeadlineValue(e.target.value)}
          className="w-full mt-1 px-2 py-1.5 text-[13px] border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
          style={{ boxSizing: 'border-box' }}
        />
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
