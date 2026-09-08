import { useState, useEffect, useCallback } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getCurrentSession,
  onAuthStateChange,
  sendMagicLink as sendMagicLinkInfra,
  signOut as signOutInfra,
} from '../infrastructure/auth/session.ts'

export interface UseSessionReturn {
  session: Session | null
  user: User | null
  userId: string | null
  loading: boolean
  error: Error | null
  sendMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export function useSession(): UseSessionReturn {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let isMounted = true

    const applySession = (newSession: Session | null) => {
      if (!isMounted) return
      setSession(newSession)
      setUser(newSession?.user ?? null)
      setUserId(newSession?.user?.id ?? null)
      setLoading(false)
    }

    // Subscribe to auth state changes
    const unsubscribe = onAuthStateChange((_event, newSession) => {
      applySession(newSession)
    })

    // Resolve initial session from getSession
    getCurrentSession()
      .then((initialSession) => {
        applySession(initialSession)
      })
      .catch((err) => {
        if (!isMounted) return
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const sendMagicLink = useCallback(async (email: string) => {
    setError(null)
    try {
      await sendMagicLinkInfra(email)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      throw errorObj
    }
  }, [])

  const signOut = useCallback(async () => {
    setError(null)
    try {
      await signOutInfra()
      setSession(null)
      setUser(null)
      setUserId(null)
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      throw errorObj
    }
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    session,
    user,
    userId,
    loading,
    error,
    sendMagicLink,
    signOut,
    clearError,
  }
}
