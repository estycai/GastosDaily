import React from 'react'

export interface StreakCardProps {
  currentStreak: number
  bestStreak: number
}

export const StreakCard: React.FC<StreakCardProps> = ({ currentStreak, bestStreak }) => {
  return (
    <section className="w-full bg-[#131B2E] border border-[#1E293B] rounded-[24px] p-5 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Round amber badge holding the number */}
        <div className="w-14 h-14 rounded-full bg-[#451A03] border border-[#F59E0B]/30 flex items-center justify-center shrink-0">
          <span className="text-[26px] font-bold text-[#F59E0B] leading-none">
            {currentStreak}
          </span>
        </div>

        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#F59E0B] leading-[14px]">
            RACHA ACTUAL
          </span>
          <span className="text-[24px] font-bold text-[#F8FAFC] leading-[30px] mt-0.5 truncate">
            {currentStreak} {currentStreak === 1 ? 'día seguido' : 'días seguidos'}
          </span>
          <span className="text-[13px] text-[#94A3B8] leading-[16px] mt-0.5">
            Tu mejor racha: {bestStreak} {bestStreak === 1 ? 'día' : 'días'}
          </span>
        </div>
      </div>
    </section>
  )
}
