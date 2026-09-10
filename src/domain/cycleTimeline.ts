import { dailyAllowanceCents, daysRemaining } from './budget.ts'

export type DayStatus = 'saved' | 'over' | 'today' | 'future'

export interface DayResult {
  date: string // YYYY-MM-DD
  allowanceCents: number
  spentCents: number
  savedCents: number // allowanceCents - spentCents, may be negative
  status: DayStatus
}

/**
 * Classifies a closed day against its daily allowance.
 * A day with spentCents <= allowanceCents (including zero spending) is 'saved'.
 * Otherwise 'over'.
 */
export function classifyClosedDay(spentCents: number, allowanceCents: number): 'saved' | 'over' {
  return spentCents <= allowanceCents ? 'saved' : 'over'
}

export interface CycleInput {
  startDate: string
  endDate: string
  totalBudgetCents: number
}

export interface ExpenseInput {
  expenseDate: string
  amountCents: number
}

export interface BuildCycleTimelineParams {
  cycle: CycleInput
  expenses: readonly ExpenseInput[]
  today: string
}

function parseYmd(dateStr: string): { year: number; month: number; day: number; utcTimestamp: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
  if (!match) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`)
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const utcTimestamp = Date.UTC(year, month - 1, day)
  return { year, month, day, utcTimestamp }
}

function formatYmd(utcTimestamp: number): string {
  const d = new Date(utcTimestamp)
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Reconstructs the day-by-day dynamic allowance and outcome for each calendar day
 * of a cycle from cycle.startDate through cycle.endDate inclusive.
 */
export function buildCycleTimeline(params: BuildCycleTimelineParams): DayResult[] {
  const { cycle, expenses, today } = params
  const { startDate, endDate, totalBudgetCents } = cycle

  const startParsed = parseYmd(startDate)
  const endParsed = parseYmd(endDate)

  if (startParsed.utcTimestamp > endParsed.utcTimestamp) {
    return []
  }

  // Aggregate expenses by date in integer cents
  const expensesByDate = new Map<string, number>()
  for (const exp of expenses) {
    const prev = expensesByDate.get(exp.expenseDate) ?? 0
    expensesByDate.set(exp.expenseDate, prev + Math.round(exp.amountCents))
  }

  const results: DayResult[] = []
  const oneDayMs = 1000 * 60 * 60 * 24
  let accumulatedSpentBeforeDayCents = 0

  for (let ts = startParsed.utcTimestamp; ts <= endParsed.utcTimestamp; ts += oneDayMs) {
    const dateStr = formatYmd(ts)
    const daysLeft = daysRemaining(dateStr, endDate)

    const allowanceCents = dailyAllowanceCents({
      totalBudgetCents,
      cycleSpentCents: accumulatedSpentBeforeDayCents,
      daysRemaining: daysLeft,
    })

    const spentCents = expensesByDate.get(dateStr) ?? 0
    const savedCents = allowanceCents - spentCents

    let status: DayStatus
    if (dateStr > today) {
      status = 'future'
    } else if (dateStr === today) {
      status = 'today'
    } else {
      // Past days (strictly before today)
      status = classifyClosedDay(spentCents, allowanceCents)
    }

    results.push({
      date: dateStr,
      allowanceCents,
      spentCents,
      savedCents,
      status,
    })

    // Advance accumulated spent before subsequent days
    accumulatedSpentBeforeDayCents += spentCents
  }

  return results
}

/**
 * Calculates the current streak of consecutive days with status 'saved'.
 * Evaluated walking backwards from the most recent closed day.
 * 'today' and 'future' are not counted and do not break the streak.
 * 'over' breaks the streak.
 */
export function currentStreak(days: readonly DayResult[]): number {
  const closedDays = days.filter((d) => d.status !== 'today' && d.status !== 'future')
  let streak = 0
  for (let i = closedDays.length - 1; i >= 0; i--) {
    if (closedDays[i].status === 'saved') {
      streak++
    } else {
      break
    }
  }
  return streak
}

/**
 * Calculates the best (maximum) streak of consecutive days with status 'saved'.
 * Evaluated in chronological order over closed days.
 * 'today' and 'future' are not counted and do not break the streak.
 * 'over' breaks a streak.
 */
export function bestStreak(days: readonly DayResult[]): number {
  const closedDays = days.filter((d) => d.status !== 'today' && d.status !== 'future')
  let maxStreak = 0
  let current = 0

  for (const d of closedDays) {
    if (d.status === 'saved') {
      current++
      if (current > maxStreak) {
        maxStreak = current
      }
    } else {
      current = 0
    }
  }

  return maxStreak
}

export interface DaysAchievedResult {
  achieved: number
  closed: number
}

/**
 * Counts achieved ('saved') vs total closed days.
 * Excludes 'today' and 'future'.
 */
export function daysAchieved(days: readonly DayResult[]): DaysAchievedResult {
  const closedDays = days.filter((d) => d.status !== 'today' && d.status !== 'future')
  const achieved = closedDays.filter((d) => d.status === 'saved').length
  return {
    achieved,
    closed: closedDays.length,
  }
}

/**
 * Calculates real cycle savings: totalBudgetCents - sum(expenses).
 *
 * IMPORTANT: this is deliberately NOT the sum of savedCents.
 * In dynamic mode unspent money rolls forward into later days' allowances,
 * so summing daily surpluses counts the same pesos many times over.
 */
export function realSavingsCents(
  cycle: { totalBudgetCents: number },
  expenses: readonly { amountCents: number }[]
): number {
  let totalExpenses = 0
  for (const exp of expenses) {
    totalExpenses += Math.round(exp.amountCents)
  }
  return cycle.totalBudgetCents - totalExpenses
}
