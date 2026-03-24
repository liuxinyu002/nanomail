import { cn } from '@/lib/utils'

interface CoffeeIconProps {
  className?: string
}

export function CoffeeIcon({ className }: CoffeeIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('h-4 w-4', className)}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1"/>
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/>
      <path d="M6 2v2"/>
      <path d="M10 2v2"/>
      <path d="M14 2v2"/>
      <circle cx="8" cy="13" r="1.2" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="13" r="1.2" fill="currentColor" stroke="none"/>
      <path d="M8 16c1 1.5 3 1.5 4 0"/>
    </svg>
  )
}