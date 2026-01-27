import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransactionForm, type TransactionFormData } from './transaction-form'
import { useCreateTransaction, useUpdateTransaction } from '@/hooks/use-transactions'
import type { Transaction } from '@/types/database'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction?: Transaction
}

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
}: TransactionDialogProps) {
  const createMutation = useCreateTransaction()
  const updateMutation = useUpdateTransaction()

  const isEditing = !!transaction
  const isSubmitting = createMutation.isPending || updateMutation.isPending

  const handleSubmit = async (data: TransactionFormData) => {
    try {
      if (isEditing) {
        await updateMutation.mutateAsync({ ...data, id: transaction.id })
        toast.success('Entry updated successfully!')
      } else {
        await createMutation.mutateAsync(data)
        toast.success('Entry added successfully!')
      }
      onOpenChange(false)
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Entry' : 'Add Entry'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the details of this entry.'
              : 'Add a new work or expense entry.'}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          key={open ? (transaction?.id ?? 'new') : 'closed'}
          initialData={transaction}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
