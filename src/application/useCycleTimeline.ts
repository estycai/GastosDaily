import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  buildCycleTimeline,
  classifyClosedDay,
  currentStreak,
  bestStreak,
  daysAchieved,
  realSavingsCents,
  type DayResult,
  type DaysAchievedResult,
} from '../domain/index.ts'
import {
  listCycleDays as listCycleDaysInfra,
  upsertCycleDays as upsertCycleDaysInfra,
  type CycleDayEntity,
  type CreateCycleDayParams,
} from '../infrastructure/supabase/cycleDaysRepository.ts'
import { useCycle } from './useCycle.ts'
import { useExpenses } from './useExpenses.ts'
import { getTodayBuenosAires } from './dateUtils.ts'

import type { CycleEntity } from './useCycle.ts'
import type { ExpenseEntity } from './useExpenses.ts'

export interface UseCycleTimelineReturn {
  days: DayResult[]
  currentStreak: number
  bestStreak: number
  daysAchieved: DaysAchievedResult
  realSavingsCents: number
  activeCycle: CycleEntity | null
  expenses: ExpenseEntity[]
  loading: boolean
  error: Error | null
  refreshTimeline: () => Promise<void>
}

export function useCycleTimeline(userId: string | null): UseCycleTimelineReturn {
  const {
    activeCycle,
    loading: cycleLoading,
    error: cycleError,
  } = useCycle(userId)

  const cycleId = activeCycle?.id ?? null

  const {
    expenses,
    loading: expensesLoading,
    error: expensesError,
  } = useExpenses(userId, cycleId)

  const [sealedDays, setSealedDays] = useState<CycleDayEntity[]>([])
  const [sealedLoading, setSealedLoading] = useState<boolean>(true)
  const [sealedError, setSealedError] = useState<Error | null>(null)

  const isMountedRef = useRef<boolean>(true)
  const syncRequestIdRef = useRef<number>(0)
  // Track expense fingerprint to trigger re-seal when expenses on sealed days change
  const previousExpenseFingerprintRef = useRef<string | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const today = getTodayBuenosAires()

  // 1. Initial / full fetch of sealed rows from cycle_days
  const fetchSealedDays = useCallback(async () => {
    if (!userId || !cycleId) {
      if (isMountedRef.current) {
        setSealedDays([])
        setSealedLoading(false)
      }
      return
    }

    setSealedLoading(true)
    setSealedError(null)
    try {
      const data = await listCycleDaysInfra(userId, cycleId)
      if (isMountedRef.current) {
        setSealedDays(data)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSealedError(err instanceof Error ? err : new Error(String(err)))
      }
    } finally {
      if (isMountedRef.current) {
        setSealedLoading(false)
      }
    }
  }, [userId, cycleId])

  useEffect(() => {
    fetchSealedDays()
  }, [fetchSealedDays])

  // 2. Compute full dynamic timeline in memory
  const fullTimeline = useMemo<DayResult[]>(() => {
    if (!activeCycle) return []
    return buildCycleTimeline({
      cycle: {
        startDate: activeCycle.startDate,
        endDate: activeCycle.endDate,
        totalBudgetCents: activeCycle.totalBudgetCents,
      },
      expenses,
      today,
    })
  }, [activeCycle, expenses, today])

  // 3. Lazy backfill and re-seal policy
  // - Lazy backfill: any day strictly before today without a cycle_days row gets sealed via upsertCycleDays.
  // - Re-seal policy: when expenses on an already-sealed day change, that day and every later closed day are re-sealed.
  // Note: changes to total_budget or end_date do NOT touch existing sealed days.
  useEffect(() => {
    if (!userId || !cycleId || !activeCycle || cycleLoading || expensesLoading || sealedLoading) {
      return
    }

    const currentRequestId = ++syncRequestIdRef.current

    // Build expense fingerprint (sorted list of id, amount, date)
    const expenseFingerprint = expenses
      .map((e) => `${e.id}:${e.amountCents}:${e.expenseDate}`)
      .sort()
      .join('|')

    const isFirstRun = previousExpenseFingerprintRef.current === null
    const expensesChanged = !isFirstRun && previousExpenseFingerprintRef.current !== expenseFingerprint
    previousExpenseFingerprintRef.current = expenseFingerprint

    const sealedDaySet = new Set(sealedDays.map((s) => s.day))
    const sealedDaysMap = new Map(sealedDays.map((s) => [s.day, s]))

    // Find days needing sealing:
    // A) Backfill: any closed day strictly before today that is not sealed yet
    const unsealedClosedDays = fullTimeline.filter(
      (d) => d.date < today && !sealedDaySet.has(d.date)
    )

    // B) Re-seal check: did any expense change on an already-sealed day,
    // or does any sealed day's spentCents disagree with current computed spent?
    let earliestInvalidDate: string | null = null
    if (expensesChanged || isFirstRun) {
      for (const d of fullTimeline) {
        if (d.date >= today) continue
        const sealed = sealedDaysMap.get(d.date)
        if (sealed && sealed.spentCents !== d.spentCents) {
          if (!earliestInvalidDate || d.date < earliestInvalidDate) {
            earliestInvalidDate = d.date
          }
        }
      }
    }

    let daysToSeal: DayResult[] = []

    if (earliestInvalidDate) {
      // Re-seal: that day and every later closed day strictly before today
      const invalidThreshold = earliestInvalidDate
      daysToSeal = fullTimeline.filter((d) => d.date >= invalidThreshold && d.date < today)
    } else if (unsealedClosedDays.length > 0) {
      // Backfill only missing days
      daysToSeal = unsealedClosedDays
    }

    if (daysToSeal.length === 0) {
      return
    }

    // Perform upsert
    const payload: CreateCycleDayParams[] = daysToSeal.map((d) => ({
      cycle_id: cycleId,
      day: d.date,
      allowance_cents: d.allowanceCents,
      spent_cents: d.spentCents,
    }))

    upsertCycleDaysInfra(userId, payload)
      .then((saved) => {
        if (isMountedRef.current && currentRequestId === syncRequestIdRef.current) {
          // Merge saved into sealedDays state
          setSealedDays((prev) => {
            const map = new Map(prev.map((s) => [s.day, s]))
            for (const s of saved) {
              map.set(s.day, s)
            }
            return Array.from(map.values()).sort((a, b) => a.day.localeCompare(b.day))
          })
        }
      })
      .catch((err) => {
        if (isMountedRef.current && currentRequestId === syncRequestIdRef.current) {
          console.error('Error sealing cycle days:', err)
          setSealedError(err instanceof Error ? err : new Error(String(err)))
        }
      })
  }, [
    userId,
    cycleId,
    activeCycle,
    cycleLoading,
    expensesLoading,
    sealedLoading,
    expenses,
    fullTimeline,
    sealedDays,
    today,
  ])

  // 4. Merge sealed rows with live today & future
  const mergedDays = useMemo<DayResult[]>(() => {
    if (!activeCycle) return []
    const sealedMap = new Map(sealedDays.map((s) => [s.day, s]))

    return fullTimeline.map((computed) => {
      // Closed days strictly before today: prefer sealed snapshot if available
      if (computed.date < today) {
        const sealed = sealedMap.get(computed.date)
        if (sealed) {
          const savedCents = sealed.savedCents ?? (sealed.allowanceCents - sealed.spentCents)
          const status = classifyClosedDay(sealed.spentCents, sealed.allowanceCents)

          return {
            date: sealed.day,
            allowanceCents: sealed.allowanceCents,
            spentCents: sealed.spentCents,
            savedCents,
            status,
          }
        }
      }

      // Today or future or not-yet-sealed: use computed live
      return computed
    })
  }, [activeCycle, fullTimeline, sealedDays, today])

  // Metrics derived from mergedDays
  const currentStr = useMemo(() => currentStreak(mergedDays), [mergedDays])
  const bestStr = useMemo(() => bestStreak(mergedDays), [mergedDays])
  const achieved = useMemo(() => daysAchieved(mergedDays), [mergedDays])
  const totalSavings = useMemo(() => {
    if (!activeCycle) return 0
    return realSavingsCents(
      { totalBudgetCents: activeCycle.totalBudgetCents },
      expenses
    )
  }, [activeCycle, expenses])

  const combinedLoading = cycleLoading || expensesLoading || sealedLoading
  const combinedError = cycleError || expensesError || sealedError

  return {
    days: mergedDays,
    currentStreak: currentStr,
    bestStreak: bestStr,
    daysAchieved: achieved,
    realSavingsCents: totalSavings,
    activeCycle,
    expenses,
    loading: combinedLoading,
    error: combinedError,
    refreshTimeline: fetchSealedDays,
  }
}
