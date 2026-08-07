import { X, Download } from 'lucide-react'
import { MONTHS } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateInput } from '@/components/ui/date-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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
