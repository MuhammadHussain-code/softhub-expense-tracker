import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DateInput } from '@/components/ui/date-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CustomerPhotoInput } from './customer-photo-input'
import { useCustomerPhotoUrl, type PhotoChange } from '@/hooks/use-customers'
import type { LocalCustomer } from '@/lib/offline-db'
import type { CustomerStatus } from '@/types/database'

// Digits only, ignoring spaces and dashes people type out of habit
const digitsOf = (value: string) => value.replace(/[\s-]/g, '')

const IMEI_LENGTH = 15
const PHONE_MAX_DIGITS = 11

const customerSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').max(120),
  work_name: z.string().min(1, 'Work name is required').max(200),
  imei: z
    .string()
    .max(IMEI_LENGTH, `IMEI cannot be longer than ${IMEI_LENGTH} digits`)
    .refine(
      (value) => value === '' || /^\d+$/.test(digitsOf(value)),
      'IMEI can only contain numbers'
    )
    .refine(
      (value) => value === '' || digitsOf(value).length === IMEI_LENGTH,
      `IMEI must be exactly ${IMEI_LENGTH} digits`
    ),
  phone: z
    .string()
    .max(PHONE_MAX_DIGITS, `Phone number cannot be longer than ${PHONE_MAX_DIGITS} digits`)
    .refine(
      (value) => value === '' || /^\d+$/.test(digitsOf(value)),
      'Phone number can only contain numbers'
    ),
  cnic: z.string().max(20),
  address: z.string().max(300),
  notes: z.string().max(1000),
  status: z.enum(['pending', 'delivered']),
  date: z.string().min(1, 'Date is required'),
})

export type CustomerFormData = z.infer<typeof customerSchema>

export interface CustomerFormSubmit extends CustomerFormData {
  photo: PhotoChange
}

interface CustomerFormProps {
  initialData?: LocalCustomer
  onSubmit: (data: CustomerFormSubmit) => Promise<void>
  isSubmitting: boolean
}

export function CustomerForm({ initialData, onSubmit, isSubmitting }: CustomerFormProps) {
  const today = new Date().toISOString().split('T')[0] ?? ''
  const savedPhotoUrl = useCustomerPhotoUrl(initialData)
  const [photo, setPhoto] = useState<PhotoChange>(undefined)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      customer_name: initialData?.customer_name ?? '',
      work_name: initialData?.work_name ?? '',
      imei: initialData?.imei ?? '',
      phone: initialData?.phone ?? '',
      cnic: initialData?.cnic ?? '',
      address: initialData?.address ?? '',
      notes: initialData?.notes ?? '',
      status: initialData?.status ?? 'pending',
      date: initialData?.date ?? today,
    },
  })

  const date = watch('date')
  const status = watch('status')

  const handleFormSubmit = async (data: unknown) => {
    await onSubmit({ ...(data as CustomerFormData), photo })
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* Driven by the Select and DateInput below via setValue */}
      <input type="hidden" {...register('status')} />
      <input type="hidden" {...register('date')} />

      <div className="space-y-2">
        <Label htmlFor="customer_name">Customer name</Label>
        <Input id="customer_name" placeholder="e.g., Ali Raza" {...register('customer_name')} />
        {errors.customer_name && (
          <p className="text-sm text-destructive">{errors.customer_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="work_name">Work done</Label>
        <Input
          id="work_name"
          placeholder="e.g., Screen replacement"
          {...register('work_name')}
        />
        {errors.work_name && (
          <p className="text-sm text-destructive">{errors.work_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="imei">IMEI number</Label>
        <Input
          id="imei"
          inputMode="numeric"
          maxLength={IMEI_LENGTH}
          placeholder={`Optional — ${IMEI_LENGTH} digits`}
          {...register('imei')}
        />
        {errors.imei && <p className="text-sm text-destructive">{errors.imei.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input
          id="phone"
          type="tel"
          inputMode="numeric"
          maxLength={PHONE_MAX_DIGITS}
          placeholder="Optional — e.g., 03001234567"
          {...register('phone')}
        />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cnic">CNIC number</Label>
        <Input id="cnic" inputMode="numeric" placeholder="Optional" {...register('cnic')} />
        {errors.cnic && <p className="text-sm text-destructive">{errors.cnic.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Input id="address" placeholder="Optional" {...register('address')} />
        {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
      </div>

      <CustomerPhotoInput initialUrl={savedPhotoUrl} onChange={setPhoto} />

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select
          value={status}
          onValueChange={(value) => setValue('status', value as CustomerStatus)}
        >
          <SelectTrigger id="status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Date</Label>
        <DateInput
          id="date"
          value={date}
          onChange={(value) => setValue('date', value, { shouldValidate: true })}
        />
        {errors.date && <p className="text-sm text-destructive">{errors.date.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Other details</Label>
        <Textarea
          id="notes"
          rows={3}
          placeholder="Device model, lock code, anything else"
          {...register('notes')}
        />
        {errors.notes && <p className="text-sm text-destructive">{errors.notes.message}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {initialData ? 'Update Customer' : 'Save Customer'}
      </Button>
    </form>
  )
}
