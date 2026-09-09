import React from 'react'
import type { DayResult } from '../../../domain/cycleTimeline.ts'

export interface CycleHeatmapProps {
  days: DayResult[]
  monthLabel: string
  achievedLabel: string
  onSelectDay: (date: string) => void
}

const WEEKDAYS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export const CycleHeatmap: React.FC<CycleHeatmapProps> = ({
  days,
  monthLabel,
  achievedLabel,
  onSelectDay,
}) => {
  // Pad grid with leading empty cells if cycle starts on weekday other than Monday (ISO weekday 1)
  const leadingOffset = React.useMemo(() => {
    if (days.length === 0) return 0
    const firstDateStr = days[0].date
    const parts = firstDateStr.split('-').map(Number)
    if (parts.length < 3) return 0
    const [y, m, d] = parts
    const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
    // getUTCDay: 0=Sun, 1=Mon, ..., 6=Sat.
    // L M M J V S D -> Monday is index 0, Sunday is index 6.
    return (jsDay + 6) % 7
  }, [days])

  return (
    <section className="w-full bg-[#131B2E] border border-[#1E293B] rounded-[24px] p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#60A5FA] leading-[14px]">
          {monthLabel}
        </span>
        <span className="text-[12px] text-[#94A3B8] leading-[15px]">
          {achievedLabel}
        </span>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 gap-2 mb-2">
        {WEEKDAYS.map((wd, idx) => (
          <div
            key={idx}
            className="text-center text-[11px] font-medium text-[#64748B] leading-[14px]"
          >
            {wd}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: leadingOffset }).map((_, i) => (
          <div key={"offset-" + i} className="aspect-square" />
        ))}

        {days.map((day) => {
          const dayNum = parseInt(day.date.slice(8), 10)
          const isToday = day.status === 'today'

          let cellBg = 'bg-[#111827]'
          let cellBorder = 'border border-transparent'
          let cellTextColor = 'text-[#64748B]'
          let statusLabel = 'Sin registro'

          if (isToday) {
            // Today's cell gets a blue border and NO verdict color
            cellBg = 'bg-[#172554]'
            cellBorder = 'border-2 border-[#3B82F6]'
            cellTextColor = 'text-[#F8FAFC]'
            statusLabel = 'Hoy'
          } else if (day.status === 'saved') {
            cellBg = 'bg-[#064E3B]'
            cellTextColor = 'text-[#34D399]'
            statusLabel = 'Bajo el límite'
          } else if (day.status === 'over') {
            cellBg = 'bg-[#450A0A]'
            cellTextColor = 'text-[#EF4444]'
            statusLabel = 'Pasado'
          } else if (day.status === 'no-record') {
            cellBg = 'bg-[#1E293B]'
            cellTextColor = 'text-[#64748B]'
            statusLabel = 'Sin registro'
          } else if (day.status === 'future') {
            cellBg = 'bg-[#111827]/40'
            cellTextColor = 'text-[#475569]'
            statusLabel = 'Futuro'
          }

          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelectDay(day.date)}
              aria-label={day.date + ': ' + statusLabel}
              className={"aspect-square rounded-[10px] flex items-center justify-center text-[12px] font-medium cursor-pointer transition-transform active:scale-95 " + cellBg + " " + cellBorder + " " + cellTextColor}
            >
              {dayNum}
            </button>
          )
        })}
      </div>

      {/* Legend row with four swatches */}
      <div className="flex items-center justify-between text-[11px] text-[#94A3B8] pt-3 border-t border-[#1E293B]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#34D399]" />
          <span>Bajo el límite</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#EF4444]" />
          <span>Pasado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] bg-[#1E293B]" />
          <span>Sin registro</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-[3px] border border-[#3B82F6] bg-[#172554]" />
          <span>Hoy</span>
        </div>
      </div>
    </section>
  )
}
