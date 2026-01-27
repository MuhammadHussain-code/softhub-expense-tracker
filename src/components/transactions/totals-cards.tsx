import { TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn, formatCurrency } from '@/lib/utils'

interface TotalsCardsProps {
  income: number
  expense: number
  balance: number
  currency: string
  isLoading: boolean
}

export function TotalsCards({
  income,
  expense,
  balance,
  currency,
  isLoading,
}: TotalsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-2 h-4 w-20" />
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Income */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-4 w-4 text-success" />
            Income
          </div>
          <p className="mt-1 text-2xl font-bold text-success">
            {formatCurrency(income, currency)}
          </p>
        </CardContent>
      </Card>

      {/* Expense */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingDown className="h-4 w-4 text-destructive" />
            Expense
          </div>
          <p className="mt-1 text-2xl font-bold text-destructive">
            {formatCurrency(expense, currency)}
          </p>
        </CardContent>
      </Card>

      {/* Balance */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            Balance
          </div>
          <p
            className={cn(
              'mt-1 text-2xl font-bold',
              balance >= 0 ? 'text-success' : 'text-destructive'
            )}
          >
            {formatCurrency(Math.abs(balance), currency)}
            {balance < 0 && ' (deficit)'}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
