import { Check, ChevronsUpDown, Plus, Store } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useStore } from '@/providers/store-provider'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'

export function StoreSwitcher() {
  const { stores, activeStore, setActiveStore, isLoading } = useStore()
  const navigate = useNavigate()

  if (isLoading) {
    return <Skeleton className="h-9 w-[180px]" />
  }

  if (!activeStore) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate('/stores/new')}
        className="w-full justify-start gap-2"
      >
        <Plus className="h-4 w-4" />
        Create Store
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between gap-2"
        >
          <div className="flex items-center gap-2 truncate">
            <Store className="h-4 w-4 shrink-0" />
            <span className="truncate">{activeStore.name}</span>
          </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
        <DropdownMenuLabel>Your Stores</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores.map((store) => (
          <DropdownMenuItem
            key={store.id}
            onClick={() => setActiveStore(store)}
            className="cursor-pointer"
          >
            <Store className="mr-2 h-4 w-4" />
            <span className="flex-1 truncate">{store.name}</span>
            {store.id === activeStore.id && (
              <Check className={cn('h-4 w-4')} />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate('/stores/new')}
          className="cursor-pointer"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create New Store
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
