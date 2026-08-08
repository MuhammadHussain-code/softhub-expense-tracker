import { Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomersEmptyStateProps {
  onAddClick: () => void
  hasSearch: boolean
}

export function CustomersEmptyState({ onAddClick, hasSearch }: CustomersEmptyStateProps) {
  if (hasSearch) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Users className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mb-2 text-lg font-medium">No matching customer</h3>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nothing matched that name, model, phone, IMEI or CNIC.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Users className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-medium">No customers yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Record who the customer is and what work came in — no payment details here.
      </p>
      <Button onClick={onAddClick}>
        <Plus className="mr-2 h-4 w-4" />
        Add Customer
      </Button>
    </div>
  )
}
