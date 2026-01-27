import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Store } from 'lucide-react'
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const storeSchema = z.object({
  name: z.string().min(1, 'Store name is required').max(100),
  currency: z.string().min(1).max(10),
})

type StoreFormData = z.infer<typeof storeSchema>

export function NewStore() {
  const { user } = useAuth()
  const { refetchStores, setActiveStore } = useStore()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
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

      navigate('/dashboard')
    } catch (error) {
      toast.error('Failed to create store. Please try again.')
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <Store className="h-6 w-6 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">Create Your Store</CardTitle>
          <CardDescription>
            Set up your store to start tracking income and expenses.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
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
              <p className="text-xs text-muted-foreground">
                This will be displayed next to amounts (e.g., Rs 1,000)
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Store
            </Button>
          </CardContent>
        </form>
      </Card>
    </div>
  )
}
