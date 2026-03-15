import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailDetailErrorProps {
  onRetry: () => void
}

export function EmailDetailError({ onRetry }: EmailDetailErrorProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <AlertTriangle className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-gray-500 mb-4">Failed to load email</p>
      <Button variant="ghost" onClick={onRetry}>
        Retry
      </Button>
    </div>
  )
}