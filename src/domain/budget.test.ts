import { describe, expect, it } from 'vitest'
import {
  cycleSpentCents,
  dailyAllowanceCents,
  daysRemaining,
  paceStatus,
  projectAllowanceAfter,
  remainingTodayCents,
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
    // 300.000 budget = 30,000,000 cents
    // 100.000 remaining means spent = 200.000 = 20,000,000 cents
    // 10 days left
    // Expected: 100.000 / 10 = 10.000 = 1,000,000 cents
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      daysRemaining: 10,
    })
    expect(allowance).toBe(1000000) // $ 10.000
  })

  it('clamps at zero when budget is exhausted in dynamic mode', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 30000000,
      daysRemaining: 10,
    })
    expect(allowance).toBe(0)
  })

  it('clamps at zero when an expense is larger than what remains', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 35000000,
      daysRemaining: 10,
    })
    expect(allowance).toBe(0)
  })

  it('handles daysRemaining <= 0 safely by clamping at 0 without Infinity', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      daysRemaining: 0,
    })
    expect(allowance).toBe(0)
    expect(Number.isFinite(allowance)).toBe(true)

    const negativeDays = dailyAllowanceCents({
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      daysRemaining: -5,
    })
    expect(negativeDays).toBe(0)
  })

  it('floors fractional cents correctly in dynamic calculation', () => {
    // 100.000 cents left over 3 days = 33333.333 -> 33333 cents
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 100000,
      cycleSpentCents: 0,
      daysRemaining: 3,
    })
    expect(allowance).toBe(33333)
  })

  it('handles zero budget safely returning zero allowance', () => {
    const allowance = dailyAllowanceCents({
      totalBudgetCents: 0,
      cycleSpentCents: 0,
      daysRemaining: 10,
    })
    expect(allowance).toBe(0)
  })
})

describe('paceStatus', () => {
  it('returns on-track when spent today is less than or equal to daily allowance', () => {
    // $ 3.500 spent vs 10.000 allowance
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
    // Remaining before today: $ 100.000 (10.000.000 cents)
    // Total budget: $ 300.000 (30.000.000 cents)
    // Cycle spent so far: $ 200.000 (20.000.000 cents)
    // Days remaining: 10
    // Expense amount to register: $ 4.500 (450.000 cents)
    // Future days remaining: 9
    // Remaining budget after expense: 100.000 - 4.500 = 95.500
    // 95.500 / 9 = 10.611,11 -> 10.611 ($ 10.611 / día)
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 10,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      additionalExpenseCents: 450000,
    })
    expect(projected).toBe(1061111) // Math.floor(9550000 / 9) = 1061111 cents ($ 10.611)
    expect(Math.round(projected / 100)).toBe(10611)
  })

  it('clamps at zero when additional expense exceeds total remaining budget', () => {
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 10,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      additionalExpenseCents: 15000000, // $ 150.000 exceeds $ 100.000 remaining
    })
    expect(projected).toBe(0)
  })

  it('handles last day of cycle (daysRemaining = 1) without dividing by zero', () => {
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 1,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      additionalExpenseCents: 500000,
    })
    expect(projected).toBe(0)
    expect(Number.isFinite(projected)).toBe(true)
  })

  it('handles daysRemaining <= 0 safely by clamping at 0', () => {
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 0,
      totalBudgetCents: 30000000,
      cycleSpentCents: 20000000,
      additionalExpenseCents: 500000,
    })
    expect(projected).toBe(0)
  })

  it('handles negative additionalExpenseCents safely', () => {
    const projected = projectAllowanceAfter({
      currentDailyAllowanceCents: 1000000,
      daysRemaining: 5,
      totalBudgetCents: 10000000,
      cycleSpentCents: 5000000,
      additionalExpenseCents: -500000,
    })
    // 5000000 remaining / (5 - 1) = 1250000
    expect(projected).toBe(1250000)
  })
})

