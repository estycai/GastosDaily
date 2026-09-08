import { useState } from 'react'
import { Dashboard } from './ui/screens/Dashboard.tsx'
import { RegisterExpense } from './ui/screens/RegisterExpense.tsx'
import { Settings } from './ui/screens/Settings.tsx'
import { BottomNav, type TabType } from './ui/components/BottomNav.tsx'
import type { ExpenseItem } from './ui/screens/Dashboard.tsx'
import {
  daysRemaining,
  dailyAllowanceCents,
  paceStatus,
  cycleSpentCents,
  type CalcMode,
} from './domain/budget.ts'

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('hoy')
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false)

  // Cycle configuration state (mock/injected default matching the design worked example)
  const [totalBudgetCents, setTotalBudgetCents] = useState<number>(30000000) // $ 300.000
  const [closingDate, setClosingDate] = useState<string>('2026-09-30')
  const [calcMode, setCalcMode] = useState<CalcMode>('dynamic')

  // Mock initial expenses matching the exact design state:
  // Today is 20 Sep.
  // Expenses recorded in cycle prior to today:
  // Supermercado Día: $ 8.200 (yesterday 19 Sep)
  // Plus previous expenses so that remaining before today is $ 100.000 (spent = $ 200.000 - $ 3.500)
  // And today's expense: Café con tostadas: $ 3.500
  // Total cycle spent = $ 200.000 (20.000.000 cents), so remaining is $ 100.000 (10.000.000 cents).
  const [expenses, setExpenses] = useState<ExpenseItem[]>([
    {
      id: '1',
      concept: 'Café con tostadas',
      amountCents: 350000,
      categoryEmoji: '☕',
      iconBgColor: '#1E1B4B',
      dateLabel: '13:30 hs • Tarjeta Visa',
    },
    {
      id: '2',
      concept: 'Supermercado Día',
      amountCents: 820000,
      categoryEmoji: '🛒',
      iconBgColor: '#064E3B',
      dateLabel: 'Ayer 19 Sep • Débito',
    },
  ])

  // Additional prior cycle expenses so total cycle spent matches design (.000 total spent => .000 remaining)
  const priorCycleSpentCents = 20000000 - 350000 - 820000

  // Reference date: 20 Sep 2026 -> 10 days remaining to 2026-09-30
  const todayStr = '2026-09-21'
  const daysLeft = daysRemaining(todayStr, closingDate)

  // Current cycle spent
  const visibleExpensesCents = cycleSpentCents(expenses.map((e) => e.amountCents))
  const totalCycleSpent = priorCycleSpentCents + visibleExpensesCents
  const cycleRemaining = Math.max(0, totalBudgetCents - totalCycleSpent)

  // Daily allowance
  const dailyAllowance = dailyAllowanceCents({
    totalBudgetCents,
    cycleSpentCents: totalCycleSpent,
    daysRemaining: daysLeft,
    calcMode,
    totalCycleDays: 30,
  })

  // Spent today: Café con tostadas ($ 3.500) was spent today
  const todayExpenseItems = expenses.filter((e) => e.id !== '2')
  const todaySpentTotal = cycleSpentCents(todayExpenseItems.map((e) => e.amountCents))

  const currentPace = paceStatus(todaySpentTotal, dailyAllowance)

  // Period spent percentage
  const periodSpentPercent = (totalCycleSpent / totalBudgetCents) * 100

  const handleRegisterExpense = (newExpense: {
    amountCents: number
    concept: string
    category: string
    categoryEmoji: string
  }) => {
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      concept: newExpense.concept,
      amountCents: newExpense.amountCents,
      categoryEmoji: newExpense.categoryEmoji,
      iconBgColor: '#1E293B',
      dateLabel: 'Ahora • Efectivo',
    }
    setExpenses((prev) => [newItem, ...prev])
    setIsRegisterOpen(false)
  }

  const handleSaveSettings = (newSettings: {
    budgetCents: number
    closingDate: string
    calcMode: CalcMode
  }) => {
    setTotalBudgetCents(newSettings.budgetCents)
    setClosingDate(newSettings.closingDate)
    setCalcMode(newSettings.calcMode)
    setCurrentTab('hoy')
  }
  return (
    <main className="w-full min-h-screen bg-[#0B0E14] flex flex-col items-center relative overflow-x-hidden">
      {isRegisterOpen ? (
        <RegisterExpense
          currentDailyAllowanceCents={dailyAllowance}
          cycleDaysRemaining={daysLeft}
          totalBudgetCents={totalBudgetCents}
          cycleSpentCents={totalCycleSpent}
          calcMode={calcMode}
          onClose={() => setIsRegisterOpen(false)}
          onConfirmExpense={handleRegisterExpense}
        />
      ) : currentTab === 'ajustes' ? (
        <>
          <Settings
            initialBudgetCents={totalBudgetCents}
            initialClosingDate={closingDate}
            initialCalcMode={calcMode}
            onSaveSettings={handleSaveSettings}
          />
          <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        </>
      ) : (
        <>
          <Dashboard
            dailyAllowanceCents={dailyAllowance}
            paceStatus={currentPace}
            cycleDaysRemaining={daysLeft}
            cycleClosingDateLabel="30 Sep"
            cycleRemainingCents={cycleRemaining}
            totalBudgetCents={totalBudgetCents}
            periodSpentPercent={periodSpentPercent}
            todayExpenses={expenses}
            todayTotalSpentCents={todaySpentTotal}
            todayDateLabel="20 Sep"
            onOpenRegisterExpense={() => setIsRegisterOpen(true)}
          />
          <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        </>
      )}
    </main>
  )
}

export default App