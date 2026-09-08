import React from 'react'
import { formatArs } from '../format.ts'
import { remainingTodayCents, type PaceStatus } from '../../domain/budget.ts'

export interface DailyAllowanceCardProps {
  dailyAllowanceCents: number
  paceStatus: PaceStatus
  todaySpentCents: number
}

export const DailyAllowanceCard: React.FC<DailyAllowanceCardProps> = ({
  dailyAllowanceCents,
  paceStatus,
  todaySpentCents,
}) => {
  const remainingToday = remainingTodayCents(dailyAllowanceCents, todaySpentCents)
  const isOverspent = remainingToday < 0
  const hasSpentToday = todaySpentCents > 0

  return (
    <section className="w-full bg-[#131B2E] border border-[#1E293B] rounded-[24px] p-5 mb-4 shadow-sm">
      <div className="text-[11px] font-bold text-[#60A5FA] tracking-wider leading-[14px]">
        Te quedan por gastar hoy
      </div>
      <div className="flex items-baseline justify-between my-3">
        <div
          className={`text-[42px] font-bold leading-[51px] ${
            isOverspent ? 'text-[#EF4444]' : 'text-[#FFFFFF]'
          }`}
        >
          {formatArs(remainingToday)}
        </div>
        {/*
          The grey figure is the day's own allowance and is always present. Without it the
          headline becomes unreadable once spending starts: someone seeing "$ 14.583" has no
          way to tell whether the day began at 21k or at 15k. It used to show the cycle
          budget, which answered a question the daily card was never asking.
        */}
        <div className="flex flex-col items-end text-[14px] font-normal leading-[18px]">
          {hasSpentToday && (
            <span className="text-[#EF4444] font-medium">
              {formatArs(-todaySpentCents)}
            </span>
          )}
          <span className="text-[#94A3B8]">de {formatArs(dailyAllowanceCents)}</span>
        </div>
      </div>

      {paceStatus === 'on-track' ? (
        <div className="inline-flex items-center bg-[#064E3B] px-3 py-1.5 rounded-[14px] h-[28px]">
          <span className="text-[11px] font-medium leading-[14px] text-[#34D399]">
            ✓ Dentro del ritmo planeado
          </span>
        </div>
      ) : (
        <div className="inline-flex items-center bg-[#451A03] px-3 py-1.5 rounded-[14px] h-[28px]">
          <span className="text-[11px] font-medium leading-[14px] text-[#F59E0B]">
            ⚠️ Superaste el límite sugerido hoy
          </span>
        </div>
      )}
    </section>
  )
}