describe('domain and edge function calculation parity', () => {
  /**
   * Extracted exact arithmetic logic from supabase/functions/register-expense/index.ts
   */
  function edgeFunctionCalculateAllowance(
    cycleRow: {
      total_budget: number
      start_date: string
      end_date: string
    },
    cycleExpenses: Array<{ amount: number }>,
    todayStr: string
  ): number {
    const totalBudgetCents = Math.round(Number(cycleRow.total_budget) * 100)
    let cycleSpentCents = 0
    for (const exp of cycleExpenses) {
      cycleSpentCents += Math.round(Number(exp.amount) * 100)
    }

    const parseYmd = (dateStr: string) => {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr)
      if (match) {
        return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
      }
      const d = new Date(dateStr)
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
    }

    const todayMs = parseYmd(todayStr)
    const endMs = parseYmd(cycleRow.end_date)
    const diffDays = Math.round((endMs - todayMs) / (1000 * 60 * 60 * 24)) + 1
    const daysLeft = diffDays <= 0 ? 0 : diffDays

    let dailyAllowanceCents = 0
    if (daysLeft > 0) {
      const remainingBudget = totalBudgetCents - cycleSpentCents
      if (remainingBudget > 0) {
        dailyAllowanceCents = Math.floor(remainingBudget / daysLeft)
      }
    }
    return dailyAllowanceCents
  }

  const testFixtures = [
    {
      name: 'Dynamic cycle with 300,000 budget, 10 days remaining and 200,000 spent',
      cycle: {
        total_budget: 300000,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
      },
      expenses: [{ amount: 120000 }, { amount: 80000 }],
      today: '2026-09-21', // 10 days remaining
    },
    {
      name: 'Dynamic cycle with almost exhausted budget capping at remaining cents',
      cycle: {
        total_budget: 100000,
        start_date: '2026-09-01',
        end_date: '2026-09-10',
      },
      expenses: [{ amount: 99990 }],
      today: '2026-09-05',
    },
    {
      name: 'Dynamic cycle with 0 days remaining (expired)',
      cycle: {
        total_budget: 100000,
        start_date: '2026-09-01',
        end_date: '2026-09-15',
      },
      expenses: [{ amount: 50000 }],
      today: '2026-09-16',
    },
    {
      name: 'Dynamic cycle 1-day remaining (start_date == end_date == today)',
      cycle: {
        total_budget: 50000,
        start_date: '2026-09-20',
        end_date: '2026-09-20',
      },
      expenses: [{ amount: 10000 }],
      today: '2026-09-20',
    },
    {
      name: 'Dynamic cycle with overspent budget (negative remaining clamped to 0)',
      cycle: {
        total_budget: 50000,
        start_date: '2026-09-01',
        end_date: '2026-09-30',
      },
      expenses: [{ amount: 60000 }],
      today: '2026-09-10',
    },
  ]

  for (const fixture of testFixtures) {
    it(`produces identical cents for: ${fixture.name}`, () => {
      // 1. Run through domain functions
      const totalBudgetCents = fixture.cycle.total_budget * 100
      const totalCycleSpent = cycleSpentCents(fixture.expenses.map((e) => e.amount * 100))
      const daysLeft = daysRemaining(fixture.today, fixture.cycle.end_date)

      const domainResult = dailyAllowanceCents({
        totalBudgetCents,
        cycleSpentCents: totalCycleSpent,
        daysRemaining: daysLeft,
      })

      // 2. Run through edge function arithmetic
      const edgeResult = edgeFunctionCalculateAllowance(
        fixture.cycle,
        fixture.expenses,
        fixture.today
      )

      // 3. Assert parity
      expect(domainResult).toBe(edgeResult)
    })
  }
})

describe('remainingTodayCents', () => {
  it('returns positive remaining allowance when todaySpent is less than daily allowance', () => {
    // 10.000 allowance (1,000,000 cents), 3.500 spent (350,000 cents) -> 6.500 remaining (650,000 cents)
    expect(remainingTodayCents(1000000, 350000)).toBe(650000)
  })

  it('handles zero-spend case correctly returning the full daily allowance', () => {
    // Fresh day: 10.000 allowance, 0 spent -> 10.000 remaining
    expect(remainingTodayCents(1000000, 0)).toBe(1000000)
  })

  it('handles exactly-equal case returning 0', () => {
    // 10.000 allowance, 10.000 spent -> 0 remaining
    expect(remainingTodayCents(1000000, 1000000)).toBe(0)
  })

  it('handles negative case without clamping when today spent exceeds daily allowance', () => {
    // 10.000 allowance (1,000,000 cents), 12.300 spent (1,230,000 cents) -> -2.300 (-230,000 cents)
    expect(remainingTodayCents(1000000, 1230000)).toBe(-230000)
  })

  it('handles zero daily allowance with positive spent resulting in negative remaining', () => {
    // 0 allowance, 5.000 spent -> -5.000 (-500,000 cents)
    expect(remainingTodayCents(0, 500000)).toBe(-500000)
  })

  it('rounds floating-point cents safely to integers', () => {
    expect(remainingTodayCents(10000.4, 3000.2)).toBe(7000)
  })
})
