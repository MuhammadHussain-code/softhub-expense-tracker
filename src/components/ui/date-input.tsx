import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// DateInput – wraps a hidden native <input type="date"> behind a fully
// clickable styled button so the picker opens on tap anywhere (not just the
// tiny calendar icon), and the icon is theme-aware so it shows in dark mode.
// ---------------------------------------------------------------------------
export function DateInput({
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
