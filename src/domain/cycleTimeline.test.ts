import { describe, expect, it } from 'vitest'
import {
  bestStreak,
  buildCycleTimeline,
  currentStreak,
  daysAchieved,
  realSavingsCents,
  type DayResult,
} from './cycleTimeline.ts'

describe('buildCycleTimeline', () => {
  it('generates a clean cycle where daily savings roll forward dynamically', () => {
    // 3-day cycle: Sept 1 to Sept 3. Total budget = $30.000 (3,000,000 cents).
    // Today is Sept 4 (cycle is complete).
    // Day 1: 3 days remaining. 3,000,000 / 3 = 1,000,000 allowance. Spent 500,000 (saved 500,000). Status: saved.
    // Day 2: 2 days remaining. (3,000,000 - 500,000) / 2 = 1,250,000 allowance. Spent 250,000 (saved 1,000,000). Status: saved.
    // Day 3: 1 day remaining. (2,500,000 - 250,000) / 1 = 2,250,000 allowance. Spent 250,000 (saved 2,000,000). Status: saved.
    const results = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        totalBudgetCents: 3000000,
      },
      expenses: [
        { expenseDate: '2026-09-01', amountCents: 500000 },
        { expenseDate: '2026-09-02', amountCents: 250000 },
        { expenseDate: '2026-09-03', amountCents: 250000 },
      ],
      today: '2026-09-04',
    })

    expect(results).toHaveLength(3)

    expect(results[0]).toEqual({
      date: '2026-09-01',
      allowanceCents: 1000000,
      spentCents: 500000,
      savedCents: 500000,
      status: 'saved',
    })

    expect(results[1]).toEqual({
      date: '2026-09-02',
      allowanceCents: 1250000,
      spentCents: 250000,
      savedCents: 1000000,
      status: 'saved',
    })

    expect(results[2]).toEqual({
      date: '2026-09-03',
      allowanceCents: 2250000,
      spentCents: 250000,
      savedCents: 2000000,
      status: 'saved',
    })
  })

  it('demonstrates that an overspend day lowers later daily allowances', () => {
    // 3-day cycle: Sept 1 to Sept 3. Total budget = $30.000 (3,000,000 cents).
    // Today is Sept 4.
    // Day 1: 3 days remaining. Allowance = 1,000,000. Spent = 2,000,000 (over by 1,000,000). Status: over.
    // Day 2: 2 days remaining. Remaining budget = 1,000,000. Allowance = 1,000,000 / 2 = 500,000. Spent = 300,000. Status: saved.
    // Day 3: 1 day remaining. Remaining budget = 700,000. Allowance = 700,000 / 1 = 700,000. Spent = 100,000. Status: saved.
    const results = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        totalBudgetCents: 3000000,
      },
      expenses: [
        { expenseDate: '2026-09-01', amountCents: 2000000 },
        { expenseDate: '2026-09-02', amountCents: 300000 },
        { expenseDate: '2026-09-03', amountCents: 100000 },
      ],
      today: '2026-09-04',
    })

    expect(results[0].status).toBe('over')
    expect(results[0].allowanceCents).toBe(1000000)
    expect(results[0].spentCents).toBe(2000000)
    expect(results[0].savedCents).toBe(-1000000)

    // Overspend on Day 1 lowered Day 2 allowance from 1,000,000 down to 500,000
    expect(results[1].allowanceCents).toBe(500000)
    expect(results[1].status).toBe('saved')

    expect(results[2].allowanceCents).toBe(700000)
    expect(results[2].status).toBe('saved')
  })

  it('marks past days with zero expenses as no-record rather than saved', () => {
    // 3-day cycle: Sept 1 to Sept 3.
    // Day 1 has expense. Day 2 has 0 expenses. Day 3 has expense.
    // Today is Sept 4.
    const results = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        totalBudgetCents: 3000000,
      },
      expenses: [
        { expenseDate: '2026-09-01', amountCents: 500000 },
        { expenseDate: '2026-09-03', amountCents: 400000 },
      ],
      today: '2026-09-04',
    })

    expect(results[0].status).toBe('saved')
    expect(results[1].date).toBe('2026-09-02')
    expect(results[1].spentCents).toBe(0)
    expect(results[1].status).toBe('no-record')
    expect(results[2].status).toBe('saved')
  })

  it('correctly categorizes past, today, and future days', () => {
    // Cycle: Sept 10 to Sept 14.
    // today is Sept 12.
    // Sept 10, 11: past
    // Sept 12: today (gets status 'today' even if expenses exist or not)
    // Sept 13, 14: future (status 'future')
    const results = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-10',
        endDate: '2026-09-14',
        totalBudgetCents: 5000000,
      },
      expenses: [
        { expenseDate: '2026-09-10', amountCents: 500000 },
        { expenseDate: '2026-09-12', amountCents: 300000 },
        { expenseDate: '2026-09-13', amountCents: 100000 }, // future recorded expense should be handled cleanly
      ],
      today: '2026-09-12',
    })

    expect(results.map((r) => ({ date: r.date, status: r.status }))).toEqual([
      { date: '2026-09-10', status: 'saved' },
      { date: '2026-09-11', status: 'no-record' },
      { date: '2026-09-12', status: 'today' },
      { date: '2026-09-13', status: 'future' },
      { date: '2026-09-14', status: 'future' },
    ])
  })

  it('aggregates multiple expenses occurring on the exact same date in integer cents', () => {
    const results = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-01',
        endDate: '2026-09-02',
        totalBudgetCents: 2000000,
      },
      expenses: [
        { expenseDate: '2026-09-01', amountCents: 300000 },
        { expenseDate: '2026-09-01', amountCents: 400000 },
      ],
      today: '2026-09-03',
    })

    expect(results[0].spentCents).toBe(700000)
    expect(results[0].allowanceCents).toBe(1000000)
    expect(results[0].savedCents).toBe(300000)
    expect(results[0].status).toBe('saved')
  })

  it('returns empty array if startDate is after endDate', () => {
    const results = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-10',
        endDate: '2026-09-05',
        totalBudgetCents: 1000000,
      },
      expenses: [],
      today: '2026-09-06',
    })
    expect(results).toEqual([])
  })
})

