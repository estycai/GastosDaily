import { useState, useEffect, useCallback } from 'react'
import {
  listApiTokens as listApiTokensInfra,
  createApiToken as createApiTokenInfra,
  revokeApiToken as revokeApiTokenInfra,
  type ApiTokenEntity,
  type CreatedApiTokenResult,
} from '../infrastructure/supabase/apiTokensRepository.ts'

export type { ApiTokenEntity, CreatedApiTokenResult }

export interface UseApiTokensReturn {
  tokens: ApiTokenEntity[]
  loading: boolean
  error: Error | null
  createdTokenPlaintext: string | null
  createToken: (label: string) => Promise<CreatedApiTokenResult>
  revokeToken: (tokenId: string) => Promise<ApiTokenEntity>
  dismissPlaintextToken: () => void
  refreshTokens: () => Promise<void>
  clearError: () => void
}

export function useApiTokens(userId: string | null): UseApiTokensReturn {
  const [tokens, setTokens] = useState<ApiTokenEntity[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [createdTokenPlaintext, setCreatedTokenPlaintext] = useState<string | null>(null)

  const fetchTokens = useCallback(async () => {
    if (!userId) {
      setTokens([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const list = await listApiTokensInfra(userId)
      setTokens(list)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    fetchTokens()
  }, [fetchTokens])

  const create = useCallback(
    async (label: string): Promise<CreatedApiTokenResult> => {
      if (!userId) {
        const err = new Error('No authenticated user to create API token')
        setError(err)
        throw err
      }

      setError(null)
      try {
        const result = await createApiTokenInfra(userId, label)
        // Store plaintext token in local state for one-time display
        setCreatedTokenPlaintext(result.token)
        // Add new token to list
        setTokens((prev) => [result.tokenRecord, ...prev])
        return result
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        throw errorObj
      }
    },
    [userId]
  )

  const revoke = useCallback(
    async (tokenId: string): Promise<ApiTokenEntity> => {
      if (!userId) {
        const err = new Error('No authenticated user to revoke API token')
        setError(err)
        throw err
      }

      setError(null)
      const previousTokens = tokens

      // Optimistic update
      setTokens((prev) =>
        prev.map((t) =>
          t.id === tokenId ? { ...t, revokedAt: new Date().toISOString() } : t
        )
      )

      try {
        const updated = await revokeApiTokenInfra(userId, tokenId)
        setTokens((prev) => prev.map((t) => (t.id === tokenId ? updated : t)))
        return updated
      } catch (err) {
        // Rollback
        setTokens(previousTokens)
        const errorObj = err instanceof Error ? err : new Error(String(err))
        setError(errorObj)
        throw errorObj
      }
    },
    [userId, tokens]
  )

  const dismissPlaintextToken = useCallback(() => {
    setCreatedTokenPlaintext(null)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    tokens,
    loading,
    error,
    createdTokenPlaintext,
    createToken: create,
    revokeToken: revoke,
    dismissPlaintextToken,
    refreshTokens: fetchTokens,
    clearError,
  }
}
