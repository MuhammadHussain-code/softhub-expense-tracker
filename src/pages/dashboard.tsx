import { useState } from 'react'
import { Eye, EyeOff, Plus } from 'lucide-react'
import {
  useTransactions,
  useTransactionTotals,
  useAvailableYears,
} from '@/hooks/use-transactions'
import { Button } from '@/components/ui/button'
import { TotalsCards } from '@/components/transactions/totals-cards'
import { TransactionFilters } from '@/components/transactions/transaction-filters'
import { TransactionList } from '@/components/transactions/transaction-list'
import { TransactionDialog } from '@/components/transactions/transaction-dialog'
import { EmptyState } from '@/components/transactions/empty-state'
import { useStore } from '@/providers/store-provider'
import { formatDate } from '@/lib/utils'

export function Dashboard() {
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [date, setDate] = useState('')
  const [description, setDescription] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  // Amounts start hidden so a glance over the shoulder shows nothing
  const [hideAmounts, setHideAmounts] = useState(true)

  const { activeStore } = useStore()

  const filters = {
    month: month && month !== 'all' ? month : undefined,
    year: year && year !== 'all' ? year : undefined,
    date: date || undefined,
    description: description.trim() || undefined,
  }

  const { data: transactions = [], isLoading } = useTransactions(filters)
  const totals = useTransactionTotals(filters)
  const { data: availableYears = [] } = useAvailableYears()

  const handleClearFilters = () => {
    setMonth('')
    setYear('')
    setDate('')
    setDescription('')
  }

  // If date filter is set, clear month/year
  const handleDateChange = (value: string) => {
    setDate(value)
    if (value) {
      setMonth('')
      setYear('')
    }
  }

  // If month is set, clear date and auto-select current year if no year selected
  const handleMonthChange = (value: string) => {
    setMonth(value)
    setDate('')
    // Auto-select current year if selecting a month and no year is set
    if (value && value !== 'all' && (!year || year === 'all')) {
      const currentYear = new Date().getFullYear().toString()
      // Only set if current year is in available years, otherwise use first available
      if (availableYears.includes(currentYear)) {
        setYear(currentYear)
      } else if (availableYears.length > 0 && availableYears[0]) {
        setYear(availableYears[0])
      }
    }
  }

  const handleYearChange = (value: string) => {
    setYear(value)
    setDate('')
  }

  const handleExportCsv = () => {
    if (transactions.length === 0) return

    const currency = activeStore?.currency ?? 'Rs'

    const headers = ['Date', 'Type', 'Description', `Amount (${currency})`]
    const rows = transactions.map((t) => [
      `"${formatDate(t.date)}"`,
      t.type === 'work' ? 'Income' : 'Expense',
      `"${(t.description ?? '').replace(/"/g, '""')}"`,
      t.type === 'work' ? t.amount : -t.amount,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Track your income and expenses
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHideAmounts((hidden) => !hidden)}
            aria-label={hideAmounts ? 'Show amounts' : 'Hide amounts'}
            title={hideAmounts ? 'Show amounts' : 'Hide amounts'}
          >
            {hideAmounts ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </Button>
          <Button onClick={() => setIsAddDialogOpen(true)} className="hidden lg:flex">
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>
        </div>
      </div>

      {/* Totals */}
      <TotalsCards
        income={totals.income}
        expense={totals.expense}
        balance={totals.balance}
        currency={totals.currency}
        isLoading={totals.isLoading}
        hideAmounts={hideAmounts}
      />

      {/* Filters */}
      <TransactionFilters
        month={month}
        year={year}
        date={date}
        description={description}
        availableYears={availableYears}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        onDateChange={handleDateChange}
        onDescriptionChange={setDescription}
        onClear={handleClearFilters}
        onExportCsv={handleExportCsv}
      />

      {/* Transactions List */}
      {!isLoading && transactions.length === 0 ? (
        <EmptyState onAddClick={() => setIsAddDialogOpen(true)} />
      ) : (
        <TransactionList
          transactions={transactions}
          isLoading={isLoading}
          hideAmounts={hideAmounts}
        />
      )}

      {/* Add Dialog */}
      <TransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  )
}
