import { useState, useRef, useEffect } from 'react'
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface CardDropdownMenuProps {
  onEdit?: () => void
  onDelete?: () => void
}

export function CardDropdownMenu({
  onEdit,
  onDelete,
}: CardDropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const menuItems: MenuItem[] = [
    { label: 'Edit', icon: <Edit className="w-4 h-4" />, onClick: () => onEdit?.() },
    { label: 'Delete', icon: <Trash2 className="w-4 h-4" />, onClick: () => onDelete?.(), danger: true },
  ]

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button */}
      <button
        ref={triggerRef}
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="p-1 rounded hover:bg-[#F7F8FA] transition-colors"
        aria-label="More options"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <MoreHorizontal className="w-4 h-4 text-[#6B7280]" />
      </button>

      {/* Menu */}
      {isOpen && (
        <div
          data-testid="card-dropdown-menu"
          role="menu"
          className={cn(
            "absolute right-0 top-full mt-1 z-50",
            "w-48 bg-white rounded-md shadow-lg",
            "animate-dropdown-in"
          )}
        >
          {menuItems.map((item) => (
            <button
              key={item.label}
              role="menuitem"
              onClick={(e) => {
                e.stopPropagation()
                item.onClick()
                setIsOpen(false)
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                item.danger
                  ? "text-red-600 hover:bg-red-50"
                  : "text-[#111827] hover:bg-[#F7F8FA]"
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}