import React, { useState } from 'react'
import type { CalcMode } from '../../domain/budget.ts'

export interface SettingsProps {
  initialBudgetCents?: number
  initialClosingDate?: string
  initialCalcMode?: CalcMode
  onSaveSettings: (settings: {
    budgetCents: number
    closingDate: string
    calcMode: CalcMode
  }) => void
}

export const Settings: React.FC<SettingsProps> = ({
  initialBudgetCents = 30000000,
  initialClosingDate = '2026-09-30',
  initialCalcMode = 'dynamic',
  onSaveSettings,
}) => {
  const [budgetPesosStr, setBudgetPesosStr] = useState<string>(
    Math.round(initialBudgetCents / 100).toString()
  )
  const [closingDate, setClosingDate] = useState<string>(initialClosingDate)
  const [calcMode, setCalcMode] = useState<CalcMode>(initialCalcMode)

  const handleBudgetChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '')
    setBudgetPesosStr(sanitized)
  }

  const handleSave = () => {
    const pesos = parseInt(budgetPesosStr || '0', 10) || 0
    onSaveSettings({
      budgetCents: pesos * 100,
      closingDate,
      calcMode,
    })
  }

  const displayPesosNumber = parseInt(budgetPesosStr || '0', 10) || 0
  const formattedBudgetDisplay = displayPesosNumber.toLocaleString('es-AR')

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] px-5 pt-3 pb-24 text-[#F8FAFC]">
      {/* Status Bar */}
      <div className="flex justify-between items-center w-full text-[14px] text-[#FFFFFF] font-bold mb-4 px-3">
        <span>9:41</span>
        <span className="text-[12px] font-normal text-[#94A3B8]">100%</span>
      </div>

      {/* Screen Header */}
      <header className="flex justify-between items-center w-full mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
            CONFIGURACIÓN
          </div>
          <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
            Ajustes del Ciclo
          </h1>
        </div>

        <div className="w-9 h-9 bg-[#1E293B] rounded-full flex items-center justify-center text-[16px]">
          ⚙️
        </div>
      </header>

      {/* Presupuesto mensual a proteger */}
      <section className="w-full mb-5">
        <label
          htmlFor="budget-input"
          className="block text-[13px] font-medium leading-[16px] text-[#94A3B8] mb-2"
        >
          Presupuesto mensual a proteger
        </label>
        <div className="w-full h-[54px] bg-[#111827] border border-[#2563EB] rounded-[16px] px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[18px] font-bold text-[#FFFFFF]">$</span>
            <input
              id="budget-input"
              type="text"
              inputMode="numeric"
              value={formattedBudgetDisplay}
              onChange={(e) => handleBudgetChange(e.target.value)}
              className="bg-transparent border-none outline-none text-[18px] font-bold text-[#FFFFFF] w-full"
            />
          </div>
          <span className="text-[12px] font-bold leading-[15px] text-[#3B82F6] shrink-0">
            ARS
          </span>
        </div>
      </section>

      {/* Fecha de Cierre de Tarjeta */}
      <section className="w-full mb-5">
        <label
          htmlFor="closing-date-input"
          className="block text-[13px] font-medium leading-[16px] text-[#94A3B8] mb-2"
        >
          Fecha de Cierre de Tarjeta (Fin de ciclo)
        </label>
        <div className="relative w-full h-[54px] bg-[#111827] border border-[#1E293B] rounded-[16px] px-4 flex items-center justify-between focus-within:border-[#2563EB]">
          <input
            id="closing-date-input"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[15px] text-[#F8FAFC] cursor-pointer"
          />
          <span className="text-[16px] pointer-events-none absolute right-4">
            📅
          </span>
        </div>
      </section>

      {/* Regla de cálculo diario */}
      <section className="w-full mb-5">
        <span className="block text-[13px] font-medium leading-[16px] text-[#94A3B8] mb-2">
          Regla de cálculo diario
        </span>

        {/* Dynamic Mode Radio Card */}
        <div
          onClick={() => setCalcMode('dynamic')}
          className={`w-full h-[76px] bg-[#111827] rounded-[18px] p-3.5 mb-2.5 flex items-center gap-3 cursor-pointer transition-colors border ${
            calcMode === 'dynamic' ? 'border-[#2563EB]' : 'border-[#1E293B]'
          }`}
        >
          <div
            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-[12px] ${
              calcMode === 'dynamic'
                ? 'bg-[#2563EB] text-[#FFFFFF]'
                : 'bg-[#1E293B] text-transparent'
            }`}
          >
            ✓
          </div>
          <div className="flex flex-col justify-center">
            <span
              className={`text-[13px] font-bold leading-[16px] ${
                calcMode === 'dynamic' ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
              }`}
            >
              Recálculo dinámico inteligente
            </span>
            <span className="text-[11px] leading-[14px] text-[#64748B] mt-0.5">
              Si hoy ahorrás, mañana tenés más margen.
            </span>
          </div>
        </div>

        {/* Fixed Mode Radio Card */}
        <div
          onClick={() => setCalcMode('fixed')}
          className={`w-full h-[76px] bg-[#111827] rounded-[18px] p-3.5 flex items-center gap-3 cursor-pointer transition-colors border ${
            calcMode === 'fixed' ? 'border-[#2563EB]' : 'border-[#1E293B]'
          }`}
        >
          <div
            className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 text-[12px] ${
              calcMode === 'fixed'
                ? 'bg-[#2563EB] text-[#FFFFFF]'
                : 'bg-[#1E293B] text-transparent'
            }`}
          >
            ✓
          </div>
          <div className="flex flex-col justify-center">
            <span
              className={`text-[13px] font-bold leading-[16px] ${
                calcMode === 'fixed' ? 'text-[#F8FAFC]' : 'text-[#94A3B8]'
              }`}
            >
              Cuota diaria fija sin traspaso
            </span>
            <span className="text-[11px] leading-[14px] text-[#64748B] mt-0.5">
              Presupuesto dividido parejo en 30 días.
            </span>
          </div>
        </div>
      </section>

      {/* Explanatory Note Card */}
      <section className="w-full bg-[#0E1B2A] border border-[#1E3A5F] rounded-[20px] p-4 mb-6">
        <div className="text-[11px] font-bold text-[#38BDF8] tracking-wider leading-[14px] mb-2">
          💡 TU OBJETIVO ANTI-DESCONTROL
        </div>
        <p className="text-[12px] leading-[16px] text-[#94A3B8]">
          Al tener la fecha de corte exacta (ej. 30/09) y $100.000 restantes, el sistema te da tu
          límite exacto hoy ($10.000). Si gastas $2.000 hoy, mañana tu límite sube a $10.888.
        </p>
      </section>

      {/* Save CTA */}
      <button
        type="button"
        onClick={handleSave}
        className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] text-[#FFFFFF] text-[15px] font-bold rounded-[16px] flex items-center justify-center cursor-pointer transition-all shadow-md"
      >
        GUARDAR CONFIGURACIÓN
      </button>
    </div>
  )
}