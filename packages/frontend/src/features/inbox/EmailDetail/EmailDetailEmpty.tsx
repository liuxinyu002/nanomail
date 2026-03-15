import { Mail } from 'lucide-react'

interface EmailDetailEmptyProps {
  message?: string
}

export function EmailDetailEmpty({ message }: EmailDetailEmptyProps) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-8">
      <Mail className="h-12 w-12 text-gray-300 mb-4" />
      <p className="text-gray-400">
        {message || 'Select an email from the list'}
      </p>
    </div>
  )
}