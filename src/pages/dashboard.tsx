import { useState } from 'react'
import { Plus } from 'lucide-react'
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

export function Dashboard() {
  const [month, setMonth] = useState('')
  const [year, setYear] = useState('')
  const [date, setDate] = useState('')
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const filters = {
    month: month && month !== 'all' ? month : undefined,
    year: year && year !== 'all' ? year : undefined,
    date: date || undefined,
  }

  const { data: transactions = [], isLoading } = useTransactions(filters)
  const totals = useTransactionTotals(filters)
  const { data: availableYears = [] } = useAvailableYears()

  const handleClearFilters = () => {
    setMonth('')
    setYear('')
    setDate('')
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
        <Button onClick={() => setIsAddDialogOpen(true)} className="hidden lg:flex">
          <Plus className="mr-2 h-4 w-4" />
          Add Entry
        </Button>
      </div>

      {/* Totals */}
      <TotalsCards
        income={totals.income}
        expense={totals.expense}
        balance={totals.balance}
        currency={totals.currency}
        isLoading={totals.isLoading}
      />

      {/* Filters */}
      <TransactionFilters
        month={month}
        year={year}
        date={date}
        availableYears={availableYears}
        onMonthChange={handleMonthChange}
        onYearChange={handleYearChange}
        onDateChange={handleDateChange}
        onClear={handleClearFilters}
      />

      {/* Transactions List */}
      {!isLoading && transactions.length === 0 ? (
        <EmptyState onAddClick={() => setIsAddDialogOpen(true)} />
      ) : (
        <TransactionList transactions={transactions} isLoading={isLoading} />
      )}

      {/* Add Dialog */}
      <TransactionDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
      />
    </div>
  )
}
