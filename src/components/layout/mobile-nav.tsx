import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  onAddClick: () => void
}

export function MobileNav({ onAddClick }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex h-16 items-center justify-around">
        <NavLink
          to="/dashboard"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-4 py-2 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        <button
          onClick={onAddClick}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label="Add entry"
        >
          <Plus className="h-6 w-6" />
        </button>

        <NavLink
          to="/settings"
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 px-4 py-2 text-xs',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  )
}
