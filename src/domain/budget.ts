export type CalcMode = 'dynamic' | 'fixed'

export type PaceStatus = 'on-track' | 'over'

export interface DailyAllowanceParams {
  totalBudgetCents: number
  cycleSpentCents: number
  daysRemaining: number
  calcMode: CalcMode
  totalCycleDays: number
}

export interface ProjectAllowanceParams {
  currentDailyAllowanceCents: number
  daysRemaining: number
  totalBudgetCents: number
  cycleSpentCents: number
  calcMode: CalcMode
  additionalExpenseCents: number
  totalCycleDays: number
}

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
 * Calculates days remaining from today inclusive through the end date.
 * Example: today=2026-09-21, endDate=2026-09-30 => 10 days remaining.
 * Returns 0 if endDate is strictly before today (or <= 0 days).
 */
export function daysRemaining(today: Date | string, endDate: Date | string): number {
  const todayMs = toDayTimestamp(today)
  const endMs = toDayTimestamp(endDate)
  const diffDays = Math.round((endMs - todayMs) / (1000 * 60 * 60 * 24)) + 1

  if (diffDays <= 0) {
    return 0
  }
  return diffDays
}

/**
 * Sums all expenses in cents.
 */
export function cycleSpentCents(expensesCents: readonly number[]): number {
  let total = 0
  for (const exp of expensesCents) {
    total += Math.round(exp)
  }
  return total < 0 ? 0 : total
}

/**
 * Computes daily allowance in integer cents.
 * Never returns negative or Infinity. Clamps at zero.
 */
export function dailyAllowanceCents(params: DailyAllowanceParams): number {
  const { totalBudgetCents, cycleSpentCents, daysRemaining, calcMode, totalCycleDays } = params

  if (calcMode === 'fixed') {
    const cycleDays = Math.max(1, Math.round(totalCycleDays))
    const fixedDaily = Math.floor(totalBudgetCents / cycleDays)
    const remainingBudget = Math.max(0, totalBudgetCents - cycleSpentCents)
    return Math.min(fixedDaily, remainingBudget)
  }

  // Dynamic mode:
  // dailyAllowance = (totalBudget - sumOfCycleExpenses) / daysRemaining
  if (daysRemaining <= 0) {
    return 0
  }

  const remainingBudget = totalBudgetCents - cycleSpentCents
  if (remainingBudget <= 0) {
    return 0
  }

  return Math.floor(remainingBudget / daysRemaining)
}

/**
 * Determines pace status based on spent today vs daily allowance.
 * spent-today <= allowance -> 'on-track'
 * spent-today > allowance -> 'over'
 */
export function paceStatus(spentTodayCents: number, dailyAllowanceCents: number): PaceStatus {
  if (spentTodayCents <= dailyAllowanceCents) {
    return 'on-track'
  }
  return 'over'
}

/**
 * Projects the new daily allowance after recording an additional expense.
 * Clamps at 0, never returns negative or Infinity.
 */
export function projectAllowanceAfter(params: ProjectAllowanceParams): number {
  const {
    daysRemaining,
    totalBudgetCents,
    cycleSpentCents,
    calcMode,
    additionalExpenseCents,
    totalCycleDays,
  } = params

  const newCycleSpent = cycleSpentCents + Math.max(0, additionalExpenseCents)
  const remainingBudget = Math.max(0, totalBudgetCents - newCycleSpent)

  if (calcMode === 'fixed') {
    const cycleDays = Math.max(1, Math.round(totalCycleDays))
    const fixedDaily = Math.floor(totalBudgetCents / cycleDays)
    return Math.min(fixedDaily, remainingBudget)
  }

  // Dynamic mode:
  // After today's expense, future daily allowance across the remaining future days (daysRemaining - 1):
  const futureDays = daysRemaining - 1

  if (futureDays <= 0) {
    return 0
  }

  if (remainingBudget <= 0) {
    return 0
  }

  return Math.floor(remainingBudget / futureDays)
}

/**
 * Calculates remaining allowance for today in integer cents.
 * remainingToday = dailyAllowance - spentToday
 * May be negative if today's spend exceeds the daily allowance.
 * Do not clamp at zero (documented exception to the clamp-at-zero rule).
 */
export function remainingTodayCents(
  dailyAllowanceCents: number,
  todaySpentCents: number
): number {
  return Math.round(dailyAllowanceCents) - Math.round(todaySpentCents)
}
