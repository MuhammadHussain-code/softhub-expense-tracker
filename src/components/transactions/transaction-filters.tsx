import { useRef } from 'react'
import { X, Download, CalendarDays } from 'lucide-react'
import { MONTHS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// ---------------------------------------------------------------------------
// DateInput – wraps a hidden native <input type="date"> behind a fully
// clickable styled button so the picker opens on tap anywhere (not just the
// tiny calendar icon), and the icon is theme-aware so it shows in dark mode.
// ---------------------------------------------------------------------------
function DateInput({
  id,
  value,
  onChange,
  className,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    try {
      inputRef.current?.showPicker()
    } catch {
      inputRef.current?.focus()
    }
  }

  const formatted = value
    ? new Date(value + 'T00:00:00').toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    : null

  return (
    <div className={cn('relative', className)}>
      {/* Hidden native date input — handles all browser picker logic */}
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />

      {/* Visible styled trigger */}
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
          'hover:bg-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          !formatted && 'text-muted-foreground'
        )}
      >
        <span>{formatted ?? 'Pick a date'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-foreground opacity-60" />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------

interface TransactionFiltersProps {
  month: string
  year: string
  date: string
  description: string
  availableYears: string[]
  onMonthChange: (value: string) => void
  onYearChange: (value: string) => void
  onDateChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onClear: () => void
  onExportCsv: () => void
}

export function TransactionFilters({
  month,
  year,
  date,
  description,
  availableYears,
  onMonthChange,
  onYearChange,
  onDateChange,
  onDescriptionChange,
  onClear,
  onExportCsv,
}: TransactionFiltersProps) {
  const hasFilters = month || year || date || description

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="month-filter" className="text-xs">
          Month
        </Label>
        <Select value={month} onValueChange={onMonthChange}>
          <SelectTrigger id="month-filter" className="w-full sm:w-[140px]">
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTHS.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="year-filter" className="text-xs">
          Year
        </Label>
        <Select value={year} onValueChange={onYearChange}>
          <SelectTrigger id="year-filter" className="w-full sm:w-[120px]">
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {availableYears.map((y) => (
              <SelectItem key={y} value={y}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="date-filter" className="text-xs">
          Date
        </Label>
        <DateInput
          id="date-filter"
          value={date}
          onChange={onDateChange}
          className="w-full sm:w-[180px]"
        />
      </div>

      <div className="w-full space-y-1.5 sm:w-auto">
        <Label htmlFor="description-filter" className="text-xs">
          Description
        </Label>
        <Input
          id="description-filter"
          type="text"
          placeholder="Search description…"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          className="w-full sm:w-[200px]"
        />
      </div>

      <div className="flex items-center gap-2">
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="mr-1 h-4 w-4" />
          Export CSV
        </Button>
      </div>
    </div>
  )
}
