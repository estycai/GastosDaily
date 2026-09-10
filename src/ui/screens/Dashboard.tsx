import React from 'react'
import { formatArs } from '../format.ts'
import type { PaceStatus } from '../../domain/budget.ts'
import { DailyAllowanceCard } from '../components/DailyAllowanceCard.tsx'
import { TodayExpensesFeed, type ExpenseItem } from '../components/TodayExpensesFeed.tsx'

export type { ExpenseItem }

export interface DashboardProps {
  dailyAllowanceCents: number
  paceStatus: PaceStatus
  cycleDaysRemaining: number
  cycleClosingDateLabel: string
  cycleRemainingCents: number
  totalBudgetCents: number
  periodSpentPercent: number
  todayExpenses: ExpenseItem[]
  todayTotalSpentCents: number
  todayDateLabel: string
  todaySpentCents: number
  onDeleteExpense: (expenseId: string) => Promise<void>
  onOpenRegisterExpense: () => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  dailyAllowanceCents,
  paceStatus,
  cycleDaysRemaining,
  cycleClosingDateLabel,
  cycleRemainingCents,
  totalBudgetCents,
  periodSpentPercent,
  todayExpenses,
  todayTotalSpentCents,
  todayDateLabel,
  todaySpentCents,
  onDeleteExpense,
  onOpenRegisterExpense,
}) => {
  const progressClamped = Math.max(0, Math.min(100, periodSpentPercent))

  let progressColor = '#34D399'
  let progressTextColor = '#34D399'
  if (progressClamped >= 80) {
    progressColor = '#EF4444'
    progressTextColor = '#EF4444'
  } else if (progressClamped >= 50) {
    progressColor = '#F59E0B'
    progressTextColor = '#F59E0B'
  }

  return (
    <div className="flex flex-col w-full px-5 pt-6 pb-[calc(6rem+var(--safe-bottom))] text-[#F8FAFC]">
      {/* Screen Header */}
      <header className="flex justify-between items-center w-full mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
            CICLO EN CURSO
          </div>
          <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
            Gastos Daily
          </h1>
        </div>

        <div className="flex items-center gap-2 bg-[#1E293B] px-3 py-1.5 rounded-[15px] h-[30px]">
          <div className="w-2 h-2 rounded-full bg-[#10B981] shrink-0" />
          <span className="text-[12px] font-medium leading-[15px] text-[#38BDF8]">
            Cierra en {cycleDaysRemaining} d
          </span>
        </div>
      </header>

      {/* Hero Card: what is left to spend today */}
      <DailyAllowanceCard
        dailyAllowanceCents={dailyAllowanceCents}
        paceStatus={paceStatus}
        todaySpentCents={todaySpentCents}
      />

      {/* KPI Cards: Dias Restantes & Disponible Total */}
      <section className="grid grid-cols-2 gap-3 w-full mb-4">
        {/* Card Días Restantes */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-[18px] p-3.5 h-[84px] flex flex-col justify-between">
          <span className="text-[11px] leading-[14px] text-[#64748B]">
            Días Restantes
          </span>
          <span className="text-[20px] font-bold leading-[24px] text-[#F1F5F9]">
            {cycleDaysRemaining} días
          </span>
          <span className="text-[10px] leading-[12px] text-[#475569]">
            Cierre: {cycleClosingDateLabel}
          </span>
        </div>

        {/* Card Disponible Total */}
        <div className="bg-[#111827] border border-[#1E293B] rounded-[18px] p-3.5 h-[84px] flex flex-col justify-between">
          <span className="text-[11px] leading-[14px] text-[#64748B]">
            Disponible Total
          </span>
          <span className="text-[20px] font-bold leading-[24px] text-[#F1F5F9]">
            {formatArs(cycleRemainingCents)}
          </span>
          <span className="text-[10px] leading-[12px] text-[#475569]">
            de {formatArs(totalBudgetCents)} límite
          </span>
        </div>
      </section>

      {/* Progress Bar Card: Consumo del Periodo */}
      <section className="w-full bg-[#111827] border border-[#1E293B] rounded-[18px] p-4 mb-4">
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-[12px] font-medium leading-[15px] text-[#94A3B8]">
            Consumo del Periodo
          </span>
          <span
            className="text-[12px] font-bold leading-[15px]"
            style={{ color: progressTextColor }}
          >
            {Math.round(progressClamped)}% usado
          </span>
        </div>

        <div className="w-full h-2 bg-[#1F2937] rounded-[4px] overflow-hidden">
          <div
            className="h-full rounded-[4px] transition-all duration-300"
            style={{
              width: `${progressClamped}%`,
              backgroundColor: progressColor,
            }}
          />
        </div>
      </section>

      {/* Primary CTA: + REGISTRAR GASTO HOY */}
      <button
        type="button"
        onClick={onOpenRegisterExpense}
        className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-[#FFFFFF] text-[15px] font-bold rounded-[16px] flex items-center justify-center cursor-pointer transition-all shadow-md mb-6"
      >
        + REGISTRAR GASTO HOY
      </button>

      {/* Expense Feed */}
      <TodayExpensesFeed
        todayExpenses={todayExpenses}
        todayDateLabel={todayDateLabel}
        todayTotalSpentCents={todayTotalSpentCents}
        onDeleteExpense={onDeleteExpense}
      />
    </div>
  )
}
