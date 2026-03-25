import { Mail } from 'lucide-react'
import { Button } from './ui/button'

export interface NewEmailsPillProps {
  count: number
  onClick: () => void
}

export function NewEmailsPill({ count, onClick }: NewEmailsPillProps) {
  return (
    <div
      data-testid="new-emails-pill"
      className="absolute top-2 left-1/2 -translate-x-1/2 z-10"
    >
      <Button
        variant="secondary"
        size="sm"
        onClick={onClick}
        className="rounded-full shadow-lg bg-primary text-primary-foreground hover:bg-primary/90 animate-bounce-subtle"
      >
        <Mail className="h-4 w-4 mr-2" />
        {count} new email{count !== 1 ? 's' : ''}
      </Button>
    </div>
  )
}
