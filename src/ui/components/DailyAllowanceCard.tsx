import React from 'react'
import { formatArs } from '../format.ts'
import { remainingTodayCents, type PaceStatus } from '../../domain/budget.ts'

export interface DailyAllowanceCardProps {
  dailyAllowanceCents: number
  totalBudgetCents: number
  paceStatus: PaceStatus
  todaySpentCents: number
}

export const DailyAllowanceCard: React.FC<DailyAllowanceCardProps> = ({
  dailyAllowanceCents,
  totalBudgetCents,
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
        <div className="text-[14px] font-normal leading-[18px]">
          {hasSpentToday ? (
            <span className="text-[#EF4444] font-medium">
              {formatArs(-todaySpentCents)}
            </span>
          ) : (
            <span className="text-[#94A3B8]">
              de {formatArs(totalBudgetCents)}
            </span>
          )}
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
