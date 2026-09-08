import React from 'react'
import { formatArs } from '../format.ts'

export interface ExpenseItem {
  id: string
  concept: string
  amountCents: number
  categoryEmoji: string
  iconBgColor?: string
  dateLabel: string
}

export interface TodayExpensesFeedProps {
  todayExpenses: ExpenseItem[]
  todayDateLabel: string
  todayTotalSpentCents: number
  onDeleteExpense: (expenseId: string) => Promise<void>
}

export const TodayExpensesFeed: React.FC<TodayExpensesFeedProps> = ({
  todayExpenses,
  todayDateLabel,
  todayTotalSpentCents,
  onDeleteExpense: _onDeleteExpense,
}) => {
  return (
    <section className="w-full">
      <div className="flex justify-between items-center mb-3">
        <span className="text-[13px] font-bold leading-[16px] text-[#94A3B8]">
          Gastos de hoy ({todayDateLabel})
        </span>
        <span className="text-[12px] leading-[15px] text-[#64748B]">
          Total: {formatArs(-todayTotalSpentCents)}
        </span>
      </div>

      {todayExpenses.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-[16px] p-6 text-center text-[#64748B] text-[13px]">
          No registraste gastos hoy todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {todayExpenses.map((expense) => (
            <div
              key={expense.id}
              className="w-full h-[64px] bg-[#111827] border border-[#1E293B] rounded-[16px] px-3.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0 text-[18px]"
                  style={{
                    backgroundColor: expense.iconBgColor || '#1E1B4B',
                  }}
                >
                  <span>{expense.categoryEmoji}</span>
                </div>

                <div className="flex flex-col justify-center">
                  <span className="text-[14px] font-normal leading-[17px] text-[#F8FAFC] line-clamp-1">
                    {expense.concept}
                  </span>
                  <span className="text-[11px] leading-[14px] text-[#64748B]">
                    {expense.dateLabel}
                  </span>
                </div>
              </div>

              <span className="text-[15px] font-bold leading-[18px] text-[#EF4444] shrink-0">
                {formatArs(-expense.amountCents)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
