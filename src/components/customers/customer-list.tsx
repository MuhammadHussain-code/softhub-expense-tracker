import { useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  CloudOff,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import {
  useDeleteCustomer,
  useUpdateCustomer,
  useCustomerPhotoUrl,
} from '@/hooks/use-customers'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { CustomerDialog } from './customer-dialog'
import type { LocalCustomer } from '@/lib/offline-db'

interface CustomerListProps {
  customers: LocalCustomer[]
  isLoading: boolean
}

interface CustomerRowProps {
  customer: LocalCustomer
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex gap-2 text-sm">
      <span className="w-24 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{value}</span>
    </div>
  )
}

function CustomerRow({
  customer,
  isExpanded,
  onToggle,
  onEdit,
  onDelete,
  onToggleStatus,
}: CustomerRowProps) {
  const photoUrl = useCustomerPhotoUrl(customer)
  const isDelivered = customer.status === 'delivered'

  return (
    <div
      className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/50 cursor-pointer"
      onClick={onToggle}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={customer.customer_name}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <p className={cn('font-medium', !isExpanded && 'truncate')}>
              {customer.customer_name}
            </p>
            <p className={cn('text-sm text-muted-foreground', !isExpanded && 'truncate')}>
              {customer.work_name}
            </p>
            <p className="text-xs text-muted-foreground">{formatDate(customer.date)}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {customer.syncStatus && customer.syncStatus !== 'synced' && (
            <div
              className={cn(
                'flex h-5 w-5 items-center justify-center rounded-full',
                customer.syncStatus === 'pending'
                  ? 'bg-warning/10 text-warning'
                  : 'bg-destructive/10 text-destructive'
              )}
              title={customer.syncStatus === 'pending' ? 'Pending sync' : 'Sync failed'}
            >
              {customer.syncStatus === 'pending' ? (
                <CloudOff className="h-3 w-3" />
              ) : (
                <AlertCircle className="h-3 w-3" />
              )}
            </div>
          )}

          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-xs font-medium',
              isDelivered
                ? 'bg-success/10 text-success'
                : 'bg-warning/10 text-warning'
            )}
          >
            {isDelivered ? 'Delivered' : 'Pending'}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onToggleStatus}>
                {isDelivered ? (
                  <RotateCcw className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                {isDelivered ? 'Mark pending' : 'Mark delivered'}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-2 border-t pt-4">
          {photoUrl && (
            <img
              src={photoUrl}
              alt={customer.customer_name}
              className="mb-3 max-h-64 w-full rounded-md object-contain"
            />
          )}
          <DetailRow label="IMEI" value={customer.imei} />
          <DetailRow label="Phone" value={customer.phone} />
          <DetailRow label="CNIC" value={customer.cnic} />
          <DetailRow label="Address" value={customer.address} />
          <DetailRow label="Details" value={customer.notes} />
        </div>
      )}
    </div>
  )
}

export function CustomerList({ customers, isLoading }: CustomerListProps) {
  const deleteMutation = useDeleteCustomer()
  const updateMutation = useUpdateCustomer()
  const [editingCustomer, setEditingCustomer] = useState<LocalCustomer | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const handleDelete = async () => {
    if (!deletingId) return
    try {
      await deleteMutation.mutateAsync(deletingId)
      toast.success('Customer deleted successfully!')
    } catch {
      toast.error('Failed to delete customer. Please try again.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleStatus = async (customer: LocalCustomer) => {
    try {
      await updateMutation.mutateAsync({
        id: customer.id,
        customer_name: customer.customer_name,
        work_name: customer.work_name,
        imei: customer.imei,
        phone: customer.phone,
        cnic: customer.cnic,
        address: customer.address,
        notes: customer.notes,
        date: customer.date,
        status: customer.status === 'delivered' ? 'pending' : 'delivered',
      })
      toast.success('Status updated!')
    } catch {
      toast.error('Failed to update status. Please try again.')
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border p-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {customers.map((customer) => (
          <CustomerRow
            key={customer.id}
            customer={customer}
            isExpanded={expandedId === customer.id}
            onToggle={() => setExpandedId(expandedId === customer.id ? null : customer.id)}
            onEdit={() => setEditingCustomer(customer)}
            onDelete={() => setDeletingId(customer.id)}
            onToggleStatus={() => handleToggleStatus(customer)}
          />
        ))}
        <div className="h-24 invisible" />
      </div>

      {/* Edit Dialog */}
      <CustomerDialog
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
        customer={editingCustomer ?? undefined}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this customer record and its photo? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
