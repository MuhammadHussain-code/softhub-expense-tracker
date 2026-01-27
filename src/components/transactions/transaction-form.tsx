import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Transaction } from '@/types/database'
import type { TransactionType } from '@/lib/constants'

const transactionSchema = z.object({
  type: z.enum(['work', 'expense']),
  description: z.string().min(1, 'Description is required').max(500),
  amount: z.preprocess(
    (val) => (val === '' ? undefined : Number(val)),
    z.number().positive('Amount must be greater than 0')
  ),
  date: z.string().min(1, 'Date is required'),
})

export type TransactionFormData = z.infer<typeof transactionSchema>

interface TransactionFormProps {
  initialData?: Transaction
  onSubmit: (data: TransactionFormData) => Promise<void>
  isSubmitting: boolean
}

export function TransactionForm({
  initialData,
  onSubmit,
  isSubmitting,
}: TransactionFormProps) {
  const today = new Date().toISOString().split('T')[0] ?? ''
  
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: initialData?.type ?? 'work',
      description: initialData?.description ?? '',
      amount: initialData?.amount ?? ('' as unknown as number),
      date: initialData?.date ?? today,
    },
  })

  const currentType = watch('type')

  // Reset form when initialData changes
  useEffect(() => {
    if (initialData) {
      reset({
        type: initialData.type,
        description: initialData.description,
        amount: initialData.amount,
        date: initialData.date,
      })
    } else {
      reset({
        type: 'work',
        description: '',
        amount: '' as unknown as number,
        date: today,
      })
    }
  }, [initialData, reset, today])

  const handleTypeChange = (value: string) => {
    setValue('type', value as TransactionType)
  }

  const handleFormSubmit = async (data: unknown) => {
    await onSubmit(data as TransactionFormData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <Tabs value={currentType} onValueChange={handleTypeChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="work">Work (Income)</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
        </TabsList>
        <TabsContent value="work" className="mt-4">
          <p className="text-sm text-muted-foreground">
            Record income from work, sales, or services.
          </p>
        </TabsContent>
        <TabsContent value="expense" className="mt-4">
          <p className="text-sm text-muted-foreground">
            Record business expenses and costs.
          </p>
        </TabsContent>
      </Tabs>

      <input type="hidden" {...register('type')} />

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder={
            currentType === 'work'
              ? 'e.g., Payment received for app development work'
              : 'e.g., Payment for internet bill'
          }
          rows={3}
          {...register('description')}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          id="amount"
          type="number"
          placeholder="0"
          min="0"
          step="0.01"
          {...register('amount')}
        />
        {errors.amount && (
          <p className="text-sm text-destructive">{errors.amount.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <Input id="date" type="date" {...register('date')} />
        {errors.date && (
          <p className="text-sm text-destructive">{errors.date.message}</p>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? 'Update Entry' : 'Save Entry'}
      </Button>
    </form>
  )
}
