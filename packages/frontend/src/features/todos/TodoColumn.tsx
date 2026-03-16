import { AlertCircle, Clock, MinusCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { TodoItem as TodoItemType } from '@/services'
import { TodoItem } from './TodoItem'

export interface TodoColumnProps {
  title: string
  todos: TodoItemType[]
  emptyMessage: string
  variant: 'high' | 'medium' | 'low' | 'completed'
  showLoadMore?: boolean
  onLoadMore?: () => void
  showDelete?: boolean
}

const variantConfig = {
  high: {
    icon: AlertCircle,
    iconColor: 'text-red-500',
  },
  medium: {
    icon: Clock,
    iconColor: 'text-amber-500',
  },
  low: {
    icon: MinusCircle,
    iconColor: 'text-blue-500',
  },
  completed: {
    icon: CheckCircle,
    iconColor: 'text-green-500',
  },
}

export function TodoColumn({
  title,
  todos,
  emptyMessage,
  variant,
  showLoadMore = false,
  onLoadMore,
  showDelete = false,
}: TodoColumnProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      data-testid="todo-column"
      className="bg-muted/50 rounded-lg p-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className={cn('h-5 w-5', config.iconColor)} />
        <h2 className="font-semibold">{title}</h2>
        <span className="ml-auto bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
          {todos.length}
        </span>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {emptyMessage}
          </p>
        ) : (
          todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              showDelete={showDelete}
            />
          ))
        )}
      </div>

      {showLoadMore && onLoadMore && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3"
          onClick={onLoadMore}
        >
          Load More
        </Button>
      )}
    </div>
  )
}