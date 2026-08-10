import { useRef } from 'react'
import { CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// DateInput – a styled shell drawn *behind* a real, transparent, full-size
// native <input type="date">.
//
// The native input must stay hit-testable: iOS (Safari *and* Chrome, both
// WebKit) only opens the date wheel when the user physically taps a rendered
// date input. Programmatic focus() never opens it, and showPicker() is a
// no-op/throws for an input that is visually hidden — which is why a
// button-driven, sr-only input worked on Android but did nothing on iOS.
//
// So the tap target here *is* the native control (opacity-0, stretched over
// the field). Chromium additionally gets its calendar-picker-indicator
// stretched edge-to-edge so a click anywhere opens the calendar rather than
// just focusing a segment. Firefox has neither that pseudo-element nor an
// implicit tap-to-open, so it falls back to showPicker().
// ---------------------------------------------------------------------------

// Chromium/WebKit expose ::-webkit-calendar-picker-indicator; Firefox does not.
const hasWebkitPickerIndicator =
  typeof CSS !== 'undefined' &&
  typeof CSS.supports === 'function' &&
  CSS.supports('selector(::-webkit-calendar-picker-indicator)')

function formatDate(value: string) {
  if (!value) return null
  const parsed = new Date(value + 'T00:00:00')
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

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

  // Only needed where tapping the field doesn't open a picker on its own.
  const handleClick = () => {
    if (hasWebkitPickerIndicator) return
    try {
      inputRef.current?.showPicker()
    } catch {
      /* Picker already open or unsupported — the input stays usable as text. */
    }
  }

  const formatted = formatDate(value)

  return (
    <div
      className={cn(
        'relative h-9 rounded-md focus-within:ring-1 focus-within:ring-ring',
        className
      )}
    >
      {/* Presentation only — never intercepts the tap. */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 flex items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm',
          !formatted && 'text-muted-foreground'
        )}
      >
        <span className="truncate">{formatted ?? 'Pick a date'}</span>
        <CalendarDays className="h-4 w-4 shrink-0 text-foreground opacity-60" />
      </div>

      {/* The real control: invisible, but fully rendered and tappable. */}
      <input
        ref={inputRef}
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onClick={handleClick}
        className={cn(
          'absolute inset-0 h-full w-full cursor-pointer rounded-md border-0 bg-transparent p-0 opacity-0',
          // text-base (16px) keeps iOS from zooming the page when the field
          // takes focus; the input is transparent so it costs nothing visually.
          'appearance-none text-base focus:outline-none',
          // Stretch Chromium's calendar button across the whole field so a
          // click anywhere opens the calendar instead of editing one segment.
          '[&::-webkit-calendar-picker-indicator]:absolute',
          '[&::-webkit-calendar-picker-indicator]:inset-0',
          '[&::-webkit-calendar-picker-indicator]:h-full',
          '[&::-webkit-calendar-picker-indicator]:w-full',
          '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
          '[&::-webkit-calendar-picker-indicator]:m-0',
          '[&::-webkit-calendar-picker-indicator]:p-0',
          '[&::-webkit-calendar-picker-indicator]:opacity-0'
        )}
      />
    </div>
  )
}
