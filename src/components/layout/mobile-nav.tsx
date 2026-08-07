import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Plus, Settings, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  onAddClick: () => void
  /** Label describing what the centre button adds on the current page */
  addLabel: string
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex flex-col items-center gap-1 px-3 py-2 text-xs',
    isActive ? 'text-primary' : 'text-muted-foreground'
  )

export function MobileNav({ onAddClick, addLabel }: MobileNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex h-16 items-center justify-around">
        <NavLink to="/customers" className={navLinkClass}>
          <Users className="h-5 w-5" />
          <span>Customers</span>
        </NavLink>

        <NavLink to="/dashboard" className={navLinkClass}>
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </NavLink>

        <button
          onClick={onAddClick}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
          aria-label={addLabel}
        >
          <Plus className="h-6 w-6" />
        </button>

        <NavLink to="/settings" className={navLinkClass}>
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </NavLink>
      </div>
    </nav>
  )
}
