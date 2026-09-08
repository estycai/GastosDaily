import React from 'react'

export type TabType = 'hoy' | 'historial' | 'ajustes'

interface BottomNavProps {
  currentTab: TabType
  onSelectTab: (tab: TabType) => void
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  return (
    <nav
      className="w-full h-[76px] bg-[#0E121A] border-t border-[#1E293B] flex items-center justify-around px-4 select-none shrink-0 fixed bottom-0 left-1/2 -translate-x-1/2 max-w-[430px] z-30"
      aria-label="Navegación principal"
    >
      {/* Hoy Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('hoy')}
        className="flex flex-col items-center justify-center gap-1 w-20 py-2 cursor-pointer transition-colors"
      >
        <span className="text-[18px] leading-[22px]">📊</span>
        <span
          className={`text-[11px] leading-[14px] ${
            currentTab === 'hoy'
              ? 'font-bold text-[#3B82F6]'
              : 'font-normal text-[#64748B]'
          }`}
        >
          Hoy
        </span>
      </button>

      {/* Historial Tab - VISIBLE BUT DISABLED */}
      <div className="relative group">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="flex flex-col items-center justify-center gap-1 w-20 py-2 opacity-50 cursor-not-allowed"
        >
          <span className="text-[18px] leading-[22px]">📅</span>
          <span className="text-[11px] leading-[14px] text-[#64748B]">
            Historial
          </span>
        </button>
        <span className="absolute -top-1 left-1/2 -translate-x-1/2 bg-[#1E293B] text-[#94A3B8] text-[9px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap pointer-events-none border border-[#334155]">
          Próximamente
        </span>
      </div>

      {/* Ajustes Tab */}
      <button
        type="button"
        onClick={() => onSelectTab('ajustes')}
        className="flex flex-col items-center justify-center gap-1 w-20 py-2 cursor-pointer transition-colors"
      >
        <span className="text-[18px] leading-[22px]">⚙️</span>
        <span
          className={`text-[11px] leading-[14px] ${
            currentTab === 'ajustes'
              ? 'font-bold text-[#3B82F6]'
              : 'font-normal text-[#64748B]'
          }`}
        >
          Ajustes
        </span>
      </button>
    </nav>
  )
}