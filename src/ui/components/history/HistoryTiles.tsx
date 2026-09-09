import React from 'react'
import { formatArs } from '../../format.ts'

export interface HistoryTilesProps {
  achieved: number
  closed: number
  realSavingsCents: number
  averageDailyCents: number
  averageLimitCents: number
}

export const HistoryTiles: React.FC<HistoryTilesProps> = ({
  achieved,
  closed,
  realSavingsCents,
  averageDailyCents,
  averageLimitCents,
}) => {
  const percentageClosed = closed > 0 ? Math.round((achieved / closed) * 100) : 0
  const isSavingsPositive = realSavingsCents >= 0

  return (
    <section className="grid grid-cols-3 gap-2.5 w-full">
      {/* Tile 1: Días logrados */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-[18px] p-3 flex flex-col justify-between min-h-[96px]">
        <span className="text-[11px] font-normal leading-[14px] text-[#94A3B8]">
          Días logrados
        </span>
        <div className="text-[20px] font-bold leading-[24px] text-[#34D399]">
          {achieved}/{closed}
        </div>
        <span className="text-[10px] leading-[12px] text-[#64748B]">
          {percentageClosed}% cerrados
        </span>
      </div>

      {/* Tile 2: Ahorro real */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-[18px] p-3 flex flex-col justify-between min-h-[96px]">
        <span className="text-[11px] font-normal leading-[14px] text-[#94A3B8]">
          Ahorro real
        </span>
        <div
          className={"text-[20px] font-bold leading-[24px] truncate " + (isSavingsPositive ? "text-[#F8FAFC]" : "text-[#EF4444]")}
        >
          {formatArs(realSavingsCents)}
        </div>
        <span className="text-[10px] leading-[12px] text-[#64748B]">
          sin gastar
        </span>
      </div>

      {/* Tile 3: Promedio/día */}
      <div className="bg-[#131B2E] border border-[#1E293B] rounded-[18px] p-3 flex flex-col justify-between min-h-[96px]">
        <span className="text-[11px] font-normal leading-[14px] text-[#94A3B8]">
          Promedio/día
        </span>
        <div className="text-[20px] font-bold leading-[24px] text-[#F8FAFC] truncate">
          {formatArs(averageDailyCents)}
        </div>
        <span className="text-[10px] leading-[12px] text-[#64748B] truncate">
          límite {formatArs(averageLimitCents)}
        </span>
      </div>
    </section>
  )
}
