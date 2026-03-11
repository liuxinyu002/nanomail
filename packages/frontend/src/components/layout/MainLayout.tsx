import { useState } from 'react'
import { Outlet, NavLink } from 'react-router-dom'
import { Inbox, CheckSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItemProps {
  icon: React.ReactNode
  label: string
  path: string
  expanded: boolean
}

function NavItem({ icon, label, path, expanded }: NavItemProps) {
  return (
    <NavLink
      to={path}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive && 'bg-accent text-accent-foreground'
        )
      }
      aria-label={label}
    >
      {icon}
      {expanded && <span className="text-sm">{label}</span>}
    </NavLink>
  )
}

export function MainLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)

  return (
    <div className="flex h-screen bg-background">
      {/* Compact Sidebar - collapsed by default, hover to expand */}
      <aside
        role="navigation"
        aria-label="Sidebar"
        className={cn(
          'transition-all duration-300 ease-in-out border-r border-border/50',
          sidebarExpanded ? 'w-56' : 'w-16'
        )}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo / App Name */}
        <div className="p-4">
          <h1
            className={cn(
              'text-xl font-bold transition-opacity',
              sidebarExpanded ? 'opacity-100' : 'opacity-0'
            )}
          >
            NanoMail
          </h1>
          {!sidebarExpanded && (
            <span className="text-lg font-bold">NM</span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-2">
          <NavItem
            icon={<Inbox className="h-5 w-5" />}
            label="Inbox"
            path="/inbox"
            expanded={sidebarExpanded}
          />
          <NavItem
            icon={<CheckSquare className="h-5 w-5" />}
            label="To-Do"
            path="/todos"
            expanded={sidebarExpanded}
          />
          <NavItem
            icon={<Settings className="h-5 w-5" />}
            label="Settings"
            path="/settings"
            expanded={sidebarExpanded}
          />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}