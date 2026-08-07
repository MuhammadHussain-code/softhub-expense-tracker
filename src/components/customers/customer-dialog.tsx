import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CustomerForm, type CustomerFormSubmit } from './customer-form'
import { useCreateCustomer, useUpdateCustomer } from '@/hooks/use-customers'
import type { LocalCustomer } from '@/lib/offline-db'

interface CustomerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: LocalCustomer
}

export function CustomerDialog({ open, onOpenChange, customer }: CustomerDialogProps) {
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()

  const isEditing = !!customer
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (data: CustomerFormSubmit) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ ...data, id: customer.id })
        toast.success('Customer updated successfully!')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Customer added successfully!')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update this customer record.'
              : 'Record the customer and the work taken in.'}
          </DialogDescription>
        </DialogHeader>
        <CustomerForm
          key={open ? (customer?.id ?? 'new') : 'closed'}
          initialData={customer}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