describe('streak and metrics helpers', () => {
  const sampleDays: DayResult[] = [
    { date: '2026-09-01', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
    { date: '2026-09-02', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
    { date: '2026-09-03', allowanceCents: 1000, spentCents: 2000, savedCents: -1000, status: 'over' },
    { date: '2026-09-04', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
    { date: '2026-09-05', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
    { date: '2026-09-06', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
    { date: '2026-09-07', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'today' },
    { date: '2026-09-08', allowanceCents: 1000, spentCents: 0, savedCents: 1000, status: 'future' },
  ]

  it('streak broken by over: evaluates currentStreak and bestStreak correctly', () => {
    // Closed days before today: saved, saved, over, saved, saved, saved
    // Current streak (from most recent closed day backwards): 3 (days 4, 5, 6)
    // Best streak: 3 (days 4, 5, 6)
    expect(currentStreak(sampleDays)).toBe(3)
    expect(bestStreak(sampleDays)).toBe(3)
  })

  it('streak broken by no-record: breaks streak as expected', () => {
    const daysWithNoRecord: DayResult[] = [
      { date: '2026-09-01', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
      { date: '2026-09-02', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
      { date: '2026-09-03', allowanceCents: 1000, spentCents: 0, savedCents: 1000, status: 'no-record' },
      { date: '2026-09-04', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
      { date: '2026-09-05', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'today' },
    ]
    // Closed days: saved, saved, no-record, saved
    expect(currentStreak(daysWithNoRecord)).toBe(1)
    expect(bestStreak(daysWithNoRecord)).toBe(2)
  })

  it('handles streak when most recent closed day is over or no-record (current streak = 0)', () => {
    const brokenEnd: DayResult[] = [
      { date: '2026-09-01', allowanceCents: 1000, spentCents: 500, savedCents: 500, status: 'saved' },
      { date: '2026-09-02', allowanceCents: 1000, spentCents: 1500, savedCents: -500, status: 'over' },
      { date: '2026-09-03', allowanceCents: 1000, spentCents: 0, savedCents: 1000, status: 'today' },
    ]
    expect(currentStreak(brokenEnd)).toBe(0)
    expect(bestStreak(brokenEnd)).toBe(1)
  })

  it('today and future are excluded from daysAchieved denominators', () => {
    // In sampleDays:
    // Closed days = 6 (Sept 1 to Sept 6)
    // Achieved ('saved') days = 5 (Sept 1, 2, 4, 5, 6)
    // Sept 7 ('today') and Sept 8 ('future') are excluded!
    const stats = daysAchieved(sampleDays)
    expect(stats).toEqual({
      achieved: 5,
      closed: 6,
    })
  })

  it('demonstrates realSavings differing from sum of savedCents', () => {
    // 3-day cycle: total budget = $30.000 (3,000,000 cents).
    // Day 1: spent 500,000 (allowance 1,000,000, savedCents = 500,000)
    // Day 2: spent 250,000 (allowance 1,250,000, savedCents = 1,000,000)
    // Day 3: spent 250,000 (allowance 2,250,000, savedCents = 2,000,000)
    // Sum of savedCents = 500,000 + 1,000,000 + 2,000,000 = 3,500,000 cents ($35.000) -> DOUBLE COUNTING!
    // Actual real savings = 3,000,000 - 1,000,000 = 2,000,000 cents ($20.000).
    const cycle = { totalBudgetCents: 3000000 }
    const expenses = [
      { expenseDate: '2026-09-01', amountCents: 500000 },
      { expenseDate: '2026-09-02', amountCents: 250000 },
      { expenseDate: '2026-09-03', amountCents: 250000 },
    ]

    const timeline = buildCycleTimeline({
      cycle: {
        startDate: '2026-09-01',
        endDate: '2026-09-03',
        totalBudgetCents: cycle.totalBudgetCents,
      },
      expenses,
      today: '2026-09-04',
    })

    const sumOfSavedCents = timeline.reduce((acc, d) => acc + d.savedCents, 0)
    const actualRealSavings = realSavingsCents(cycle, expenses)

    expect(sumOfSavedCents).toBe(3500000)
    expect(actualRealSavings).toBe(2000000)
    expect(actualRealSavings).not.toBe(sumOfSavedCents)
  })
})
