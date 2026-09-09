import React, { useState, useMemo } from 'react'
import { useCycleTimeline } from '../../application/useCycleTimeline.ts'
import { StreakCard } from '../components/history/StreakCard.tsx'
import { CycleHeatmap } from '../components/history/CycleHeatmap.tsx'
import { HistoryTiles } from '../components/history/HistoryTiles.tsx'
import { DayRow } from '../components/history/DayRow.tsx'
import { formatFriendlyDate } from '../../application/dateUtils.ts'

export interface HistoryProps {
  userId: string | null
}

export const History: React.FC<HistoryProps> = ({ userId }) => {
  const {
    days,
    currentStreak,
    bestStreak,
    daysAchieved: achievedData,
    realSavingsCents,
    activeCycle,
    expenses,
    loading,
    error,
    refreshTimeline,
  } = useCycleTimeline(userId)

  const [expandedDay, setExpandedDay] = useState<string | null>(null)

  // Pre-group expenses by date for fast O(1) lookup per day without extra network calls
  const expensesByDate = useMemo(() => {
    const map = new Map<string, typeof expenses>()
    for (const exp of expenses) {
      const list = map.get(exp.expenseDate) ?? []
      list.push(exp)
      map.set(exp.expenseDate, list)
    }
    return map
  }, [expenses])

  // Heatmap headers
  const monthLabel = useMemo(() => {
    if (!activeCycle) return 'CICLO'
    const startFriendly = formatFriendlyDate(activeCycle.startDate)
    const endFriendly = formatFriendlyDate(activeCycle.endDate)
    return `${startFriendly} - ${endFriendly}`.toUpperCase()
  }, [activeCycle])

  const achievedLabel = useMemo(() => {
    return `${achievedData.achieved} de ${achievedData.closed} días logrados`
  }, [achievedData])

  // Tiles calculations
  // Average daily spend on closed days with recorded spend (or closed days in general)
  const averageMetrics = useMemo(() => {
    const closedDays = days.filter((d) => d.status !== 'today' && d.status !== 'future')
    if (closedDays.length === 0) {
      const initialLimit = days[0]?.allowanceCents ?? 0
      return { averageDailyCents: 0, averageLimitCents: initialLimit }
    }
    const totalSpent = closedDays.reduce((acc, d) => acc + d.spentCents, 0)
    const totalLimit = closedDays.reduce((acc, d) => acc + d.allowanceCents, 0)
    return {
      averageDailyCents: Math.round(totalSpent / closedDays.length),
      averageLimitCents: Math.round(totalLimit / closedDays.length),
    }
  }, [days])

  /*
    Newest first, closed days and today only. Future days still belong in the heatmap —
    they show how much of the cycle is left — but a row for a day that has not happened
    reads as a real entry with a real limit, and the dynamic allowance makes that limit
    look like a promise ("Jue 1 Oct · $ 341.500"). It is only budget / days-remaining,
    and it will be a different number by the time that day arrives.
  */
  const sortedDays = useMemo(() => {
    return [...days].filter((d) => d.status !== 'future').reverse()
  }, [days])

  const handleSelectDayFromHeatmap = (date: string) => {
    // Future cells have no row to expand; ignore the tap instead of pointing the
    // accordion at a row that does not exist.
    if (!sortedDays.some((d) => d.date === date)) {
      return
    }
    setExpandedDay((prev) => (prev === date ? null : date))
    // Scroll row into view smoothly
    requestAnimationFrame(() => {
      const element = document.getElementById(`day-row-${date}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    })
  }

  if (loading) {
    return (
      <div className="flex flex-col w-full px-5 pt-6 pb-24 text-[#F8FAFC]">
        {/* Screen Header */}
        <header className="flex justify-between items-center w-full mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
              SEGUIMIENTO
            </div>
            <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
              Historial del Ciclo
            </h1>
          </div>
          <div className="w-9 h-9 bg-[#1E293B] rounded-full flex items-center justify-center text-[16px]">
            📅
          </div>
        </header>

        {/* Skeleton Slices */}
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="w-full h-[96px] bg-[#131B2E] border border-[#1E293B] rounded-[24px]" />
          <div className="w-full h-[260px] bg-[#131B2E] border border-[#1E293B] rounded-[24px]" />
          <div className="grid grid-cols-3 gap-2.5 w-full">
            <div className="h-[96px] bg-[#131B2E] border border-[#1E293B] rounded-[18px]" />
            <div className="h-[96px] bg-[#131B2E] border border-[#1E293B] rounded-[18px]" />
            <div className="h-[96px] bg-[#131B2E] border border-[#1E293B] rounded-[18px]" />
          </div>
          <div className="w-full h-[64px] bg-[#131B2E] border border-[#1E293B] rounded-[20px]" />
          <div className="w-full h-[64px] bg-[#131B2E] border border-[#1E293B] rounded-[20px]" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col w-full px-5 pt-6 pb-24 text-[#F8FAFC]">
        <header className="flex justify-between items-center w-full mb-5">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
              SEGUIMIENTO
            </div>
            <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
              Historial del Ciclo
            </h1>
          </div>
          <div className="w-9 h-9 bg-[#1E293B] rounded-full flex items-center justify-center text-[16px]">
            📅
          </div>
        </header>

        <div className="w-full bg-[#111827] border border-[#1E293B] rounded-[24px] p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#450A0A] border border-[#EF4444]/30 flex items-center justify-center mx-auto mb-4 text-[#EF4444] text-[20px]">
            ⚠️
          </div>
          <h2 className="text-[18px] font-bold text-[#FFFFFF] mb-2">
            No pudimos cargar el historial
          </h2>
          <p className="text-[13px] leading-[18px] text-[#94A3B8] mb-5">
            Ocurrió un error al consultar el historial de tu ciclo.
          </p>
          <button
            type="button"
            onClick={refreshTimeline}
            className="w-full h-[48px] bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-[#FFFFFF] text-[14px] font-bold rounded-[14px] flex items-center justify-center cursor-pointer transition-colors shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  const hasClosedDays = achievedData.closed > 0

  return (
    <div className="flex flex-col w-full px-5 pt-6 pb-24 text-[#F8FAFC]">
      {/* Screen Header */}
      <header className="flex justify-between items-center w-full mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
            SEGUIMIENTO
          </div>
          <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
            Historial del Ciclo
          </h1>
        </div>

        <div className="w-9 h-9 bg-[#1E293B] rounded-full flex items-center justify-center text-[16px]">
          📅
        </div>
      </header>

      <div className="flex flex-col gap-4">
        {/* Streak Card */}
        <div>
          <StreakCard currentStreak={currentStreak} bestStreak={bestStreak} />
          {!hasClosedDays && (
            <p className="text-[12px] text-[#64748B] mt-2 px-1 text-center">
              La racha se activará a medida que cierren los primeros días del ciclo.
            </p>
          )}
        </div>

        {/* Heatmap */}
        <CycleHeatmap
          days={days}
          monthLabel={monthLabel}
          achievedLabel={achievedLabel}
          onSelectDay={handleSelectDayFromHeatmap}
        />

        {/* Summary Tiles */}
        <HistoryTiles
          achieved={achievedData.achieved}
          closed={achievedData.closed}
          realSavingsCents={realSavingsCents}
          averageDailyCents={averageMetrics.averageDailyCents}
          averageLimitCents={averageMetrics.averageLimitCents}
        />

        {/* Day-by-day section header */}
        <div className="flex items-center justify-between pt-2 px-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
            DÍA POR DÍA
          </span>
          <span className="text-[11px] text-[#475569] leading-[14px]">
            los días cerrados no cambian
          </span>
        </div>

        {/* Days List (Newest first) */}
        <div className="flex flex-col gap-3">
          {sortedDays.map((day) => {
            const dayExpenses = expensesByDate.get(day.date) ?? []
            const isExpanded = expandedDay === day.date

            return (
              <div key={day.date} id={`day-row-${day.date}`}>
                <DayRow
                  day={day}
                  expenses={dayExpenses}
                  isExpanded={isExpanded}
                  onToggle={() =>
                    setExpandedDay((prev) => (prev === day.date ? null : day.date))
                  }
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
export default History
