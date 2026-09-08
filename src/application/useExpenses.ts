import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  listExpensesForCycle as listExpensesInfra,
  createExpense as createExpenseInfra,
  deleteExpense as deleteExpenseInfra,
  type ExpenseEntity,
  type CreateExpenseParams,
} from '../infrastructure/supabase/expensesRepository.ts'
import { getTodayBuenosAires } from './dateUtils.ts'

export type { ExpenseEntity, CreateExpenseParams }

export interface UseExpensesReturn {
  expenses: ExpenseEntity[]
  todayExpenses: ExpenseEntity[]
  loading: boolean
  error: Error | null
  createExpense: (params: Omit<CreateExpenseParams, 'cycleId'>) => Promise<ExpenseEntity>
  deleteExpense: (expenseId: string) => Promise<void>
  refreshExpenses: () => Promise<void>
  clearError: () => void
}

export function useExpenses(userId: string | null, cycleId: string | null): UseExpensesReturn {
  const [expenses, setExpenses] = useState<ExpenseEntity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchExpenses = useCallback(async () => {
    if (!userId || !cycleId) {
      setExpenses([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const data = await listExpensesInfra(userId, cycleId)
      setExpenses(data)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [userId, cycleId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const todayBuenosAires = getTodayBuenosAires()

  const todayExpenses = useMemo(() => {
    return expenses.filter((e) => e.expenseDate === todayBuenosAires)
  }, [expenses, todayBuenosAires])

  const create = useCallback(
    async (params: Omit<CreateExpenseParams, 'cycleId'>): Promise<ExpenseEntity> => {
      if (!userId || !cycleId) {
        const err = new Error('No authenticated user or active cycle to create expense')
        setError(err)
        throw err
      }

      setError(null)
      const expenseDate = params.expenseDate || getTodayBuenosAires()
      const optimisticId = 'temp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)

      const optimisticExpense: ExpenseEntity = {
        id: optimisticId,
        cycleId,
        userId,
        amountCents: params.amountCents,
        concept: params.concept ?? null,
        category: params.category ?? 'varios',
        expenseDate,
        createdAt: new Date().toISOString(),
      }

      // Optimistic UI update: insert at top
      setExpenses((prev) => [optimisticExpense, ...prev])

      try {
        const created = await createExpenseInfra(userId, {
          ...params,
          cycleId,
          expenseDate,
        })
        // Replace optimistic entry with real created entity
        setExpenses((prev) =>
          prev.map((e) => (e.id === optimisticId ? created : e))
        )
        return created
      } catch (err) {
        // Rollback optimistic addition
        setExpenses((prev) => prev.filter((e) => e.id !== optimisticId))
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        throw errorObj
      }
    },
    [userId, cycleId]
  )

  const remove = useCallback(
    async (expenseId: string): Promise<void> => {
      if (!userId) {
        const err = new Error('No authenticated user to delete expense')
        setError(err)
        throw err
      }

      setError(null)
      const previousExpenses = expenses

      // Optimistic delete: remove from state
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId))

      try {
        await deleteExpenseInfra(userId, expenseId)
      } catch (err) {
        // Rollback on failure: restore previous array
        setExpenses(previousExpenses)
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        throw errorObj
      }
    },
    [userId, expenses]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    expenses,
    todayExpenses,
    loading,
    error,
    createExpense: create,
    deleteExpense: remove,
    refreshExpenses: fetchExpenses,
    clearError,
  }
}
