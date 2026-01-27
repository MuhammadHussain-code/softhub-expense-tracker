export const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const

export const TRANSACTION_TYPES = {
  work: 'work',
  expense: 'expense',
} as const

export type TransactionType = (typeof TRANSACTION_TYPES)[keyof typeof TRANSACTION_TYPES]

export const ROLES = {
  owner: 'owner',
  member: 'member',
} as const

export type Role = (typeof ROLES)[keyof typeof ROLES]

export const STORAGE_KEYS = {
  activeStoreId: 'shop-tracker-active-store-id',
} as const
