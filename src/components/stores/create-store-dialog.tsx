import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/database'
import { useAuth } from '@/providers/auth-provider'
import { useStore } from '@/providers/store-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100),
  currency: z.string().min(1).max(10),
})

type StoreFormData = z.infer<typeof storeSchema>

interface CreateStoreDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateStoreDialog({ open, onOpenChange }: CreateStoreDialogProps) {
  const { user } = useAuth()
  const { refetchStores, setActiveStore } = useStore()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(storeSchema),
    defaultValues: {
      name: '',
      currency: 'Rs',
    },
  })

  const onSubmit = async (formData: unknown) => {
    const data = formData as StoreFormData
    if (!user) return

    setIsSubmitting(true)
    try {
      const { data: newStore, error } = await supabase
        .from('stores')
        .insert({
          name: data.name,
          currency: data.currency,
          created_by: user.id,
        } as Database['public']['Tables']['stores']['Insert'])
        .select()
        .single()

      if (error) throw error

      toast.success('Store created successfully!')
      refetchStores()
      
      // Set the new store as active
      if (newStore) {
        setActiveStore(newStore as Database['public']['Tables']['stores']['Row'])
      }
      
      reset()
      onOpenChange(false)
      navigate('/dashboard')
    } catch (error) {
      toast.error('Failed to create store. Please try again.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Store</DialogTitle>
          <DialogDescription>
            Add a new store to track your income and expenses.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Store Name</Label>
              <Input
                id="name"
                placeholder="e.g., My Mobile Shop"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Currency Symbol</Label>
              <Input
                id="currency"
                placeholder="Rs"
                {...register('currency')}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">
                  {errors.currency.message}
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Store
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
