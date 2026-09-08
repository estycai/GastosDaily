import { useState, useMemo } from 'react'
import { Dashboard, type ExpenseItem } from './ui/screens/Dashboard.tsx'
import { RegisterExpense } from './ui/screens/RegisterExpense.tsx'
import { Settings } from './ui/screens/Settings.tsx'
import { Login } from './ui/screens/Login.tsx'
import { BottomNav, type TabType } from './ui/components/BottomNav.tsx'
import {
  daysRemaining,
  dailyAllowanceCents,
  paceStatus,
  cycleSpentCents,
  type CalcMode,
} from './domain/budget.ts'
import {
  useSession,
  useCycle,
  useExpenses,
  useApiTokens,
  getTodayBuenosAires,
  formatFriendlyDate,
  formatExpenseDateLabel,
} from './application/index.ts'

const CATEGORY_MAP: Record<string, { emoji: string; bg: string }> = {
  comida: { emoji: '🍔', bg: '#1E1B4B' },
  super: { emoji: '🛒', bg: '#064E3B' },
  viaje: { emoji: '🚗', bg: '#172554' },
  varios: { emoji: '🛍️', bg: '#1E293B' },
}

export function App() {
  const [currentTab, setCurrentTab] = useState<TabType>('hoy')
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false)

  // 1. Session hook
  const {
    session,
    userId,
    loading: sessionLoading,
    error: sessionError,
    sendMagicLink,
    signOut,
    clearError: clearSessionError,
  } = useSession()

  // 2. Cycle hook
  const {
    activeCycle,
    loading: cycleLoading,
    createCycle,
    updateCycle,
  } = useCycle(userId)

  // 3. Expenses hook
  const {
    expenses,
    todayExpenses: rawTodayExpenses,
    createExpense,
  } = useExpenses(userId, activeCycle?.id ?? null)

  // 4. API tokens hook
  const {
    tokens: apiTokens,
    loading: tokensLoading,
    createdTokenPlaintext,
    createToken,
    revokeToken,
    dismissPlaintextToken,
  } = useApiTokens(userId)

  // Date and budget calculations
  const todayStr = getTodayBuenosAires()

  // Map expenses to UI ExpenseItem format for Dashboard feed
  const mappedTodayExpenses: ExpenseItem[] = useMemo(() => {
    return rawTodayExpenses.map((exp) => {
      const catConfig = CATEGORY_MAP[exp.category] || CATEGORY_MAP['varios']
      return {
        id: exp.id,
        concept: exp.concept || 'Gasto',
        amountCents: exp.amountCents,
        categoryEmoji: catConfig.emoji,
        iconBgColor: catConfig.bg,
        dateLabel: formatExpenseDateLabel(exp.createdAt, exp.expenseDate),
      }
    })
  }, [rawTodayExpenses])

  // Total budget and closing date from activeCycle
  const totalBudgetCents = activeCycle?.totalBudgetCents ?? 0
  const closingDate = activeCycle?.endDate ?? todayStr
  const calcMode: CalcMode = activeCycle?.calcMode ?? 'dynamic'

  // Days remaining (today inclusive through end date)
  const daysLeft = useMemo(() => {
    if (!activeCycle) return 0
    return daysRemaining(todayStr, closingDate)
  }, [todayStr, closingDate, activeCycle])

  // Total expenses spent in the cycle
  const totalCycleSpent = useMemo(() => {
    return cycleSpentCents(expenses.map((e) => e.amountCents))
  }, [expenses])

  const cycleRemaining = Math.max(0, totalBudgetCents - totalCycleSpent)

  // Daily allowance
  const dailyAllowance = useMemo(() => {
    if (!activeCycle) return 0
    return dailyAllowanceCents({
      totalBudgetCents,
      cycleSpentCents: totalCycleSpent,
      daysRemaining: daysLeft,
      calcMode,
      totalCycleDays: 30,
    })
  }, [totalBudgetCents, totalCycleSpent, daysLeft, calcMode, activeCycle])

  // Spent today in cents
  const todaySpentTotal = useMemo(() => {
    return cycleSpentCents(rawTodayExpenses.map((e) => e.amountCents))
  }, [rawTodayExpenses])

  const currentPace = useMemo(() => {
    return paceStatus(todaySpentTotal, dailyAllowance)
  }, [todaySpentTotal, dailyAllowance])

  const periodSpentPercent = totalBudgetCents > 0
    ? (totalCycleSpent / totalBudgetCents) * 100
    : 0

  // Register expense handler
  const handleRegisterExpense = async (newExpense: {
    amountCents: number
    concept: string
    category: string
  }) => {
    try {
      await createExpense({
        amountCents: newExpense.amountCents,
        concept: newExpense.concept,
        category: newExpense.category,
        expenseDate: todayStr,
      })
      setIsRegisterOpen(false)
    } catch (err) {
      console.error('Failed to create expense:', err)
    }
  }

  // Save settings handler
  const handleSaveSettings = async (newSettings: {
    budgetCents: number
    closingDate: string
    calcMode: CalcMode
  }) => {
    try {
      if (activeCycle) {
        await updateCycle(activeCycle.id, {
          totalBudgetCents: newSettings.budgetCents,
          endDate: newSettings.closingDate,
          calcMode: newSettings.calcMode,
        })
      } else {
        await createCycle({
          totalBudgetCents: newSettings.budgetCents,
          endDate: newSettings.closingDate,
          calcMode: newSettings.calcMode,
          startDate: todayStr,
          isActive: true,
        })
      }
      setCurrentTab('hoy')
    } catch (err) {
      console.error('Failed to save cycle settings:', err)
    }
  }

  // 1. Loading gate: Show a dark loading state without flashing Login screen
  if (sessionLoading || (session && cycleLoading)) {
    return (
      <main className="w-full min-h-screen bg-[#0B0E14] flex flex-col items-center justify-center text-[#F8FAFC]">
        <div className="w-8 h-8 border-3 border-[#2563EB] border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-[13px] font-medium text-[#64748B]">Cargando...</span>
      </main>
    )
  }

  // 2. Auth gate: No session -> Login
  if (!session) {
    return (
      <main className="w-full min-h-screen bg-[#0B0E14] flex flex-col items-center relative overflow-x-hidden">
        <Login
          onSendMagicLink={sendMagicLink}
          error={sessionError}
          onClearError={clearSessionError}
        />
      </main>
    )
  }

  // 3. No active cycle gate: Direct user straight to Settings
  if (!activeCycle) {
    return (
      <main className="w-full min-h-screen bg-[#0B0E14] flex flex-col items-center relative overflow-x-hidden">
        <div className="w-full px-5 pt-6 pb-2 text-[#F8FAFC]">
          <div className="bg-[#1E293B] border border-[#3B82F6]/40 rounded-[18px] p-4 text-center">
            <h2 className="text-[16px] font-bold text-[#FFFFFF] mb-1">
              ¡Te damos la bienvenida! 👋
            </h2>
            <p className="text-[12px] text-[#94A3B8]">
              Para comenzar, definí tu presupuesto mensual y la fecha de corte de tu ciclo.
            </p>
          </div>
        </div>
        <Settings
          initialBudgetCents={30000000}
          initialClosingDate={todayStr}
          initialCalcMode="dynamic"
          onSaveSettings={handleSaveSettings}
          apiTokens={apiTokens}
          createdTokenPlaintext={createdTokenPlaintext}
          onCreateApiToken={createToken}
          onRevokeApiToken={revokeToken}
          onDismissPlaintextToken={dismissPlaintextToken}
          apiTokensLoading={tokensLoading}
          onSignOut={signOut}
        />
      </main>
    )
  }

  // 4. Session & Active Cycle -> Render Main App
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
            apiTokens={apiTokens}
            createdTokenPlaintext={createdTokenPlaintext}
            onCreateApiToken={createToken}
            onRevokeApiToken={revokeToken}
            onDismissPlaintextToken={dismissPlaintextToken}
            apiTokensLoading={tokensLoading}
            onSignOut={signOut}
          />
          <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        </>
      ) : (
        <>
          <Dashboard
            dailyAllowanceCents={dailyAllowance}
            paceStatus={currentPace}
            cycleDaysRemaining={daysLeft}
            cycleClosingDateLabel={formatFriendlyDate(closingDate)}
            cycleRemainingCents={cycleRemaining}
            totalBudgetCents={totalBudgetCents}
            periodSpentPercent={periodSpentPercent}
            todayExpenses={mappedTodayExpenses}
            todayTotalSpentCents={todaySpentTotal}
            todayDateLabel={formatFriendlyDate(todayStr)}
            onOpenRegisterExpense={() => setIsRegisterOpen(true)}
          />
          <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
        </>
      )}
    </main>
  )
}

export default App
