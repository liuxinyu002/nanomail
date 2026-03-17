import { useState, useEffect } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui'
import { TodoService } from '@/services'
import type { TodoItem } from '@/services'
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { EmailClassification } from '@nanomail/shared'
import { DeadlineDisplay } from '@/components/DeadlineDisplay'
import { toast } from 'sonner'

export interface EmailDetailProps {
  email: {
    id: number
    subject: string | null
    sender: string | null
    snippet: string | null
    bodyText?: string | null
    date: Date
    isProcessed: boolean
    classification: EmailClassification
    summary?: string | null
  }
}

function getColumnName(boardColumnId: number): string {
  switch (boardColumnId) {
    case 1: return 'Inbox'
    case 2: return 'Todo'
    case 3: return 'In Progress'
    case 4: return 'Done'
    default: return 'Unknown'
  }
}

function getColumnColor(boardColumnId: number): string {
  switch (boardColumnId) {
    case 2:
      return 'text-red-500'
    case 3:
      return 'text-amber-500'
    case 1:
      return 'text-blue-500'
    case 4:
      return 'text-green-500'
    default:
      return 'text-muted-foreground'
  }
}

export function EmailDetail({ email }: EmailDetailProps) {
  const [expanded, setExpanded] = useState(false)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (expanded && email.isProcessed) {
      setLoading(true)
      TodoService.getTodos({ emailId: email.id })
        .then((response) => setTodos(response.todos))
        .catch((error) => {
          toast.error('Failed to fetch todos')
        })
        .finally(() => setLoading(false))
    }
  }, [expanded, email.id, email.isProcessed])

  if (!email.isProcessed) {
    return null
  }

  const handleToggleTodo = async (todo: TodoItem) => {
    const newStatus = todo.status === 'completed' ? 'pending' : 'completed'
    try {
      const updated = await TodoService.updateTodoStatus(todo.id, newStatus)
      setTodos((prev) =>
        prev.map((t) => (t.id === todo.id ? updated : t))
      )
    } catch (error) {
      toast.error('Failed to update todo')
    }
  }

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="mt-2">
          {expanded ? (
            <>
              <ChevronDown className="h-4 w-4 mr-1" />
              Hide Details
            </>
          ) : (
            <>
              <ChevronRight className="h-4 w-4 mr-1" />
              Show Details
            </>
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-4 space-y-4">
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-2">Summary</h4>
          <p className="text-sm">
            {email.summary || 'No summary available'}
          </p>
        </div>

        {loading ? (
          <div
            className="flex items-center justify-center py-4"
            data-testid="loading-todos"
          >
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : (
          todos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Action Items</h4>
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-start gap-3 p-2 rounded hover:bg-muted/50"
                >
                  <Checkbox
                    checked={todo.status === 'completed'}
                    onCheckedChange={() => handleToggleTodo(todo)}
                    aria-label={todo.description}
                  />
                  <div className="flex-1">
                    <p
                      className={cn(
                        'text-sm',
                        todo.status === 'completed' && 'line-through text-muted-foreground'
                      )}
                    >
                      {todo.description}
                    </p>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-xs font-medium',
                          getColumnColor(todo.boardColumnId)
                        )}
                      >
                        {getColumnName(todo.boardColumnId)}
                      </span>
                      <DeadlineDisplay deadline={todo.deadline} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
