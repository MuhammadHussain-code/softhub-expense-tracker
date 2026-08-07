import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'Rs') {
  return `${currency} ${amount.toLocaleString()}`
}

/** Placeholder shown in place of an amount while amounts are hidden */
export function maskCurrency(currency: string = 'Rs') {
  return `${currency} ••••`
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
