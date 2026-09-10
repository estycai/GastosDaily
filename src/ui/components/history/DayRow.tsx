import React from 'react'
import type { DayResult } from '../../../domain/cycleTimeline.ts'
import type { ExpenseEntity } from '../../../infrastructure/supabase/expensesRepository.ts'
import { CATEGORY_MAP, DEFAULT_CATEGORY } from '../../../domain/categories.ts'
import { formatArs } from '../../format.ts'
import { formatFriendlyDate } from '../../../application/dateUtils.ts'

export interface DayRowProps {
  day: DayResult
  expenses: ExpenseEntity[]
  isExpanded: boolean
  onToggle: () => void
}

function getDayOfWeekShort(dateStr: string): string {
  const parts = dateStr.split('-').map(Number)
  if (parts.length < 3) return ''
  const [y, m, d] = parts
  const jsDay = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
  return days[jsDay] ?? ''
}

function formatExpenseTime(createdAtIso: string): string {
  try {
    const d = new Date(createdAtIso)
    const timeFormatter = new Intl.DateTimeFormat('es-AR', {
      timeZone: 'America/Argentina/Buenos_Aires',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    return timeFormatter.format(d)
  } catch {
    return ''
  }
}

export const DayRow: React.FC<DayRowProps> = ({
  day,
  expenses,
  isExpanded,
  onToggle,
}) => {
  const isToday = day.status === 'today'
  const dayNameShort = getDayOfWeekShort(day.date)
  const friendlyDate = formatFriendlyDate(day.date).toLowerCase()
  const dateTitle = isToday ? ("Hoy · " + dayNameShort + " " + friendlyDate) : (dayNameShort + " " + friendlyDate)

  const expenseCount = expenses.length
  const expenseCountLabel = expenseCount + (expenseCount === 1 ? ' gasto' : ' gastos')
  const countSummary = formatArs(day.spentCents) + " de " + formatArs(day.allowanceCents) + " · " + expenseCountLabel

  // Status dot & verdict configuration
  let dotBg = 'bg-[#1E293B]'
  let dotInner = 'bg-[#64748B]'
  let cardBorder = 'border-[#1E293B]'

  if (isToday) {
    dotBg = 'bg-[#172554]'
    dotInner = 'bg-[#3B82F6]'
    cardBorder = 'border-[#3B82F6]'
  } else if (day.status === 'saved') {
    dotBg = 'bg-[#064E3B]'
    dotInner = 'bg-[#34D399]'
  } else if (day.status === 'over') {
    dotBg = 'bg-[#450A0A]'
    dotInner = 'bg-[#EF4444]'
  }

  return (
    <article
      className={"w-full bg-[#131B2E] border rounded-[20px] transition-colors " + cardBorder}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        className="w-full p-4 flex items-center justify-between text-left cursor-pointer select-none"
      >
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Status Dot */}
          <div className={"w-9 h-9 rounded-full flex items-center justify-center shrink-0 " + dotBg}>
            <div className={"w-3 h-3 rounded-full " + dotInner} />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-[#F8FAFC] leading-[19px] capitalize">
                {dateTitle}
              </span>
              {isToday && (
                <span className="bg-[#1E3A8A] text-[#60A5FA] text-[10px] font-bold px-1.5 py-0.5 rounded-[6px] leading-[12px] tracking-wider uppercase">
                  EN CURSO
                </span>
              )}
            </div>
            <span className="text-[12px] text-[#64748B] leading-[15px] mt-0.5">
              {countSummary}
            </span>
          </div>
        </div>

        {/* Right-hand verdict */}
        <div className="flex flex-col items-end shrink-0 pl-2">
          {isToday ? (
            <>
              <span className="text-[15px] font-bold text-[#38BDF8] leading-[19px]">
                {formatArs(Math.max(0, day.allowanceCents - day.spentCents))}
              </span>
              <span className="text-[11px] text-[#64748B] leading-[14px]">
                te queda
              </span>
            </>
          ) : day.status === 'saved' ? (
            <>
              <span className="text-[15px] font-bold text-[#34D399] leading-[19px]">
                + {formatArs(day.savedCents)}
              </span>
              <span className="text-[11px] text-[#64748B] leading-[14px]">
                te sobró
              </span>
            </>
          ) : (
            <>
              <span className="text-[15px] font-bold text-[#EF4444] leading-[19px]">
                - {formatArs(Math.abs(day.savedCents))}
              </span>
              <span className="text-[11px] text-[#64748B] leading-[14px]">
                te pasaste
              </span>
            </>
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4">
          <div className="h-px bg-[#1E293B] w-full mb-3" />

          {expenses.length === 0 ? (
            <div className="text-[12px] text-[#64748B] py-2 text-center">
              Sin gastos registrados en este día.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {expenses.map((exp) => {
                const cat = CATEGORY_MAP[exp.category] || DEFAULT_CATEGORY
                const timeStr = formatExpenseTime(exp.createdAt)
                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between py-1 text-[13px]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {/* Category Dot */}
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.bg === '#1E1B4B' ? '#F59E0B' : cat.bg === '#064E3B' ? '#34D399' : '#38BDF8' }}
                      />
                      <span className="text-[#F8FAFC] truncate">
                        {exp.concept || cat.label}
                      </span>
                      {timeStr && (
                        <span className="text-[#64748B] text-[11px] shrink-0">
                          {timeStr}
                        </span>
                      )}
                    </div>
                    <span className="text-[#F8FAFC] font-medium shrink-0 ml-2">
                      {formatArs(exp.amountCents)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Sealed footnote - Today never shows that footnote */}
          {!isToday && (
            <div className="mt-3.5 pt-2 text-[11px] text-[#475569] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#475569]" />
              <span>
                Día cerrado · límite sellado el {friendlyDate} 00:00
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
