import { useState, useEffect, useCallback } from 'react'
import {
  getActiveCycle as getActiveCycleInfra,
  createCycle as createCycleInfra,
  updateCycle as updateCycleInfra,
  type CycleEntity,
  type CreateCycleParams,
  type UpdateCycleParams,
} from '../infrastructure/supabase/cyclesRepository.ts'

export type { CycleEntity, CreateCycleParams, UpdateCycleParams }

export interface UseCycleReturn {
  activeCycle: CycleEntity | null
  loading: boolean
  error: Error | null
  createCycle: (params: CreateCycleParams) => Promise<CycleEntity>
  updateCycle: (cycleId: string, params: UpdateCycleParams) => Promise<CycleEntity>
  refreshCycle: () => Promise<void>
  clearError: () => void
}

export function useCycle(userId: string | null): UseCycleReturn {
  const [activeCycle, setActiveCycle] = useState<CycleEntity | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchCycle = useCallback(async () => {
    if (!userId) {
      setActiveCycle(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const cycle = await getActiveCycleInfra(userId)
      setActiveCycle(cycle)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchCycle()
  }, [fetchCycle])

  const create = useCallback(
    async (params: CreateCycleParams): Promise<CycleEntity> => {
      if (!userId) {
        const err = new Error('No authenticated user to create cycle')
        setError(err)
        throw err
      }

      setLoading(true)
      setError(null)
      try {
        const newCycle = await createCycleInfra(userId, params)
        setActiveCycle(newCycle)
        return newCycle
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        throw errorObj
      } finally {
        setLoading(false)
      }
    },
    [userId]
  )

  const update = useCallback(
    async (cycleId: string, params: UpdateCycleParams): Promise<CycleEntity> => {
      if (!userId) {
        const err = new Error('No authenticated user to update cycle')
        setError(err)
        throw err
      }

      setError(null)
      const previousCycle = activeCycle

      // Optimistic update
      if (previousCycle && previousCycle.id === cycleId) {
        setActiveCycle({
          ...previousCycle,
          ...(params.totalBudgetCents !== undefined && { totalBudgetCents: params.totalBudgetCents }),
          ...(params.startDate !== undefined && { startDate: params.startDate }),
          ...(params.endDate !== undefined && { endDate: params.endDate }),
          ...(params.calcMode !== undefined && { calcMode: params.calcMode }),
          ...(params.isActive !== undefined && { isActive: params.isActive }),
        })
      }

      try {
        const updated = await updateCycleInfra(userId, cycleId, params)
        setActiveCycle(updated)
        return updated
      } catch (err) {
        // Rollback on failure
        setActiveCycle(previousCycle)
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        throw errorObj
      }
    },
    [userId, activeCycle]
  )

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    activeCycle,
    loading,
    error,
    createCycle: create,
    updateCycle: update,
    refreshCycle: fetchCycle,
    clearError,
  }
}
