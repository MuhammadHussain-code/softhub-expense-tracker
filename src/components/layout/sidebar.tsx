import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Settings, LogOut, Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useNetwork } from '@/providers/network-provider'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { StoreSwitcher } from './store-switcher'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const { signOut, user } = useAuth()
  const { theme } = useTheme()
  const { isOnline, isSyncing, pendingCount, syncNow } = useNetwork()

  const logoSrc = theme === 'dark' ? '/light-logo.png' : '/dark-logo.png'

  return (
    <aside className="hidden w-64 flex-col border-r bg-card lg:flex">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <img 
          src={logoSrc} 
          alt="SoftHub Tracker" 
          className="h-8 w-8 object-contain"
        />
        <span className="font-semibold">SoftHub Tracker</span>
      </div>

      {/* Network Status */}
      <div className="px-4 pt-4">
        <div
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
            isOnline
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" />
              <span>Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" />
              <span>Offline</span>
            </>
          )}
        </div>
        
        {/* Sync Button */}
        {pendingCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={syncNow}
            disabled={!isOnline || isSyncing}
            className={cn(
              'mt-2 w-full gap-2',
              isSyncing && 'cursor-wait'
            )}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Syncing...</span>
              </>
            ) : isOnline ? (
              <>
                <Cloud className="h-4 w-4" />
                <span>Sync {pendingCount} pending</span>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4" />
                <span>{pendingCount} pending</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Store Switcher */}
      <div className="p-4">
        <StoreSwitcher />
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User Section */}
      <div className="border-t p-4">
        <div className="mb-2 truncate text-sm text-muted-foreground">
          {user?.email}
        </div>
        <div className="flex flex-col gap-1">
          <ThemeToggle showLabel className="w-full justify-start" />
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </aside>
  )
}
