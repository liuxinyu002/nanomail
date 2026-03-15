import { useState } from 'react'
import { format, addMonths, subMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTodosByDateRange } from '@/hooks'
import { TodoCalendarGrid } from './TodoCalendarGrid'
import { TodoDayModal } from './TodoDayModal'
import type { TodoItem } from '@/services'

export interface TodoCalendarProps {
  onTodoClick?: (todo: TodoItem) => void
}

/**
 * TodoCalendar - Main calendar component for viewing todos by date
 *
 * Features:
 * - Month navigation (prev/next)
 * - 42-day calendar grid (6 weeks)
 * - Day detail modal
 */
export function TodoCalendar({ onTodoClick }: TodoCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [drawerTodos, setDrawerTodos] = useState<TodoItem[]>([])

  const { data, isLoading } = useTodosByDateRange(currentMonth)

  const handlePrevMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1))
  }

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1))
  }

  const handleDayClick = (date: Date, todos: TodoItem[]) => {
    setSelectedDate(date)
    setDrawerTodos(todos)
  }

  const handleDrawerClose = (open: boolean) => {
    if (!open) {
      setSelectedDate(null)
      setDrawerTodos([])
    }
  }

  return (
    <div data-testid="todo-calendar" className="flex flex-col h-full">
      {/* Month navigation */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <Button
          variant="ghost"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <TodoCalendarGrid
          currentMonth={currentMonth}
          todos={data?.todos || []}
          onDayClick={handleDayClick}
        />
      )}

      {/* Day detail modal */}
      <TodoDayModal
        open={!!selectedDate}
        onOpenChange={handleDrawerClose}
        date={selectedDate}
        todos={drawerTodos}
        onTodoClick={onTodoClick}
      />
    </div>
  )
}