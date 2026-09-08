import React, { useState } from 'react'
import { Trash2, AlertTriangle } from 'lucide-react'
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
  onDeleteExpense,
}) => {
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseItem | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleConfirmDelete = async () => {
    if (!expenseToDelete || deletingId) return
    const id = expenseToDelete.id
    setDeletingId(id)
    setErrorMessage(null)

    try {
      await onDeleteExpense(id)
      setExpenseToDelete(null)
    } catch (_err) {
      setErrorMessage(
        `No se pudo eliminar "${expenseToDelete.concept}". Por favor, intentá nuevamente.`
      )
    } finally {
      setDeletingId(null)
    }
  }

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

      {errorMessage && (
        <div
          role="alert"
          className="mb-3 p-3 bg-[#450A0A] border border-[#EF4444]/40 rounded-[14px] flex items-center justify-between text-[#EF4444] text-[13px]"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#94A3B8] hover:text-[#FFFFFF] p-1 text-[12px] cursor-pointer"
            aria-label="Cerrar mensaje de error"
          >
            ✕
          </button>
        </div>
      )}

      {todayExpenses.length === 0 ? (
        <div className="bg-[#111827] border border-[#1E293B] rounded-[16px] p-6 text-center text-[#64748B] text-[13px]">
          No registraste gastos hoy todavía.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {todayExpenses.map((expense) => {
            const isDeleting = deletingId === expense.id
            return (
              <div
                key={expense.id}
                className="w-full min-h-[64px] bg-[#111827] border border-[#1E293B] rounded-[16px] px-3.5 py-2.5 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className="w-[38px] h-[38px] rounded-[12px] flex items-center justify-center shrink-0 text-[18px]"
                    style={{
                      backgroundColor: expense.iconBgColor || '#1E1B4B',
                    }}
                  >
                    <span>{expense.categoryEmoji}</span>
                  </div>

                  <div className="flex flex-col justify-center min-w-0">
                    <span className="text-[14px] font-normal leading-[17px] text-[#F8FAFC] truncate">
                      {expense.concept}
                    </span>
                    <span className="text-[11px] leading-[14px] text-[#64748B]">
                      {expense.dateLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[15px] font-bold leading-[18px] text-[#EF4444]">
                    {formatArs(-expense.amountCents)}
                  </span>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setErrorMessage(null)
                      setExpenseToDelete(expense)
                    }}
                    aria-label={`Eliminar gasto ${expense.concept}`}
                    className="w-[44px] h-[44px] flex items-center justify-center rounded-[12px] text-[#64748B] hover:text-[#EF4444] hover:bg-[#1E293B]/60 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    {isDeleting ? (
                      <span className="inline-block w-4 h-4 border-2 border-[#EF4444] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 size={16} />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      {expenseToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-xs"
        >
          <div className="w-full max-w-[340px] bg-[#111827] border border-[#1E293B] rounded-[24px] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2.5 text-[#EF4444] mb-3">
              <div className="w-9 h-9 rounded-[12px] bg-[#450A0A] border border-[#EF4444]/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} />
              </div>
              <h2
                id="confirm-delete-title"
                className="text-[16px] font-bold text-[#F8FAFC] leading-[20px]"
              >
                ¿Eliminar gasto?
              </h2>
            </div>

            <p className="text-[13px] text-[#94A3B8] leading-[18px] mb-5">
              ¿Estás seguro de que querés eliminar <strong className="text-[#F8FAFC] font-semibold">"{expenseToDelete.concept}"</strong> ({formatArs(expenseToDelete.amountCents)})? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2.5">
              <button
                type="button"
                disabled={deletingId === expenseToDelete.id}
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 h-[44px] bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] text-[13px] font-semibold rounded-[14px] cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deletingId === expenseToDelete.id}
                onClick={handleConfirmDelete}
                className="flex-1 h-[44px] bg-[#EF4444] hover:bg-[#DC2626] active:scale-[0.98] disabled:opacity-50 text-[#FFFFFF] text-[13px] font-bold rounded-[14px] cursor-pointer transition-colors flex items-center justify-center gap-2"
              >
                {deletingId === expenseToDelete.id ? (
                  <>
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  'Eliminar'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
