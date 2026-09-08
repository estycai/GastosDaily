import { describe, expect, it } from 'vitest'
import {
  cycleSpentCents,
  dailyAllowanceCents,
  daysRemaining,
  paceStatus,
  projectAllowanceAfter,
} from './budget.ts'

describe('daysRemaining', () => {
  it('counts today inclusive through the end date', () => {
    // 2026-09-21 to 2026-09-30 is 10 days (21, 22, 23, 24, 25, 26, 27, 28, 29, 30)
    expect(daysRemaining('2026-09-21', '2026-09-30')).toBe(10)
  })

  it('returns 1 day if today is the end date', () => {
    expect(daysRemaining('2026-09-30', '2026-09-30')).toBe(1)
  })

  it('handles daysRemaining <= 0 safely', () => {
    expect(daysRemaining('2026-10-01', '2026-09-30')).toBe(0)
    expect(daysRemaining('2026-10-15', '2026-09-30')).toBe(0)
  })

  it('works with Date objects', () => {
    const today = new Date(2026, 8, 21) // Sept 21
    const end = new Date(2026, 8, 30)   // Sept 30
    expect(daysRemaining(today, end)).toBe(10)
  })
})

describe('cycleSpentCents', () => {
  it('sums expenses accurately in integer cents', () => {
    expect(cycleSpentCents([350000, 820000])).toBe(1170000)
    expect(cycleSpentCents([])).toBe(0)
  })
})

describe('dailyAllowanceCents', () => {
  it('calculates the worked example from design: 300000 budget, 100000 remaining, 10 days left', () => {
    // .000 budget = 30,000,000 cents
    // .000 remaining means spent = .000 = 20,000,000 cents
    // 10 days left
    // Expected: 100.000 / 10 = 10.000 = 1,000,000 cents
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      daysRemaining: 10,
      calcMode: 'dynamic',
    })
    expect(allowance).toBe(1000000) // $ 10.000
  })

  it('supports fixed mode dividing evenly across total cycle days', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 10000000,
      daysRemaining: 10,
      calcMode: 'fixed',
      totalCycleDays: 30,
    })
    expect(allowance).toBe(1000000) // 300.000 / 30 = 10.000
  })

  it('clamps at zero when budget is exhausted in dynamic mode', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 30000000,
      daysRemaining: 10,
      calcMode: 'dynamic',
    })
    expect(allowance).toBe(0)
  })

  it('clamps at zero when an expense is larger than what remains', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 35000000,
      daysRemaining: 10,
      calcMode: 'dynamic',
    })
    expect(allowance).toBe(0)
  })

  it('handles daysRemaining <= 0 safely by clamping at 0 without Infinity', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      daysRemaining: 0,
      calcMode: 'dynamic',
    })
    expect(allowance).toBe(0)
    expect(Number.isFinite(allowance)).toBe(true)

    const negativeDays = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      daysRemaining: -5,
      calcMode: 'dynamic',
    })
    expect(negativeDays).toBe(0)
  })

  it('fixed mode clamps to remaining budget if remaining is less than fixed daily quota', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 29500000, // 500.000 cents remaining (.000)
      daysRemaining: 10,
      calcMode: 'fixed',
      totalCycleDays: 30, // daily fixed would be 10.000
    })
    expect(allowance).toBe(500000) // capped at remaining budget
  })
})

describe('paceStatus', () => {
  it('returns on-track when spent today is less than or equal to daily allowance', () => {
    // 3.500 spent vs 10.000 allowance
    expect(paceStatus(350000, 1000000)).toBe('on-track')
    // equal
    expect(paceStatus(1000000, 1000000)).toBe('on-track')
  })

  it('returns over when spent today exceeds daily allowance', () => {
    expect(paceStatus(1200000, 1000000)).toBe('over')
  })
})

describe('projectAllowanceAfter', () => {
  it('calculates the impact simulator worked example from design', () => {
    // In design:
    // Remaining before today: .000 (10.000.000 cents)
    // Total budget: .000 (30.000.000 cents)
    // Cycle spent so far: .000 (20.000.000 cents)
    // Days remaining: 10
    // Expense amount to register: .500 (450.000 cents)
    // Future days remaining: 9
    // Remaining budget after expense: 100.000 - 4.500 = 95.500
    // 95.500 / 9 = 10.611,11 -> 10.611 ($ 10.611 / día)
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 10,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      calcMode: 'dynamic',
      additionalExpenseCents: 450000,
    })
    expect(projected).toBe(1061111) // Math.floor(9550000 / 9) = 1061111 cents (.611)
    expect(Math.round(projected / 100)).toBe(10611)
  })

  it('clamps at zero when additional expense exceeds total remaining budget', () => {
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 10,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      calcMode: 'dynamic',
      additionalExpenseCents: 15000000, // .000 exceeds .000 remaining
    })
    expect(projected).toBe(0)
  })

  it('handles last day of cycle (daysRemaining = 1) without dividing by zero', () => {
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 1,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      calcMode: 'dynamic',
      additionalExpenseCents: 500000,
    })
    expect(projected).toBe(0)
    expect(Number.isFinite(projected)).toBe(true)
  })
})
