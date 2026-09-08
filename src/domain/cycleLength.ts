/**
 * Normalizes a date or YYYY-MM-DD string to a calendar day timestamp (UTC midnight).
 */
function toDayTimestamp(date: Date | string): number {
  if (typeof date === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date)
    if (match) {
      const year = Number(match[1])
      const monthIndex = Number(match[2]) - 1
      const day = Number(match[3])
      return Date.UTC(year, monthIndex, day)
    }
    const d = new Date(date)
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  }
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
}

/**
 * Calculates total cycle length in days (inclusive: end_date - start_date + 1).
 * Clamped to at least 1 day if end_date < start_date or non-positive.
 */
export function cycleLengthDays(startDate: Date | string, endDate: Date | string): number {
  const startMs = toDayTimestamp(startDate)
  const endMs = toDayTimestamp(endDate)
  const diffDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)) + 1
  return diffDays <= 0 ? 1 : diffDays
}
