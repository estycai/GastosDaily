/**
 * Date utilities for America/Argentina/Buenos_Aires timezone.
 * All calendar calculations must respect this timezone so an expense at 22:00 local
 * belongs to the local calendar day, never UTC.
 */

export const BUENOS_AIRES_TIMEZONE = 'America/Argentina/Buenos_Aires'

/**
 * Returns today's date formatted as YYYY-MM-DD in America/Argentina/Buenos_Aires.
 */
export function getTodayBuenosAires(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUENOS_AIRES_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return formatter.format(date)
}

/**
 * Formats a YYYY-MM-DD string into a friendly Spanish date label (e.g. "30 Sep" or "20 Sep").
 */
export function formatFriendlyDate(dateStr: string): string {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length < 3) return dateStr
  const year = parseInt(parts[0], 10)
  const monthIndex = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)

  // Use UTC to prevent local machine TZ shift
  const d = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0))
  const dayNum = d.getUTCDate()
  const monthStr = d.toLocaleDateString('es-AR', {
    month: 'short',
    timeZone: 'UTC',
  })
  // Capitalize month: 'sep' -> 'Sep'
  const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1).replace('.', '')
  return `${dayNum} ${capitalizedMonth}`
}

/**
 * Formats an ISO createdAt timestamp into a friendly time or day label in Buenos Aires timezone.
 * e.g. "13:30 hs" for today, or "Ayer 19 Sep", or "18 Sep".
 */
export function formatExpenseDateLabel(createdAtIso: string, expenseDate: string): string {
  const today = getTodayBuenosAires()

  try {
    const d = new Date(createdAtIso)
    const timeFormatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: BUENOS_AIRES_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const timeStr = timeFormatter.format(d)

    if (expenseDate === today) {
      return `${timeStr} hs`
    }
    return `${formatFriendlyDate(expenseDate)} • ${timeStr} hs`
  } catch {
    return formatFriendlyDate(expenseDate)
  }
}
