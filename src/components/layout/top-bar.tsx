import { LogOut, User, Sun, Moon, Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { useNetwork } from '@/providers/network-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { StoreSwitcher } from './store-switcher'
import { cn } from '@/lib/utils'

export function TopBar() {
  const { user, signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { isOnline, isSyncing, pendingCount, syncNow } = useNetwork()

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : 'U'

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:hidden">
      {/* Mobile: Store Switcher */}
      <div className="flex items-center gap-2">
        <StoreSwitcher />
      </div>

      {/* Network Status & Sync */}
      <div className="flex items-center gap-2">
        {/* Network Status Indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium',
            isOnline
              ? 'bg-success/10 text-success'
              : 'bg-destructive/10 text-destructive'
          )}
        >
          {isOnline ? (
            <Wifi className="h-3 w-3" />
          ) : (
            <WifiOff className="h-3 w-3" />
          )}
          <span className="hidden sm:inline">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Sync Status / Button */}
        {pendingCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={syncNow}
            disabled={!isOnline || isSyncing}
            className={cn(
              'gap-1.5 text-xs',
              isSyncing && 'cursor-wait'
            )}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Syncing...</span>
              </>
            ) : isOnline ? (
              <>
                <Cloud className="h-3 w-3" />
                <span>{pendingCount} pending</span>
              </>
            ) : (
              <>
                <CloudOff className="h-3 w-3" />
                <span>{pendingCount} pending</span>
              </>
            )}
          </Button>
        )}

      </div>

      {/* User Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">Account</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={toggleTheme}>
            {theme === 'dark' ? (
              <>
                <Sun className="mr-2 h-4 w-4" />
                Light Mode
              </>
            ) : (
              <>
                <Moon className="mr-2 h-4 w-4" />
                Dark Mode
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => signOut()}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  )
}
