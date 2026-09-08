import React from 'react'
import { formatArs } from '../format.ts'
import type { PaceStatus } from '../../domain/budget.ts'

export interface DailyAllowanceCardProps {
  dailyAllowanceCents: number
  totalBudgetCents: number
  paceStatus: PaceStatus
  todaySpentCents: number
}

export const DailyAllowanceCard: React.FC<DailyAllowanceCardProps> = ({
  dailyAllowanceCents,
  totalBudgetCents: _totalBudgetCents,
  paceStatus,
  todaySpentCents: _todaySpentCents,
}) => {
  return (
    <section className="w-full bg-[#131B2E] border border-[#1E293B] rounded-[24px] p-5 mb-4 shadow-sm">
      <div className="text-[11px] font-bold text-[#60A5FA] tracking-wider leading-[14px]">
        PODÉS GASTAR HOY
      </div>
      <div className="text-[42px] font-bold text-[#FFFFFF] leading-[51px] my-3">
        {formatArs(dailyAllowanceCents)}
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
