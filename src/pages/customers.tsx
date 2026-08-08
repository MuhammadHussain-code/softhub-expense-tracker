import { useState } from 'react'
import { Plus, Search } from 'lucide-react'
import { useCustomers } from '@/hooks/use-customers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CustomerList } from '@/components/customers/customer-list'
import { CustomerDialog } from '@/components/customers/customer-dialog'
import { CustomersEmptyState } from '@/components/customers/empty-state'

export function Customers() {
  const [search, setSearch] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const { data: customers = [], isLoading } = useCustomers(search)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">
            Customer and job details — no payment information
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)} className="hidden lg:flex">
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name, model, phone, IMEI or CNIC…"
          className="pl-9"
        />
      </div>

      {/* List */}
      {!isLoading && customers.length === 0 ? (
        <CustomersEmptyState
          onAddClick={() => setIsAddDialogOpen(true)}
          hasSearch={search.trim().length > 0}
        />
      ) : (
        <CustomerList customers={customers} isLoading={isLoading} />
      )}

      {/* Add Dialog */}
      <CustomerDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen} />
    </div>
  )
}
