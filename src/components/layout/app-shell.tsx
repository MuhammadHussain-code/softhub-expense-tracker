import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '@/providers/store-provider'
import { Sidebar } from './sidebar'
import { TopBar } from './top-bar'
import { MobileNav } from './mobile-nav'
import { TransactionDialog } from '@/components/transactions/transaction-dialog'
import { Loader2 } from 'lucide-react'

export function AppShell() {
  const { isLoading, stores } = useStore()
  const navigate = useNavigate()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  // Show loading state while fetching stores
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Redirect to store creation if no stores exist
  if (stores.length === 0) {
    navigate('/stores/new', { replace: true })
    return null
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        <TopBar />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 pb-20 lg:p-6 lg:pb-6">
          <Outlet />
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileNav onAddClick={() => setIsAddDialogOpen(true)} />
      </div>

      {/* Add Transaction Dialog */}
      <TransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  )
}
