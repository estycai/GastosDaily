import React, { useState } from 'react'
import { formatArs } from '../format.ts'
import { projectAllowanceAfter } from '../../domain/budget.ts'
import type { CalcMode } from '../../domain/budget.ts'
import { CATEGORIES } from '../../domain/categories.ts'

export interface RegisterExpenseProps {
  currentDailyAllowanceCents: number
  cycleDaysRemaining: number
  totalBudgetCents: number
  cycleSpentCents: number
  calcMode: CalcMode
  totalCycleDays: number
  onClose: () => void
  onConfirmExpense: (expense: {
    amountCents: number
    concept: string
    category: string
  }) => Promise<void>
}

export const RegisterExpense: React.FC<RegisterExpenseProps> = ({
  currentDailyAllowanceCents,
  cycleDaysRemaining,
  totalBudgetCents,
  cycleSpentCents,
  calcMode,
  totalCycleDays,
  onClose,
  onConfirmExpense,
}) => {
  const [amountStr, setAmountStr] = useState<string>('0')
  const [concept, setConcept] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const parsedAmountPesos = parseInt(amountStr || '0', 10) || 0
  const expenseAmountCents = parsedAmountPesos * 100

  const remainingTodayCents = currentDailyAllowanceCents - expenseAmountCents
  const remainingTodayText = remainingTodayCents >= 0
    ? `Te quedarían ${formatArs(remainingTodayCents)} para hoy`
    : `Superarías tu límite diario por ${formatArs(Math.abs(remainingTodayCents))}`

  const futureDays = Math.max(0, cycleDaysRemaining - 1)
  const projectedAllowanceCents = projectAllowanceAfter({
    currentDailyAllowanceCents,
    daysRemaining: cycleDaysRemaining,
    totalBudgetCents,
    cycleSpentCents,
    calcMode,
    additionalExpenseCents: expenseAmountCents,
    totalCycleDays,
  })

  const handleDigit = (digit: string) => {
    if (amountStr === '0' && digit === '0') return
    if (amountStr === '0') {
      setAmountStr(digit)
      return
    }
    if (amountStr.length >= 8) return
    setAmountStr((prev) => prev + digit)
  }

  const handleBackspace = () => {
    if (amountStr.length <= 1) {
      setAmountStr('0')
    } else {
      setAmountStr((prev) => prev.slice(0, -1))
    }
  }

  const handleConfirm = async () => {
    if (expenseAmountCents <= 0 || isSubmitting) return
    const chosenCat = CATEGORIES.find((c) => c.id === selectedCategory)
    const catId = chosenCat?.id || 'varios'
    const fallbackConcept = chosenCat?.label || 'Varios'

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onConfirmExpense({
        amountCents: expenseAmountCents,
        concept: concept.trim() || fallbackConcept,
        category: catId,
      })
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo registrar el gasto. Intentá nuevamente.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] px-5 pt-3 pb-8 text-[#F8FAFC]">
      {/* Status Bar */}
      <div className="flex justify-between items-center w-full text-[14px] text-[#FFFFFF] font-bold mb-4 px-3">
        <span>9:41</span>
        <span className="text-[12px] font-normal text-[#94A3B8]">100%</span>
      </div>

      {/* Screen Header */}
      <header className="flex justify-between items-center w-full mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
            NUEVO MOVIMIENTO
          </div>
          <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
            Registrar Gasto
          </h1>
        </div>

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="w-9 h-9 bg-[#1E293B] hover:bg-[#334155] rounded-full flex items-center justify-center text-[#94A3B8] text-[16px] cursor-pointer transition-colors"
        >
          ✕
        </button>
      </header>

      {/* Hero Display: MONTO A REGISTRAR */}
      <section className="w-full bg-[#131B2E] border border-[#1E293B] rounded-[24px] p-5 mb-5 flex flex-col items-center justify-center">
        <span className="text-[11px] font-bold text-[#60A5FA] tracking-wider leading-[14px] mb-2">
          MONTO A REGISTRAR
        </span>
        <span className="text-[46px] font-bold text-[#FFFFFF] leading-[56px] my-1 text-center">
          {formatArs(expenseAmountCents)}
        </span>
        <span
          className={`text-[11px] font-medium leading-[14px] mt-2 ${
            remainingTodayCents >= 0 ? 'text-[#34D399]' : 'text-[#EF4444]'
          }`}
        >
          {remainingTodayText}
        </span>
      </section>

      {/* Concept / Detail input */}
      <section className="w-full mb-4">
        <label
          htmlFor="concept-input"
          className="block text-[12px] font-medium leading-[15px] text-[#94A3B8] mb-2"
        >
          Concepto / Detalle
        </label>
        <div className="w-full h-[50px] bg-[#111827] border border-[#1E293B] rounded-[16px] px-4 flex items-center focus-within:border-[#2563EB]">
          <input
            id="concept-input"
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Ej. Café con tostadas"
            className="w-full bg-transparent border-none outline-none text-[#F8FAFC] text-[15px] placeholder-[#64748B]"
          />
        </div>
      </section>

      {/* Quick Category Chips */}
      <section className="w-full mb-4">
        <span className="block text-[12px] font-medium leading-[15px] text-[#94A3B8] mb-2">
          Categoría rápida
        </span>
        <div className="grid grid-cols-4 gap-2 w-full">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
                className={`h-[38px] rounded-[12px] flex items-center justify-center px-2 cursor-pointer transition-colors text-[12px] whitespace-nowrap ${
                  isSelected
                    ? 'bg-[#2563EB] text-[#FFFFFF] font-bold'
                    : 'bg-[#111827] border border-[#1E293B] text-[#94A3B8] font-normal hover:bg-[#1E293B]'
                }`}
              >
                {cat.emoji} {cat.label}
              </button>
            )
          })}
        </div>
      </section>

      {/* Impact Simulator Card */}
      <section className="w-full bg-[#0B1528] border border-[#1D4ED8] rounded-[20px] p-4 mb-4">
        <div className="text-[11px] font-bold text-[#60A5FA] tracking-wider leading-[14px] mb-2">
          ⚡ IMPACTO EN TU PRESUPUESTO
        </div>
        <div className="text-[13px] leading-[16px] text-[#94A3B8] mb-2">
          Nuevo diario sugerido ({futureDays} días rest.):
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-[18px] font-bold leading-[22px] text-[#F8FAFC]">
            {formatArs(projectedAllowanceCents)} / día
          </span>
          <span
            className={`text-[11px] font-medium leading-[14px] ${
              projectedAllowanceCents > 0 ? 'text-[#34D399]' : 'text-[#EF4444]'
            }`}
          >
            {projectedAllowanceCents > 0 ? '✓ Límite saludable' : '⚠️ Límite agotado'}
          </span>
        </div>
      </section>

      {/* Touch Numpad */}
      <section className="w-full bg-[#111827] border border-[#1E293B] rounded-[20px] p-3 mb-4">
        <div className="grid grid-cols-3 gap-2 text-center select-none">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-12 flex items-center justify-center text-[20px] font-bold text-[#F8FAFC] rounded-xl hover:bg-[#1E293B] active:bg-[#334155] cursor-pointer transition-colors"
            >
              {digit}
            </button>
          ))}
          <div className="h-12 flex items-center justify-center text-[20px] font-bold text-[#64748B]">
            •
          </div>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-12 flex items-center justify-center text-[20px] font-bold text-[#F8FAFC] rounded-xl hover:bg-[#1E293B] active:bg-[#334155] cursor-pointer transition-colors"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Borrar dígito"
            className="h-12 flex items-center justify-center text-[20px] font-normal text-[#EF4444] rounded-xl hover:bg-[#1E293B] active:bg-[#334155] cursor-pointer transition-colors"
          >
            ⌫
          </button>
        </div>
      </section>

      {submitError && (
        <div className="w-full bg-[#450A0A] border border-[#EF4444]/40 rounded-[14px] p-3 mb-3 text-center">
          <p className="text-[12px] text-[#EF4444] font-medium">{submitError}</p>
        </div>
      )}

      {/* Confirm CTA */}
      <button
        type="button"
        disabled={expenseAmountCents <= 0 || isSubmitting}
        onClick={handleConfirm}
        className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#FFFFFF] text-[15px] font-bold rounded-[16px] flex items-center justify-center cursor-pointer transition-all shadow-md"
      >
        {isSubmitting ? 'REGISTRANDO...' : 'CONFIRMAR GASTO'}
      </button>
    </div>
  )
}