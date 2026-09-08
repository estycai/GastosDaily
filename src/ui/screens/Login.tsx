import React, { useEffect, useRef, useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export interface LoginProps {
  onSendMagicLink: (email: string) => Promise<void>
  onSignInWithGoogle?: () => Promise<void>
  loading?: boolean
  error?: Error | null
  onClearError?: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * How long to wait for the OAuth redirect to actually take the user away from
 * this page. `signInWithOAuth` resolves as soon as the navigation is requested,
 * so if the browser never leaves (ad blocker, CSP, extension) this watchdog is
 * the only thing that releases the form.
 */
const GOOGLE_REDIRECT_TIMEOUT_MS = 8000

const GOOGLE_REDIRECT_BLOCKED_MESSAGE =
  'No pudimos abrir el acceso con Google. Revisá si una extensión del navegador lo está bloqueando, o ingresá con el enlace por correo.'

const GoogleIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" className="shrink-0">
    <path
      fill="#4285F4"
      d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.909c1.702-1.567 2.683-3.874 2.683-6.614Z"
    />
    <path
      fill="#34A853"
      d="M9 18c2.43 0 4.467-.806 5.957-2.181l-2.909-2.258c-.806.54-1.837.859-3.048.859-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18Z"
    />
    <path
      fill="#FBBC05"
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
    />
    <path
      fill="#EA4335"
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
    />
  </svg>
)

export const Login: React.FC<LoginProps> = ({
  onSendMagicLink,
  onSignInWithGoogle,
  loading = false,
  error = null,
  onClearError,
}) => {
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [googleSubmitting, setGoogleSubmitting] = useState(false)
  const googleRedirectTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  const clearGoogleRedirectTimeout = () => {
    if (googleRedirectTimeoutRef.current !== null) {
      window.clearTimeout(googleRedirectTimeoutRef.current)
      googleRedirectTimeoutRef.current = null
    }
  }

  // Clear any pending watchdog when the component goes away.
  useEffect(() => clearGoogleRedirectTimeout, [])

  // Restoring from the back/forward cache brings the in-memory state back with
  // googleSubmitting still true, which would leave the form permanently
  // disabled. Release it whenever the page is restored from bfcache.
  //
  // `pagehide` is the counterpart: it fires once the browser actually starts
  // leaving the page, which proves the redirect worked. Cancelling the watchdog
  // there stops it from painting a bogus "blocked" error on a slow connection
  // where the navigation legitimately takes longer than the timeout.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        clearGoogleRedirectTimeout()
        setGoogleSubmitting(false)
      }
    }

    const handlePageHide = () => {
      clearGoogleRedirectTimeout()
    }

    window.addEventListener('pageshow', handlePageShow)
    window.addEventListener('pagehide', handlePageHide)
    return () => {
      window.removeEventListener('pageshow', handlePageShow)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)
    if (onClearError) onClearError()

    const trimmed = email.trim()
    if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
      setLocalError('Ingresá un correo electrónico válido.')
      return
    }

    setSubmitting(true)
    try {
      await onSendMagicLink(trimmed)
      setSentEmail(trimmed)
    } catch (err: any) {
      setLocalError(err?.message || 'Error al enviar el enlace. Intentalo de nuevo.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleClick = async () => {
    if (!onSignInWithGoogle) return

    setLocalError(null)
    if (onClearError) onClearError()

    clearGoogleRedirectTimeout()
    setGoogleSubmitting(true)
    try {
      await onSignInWithGoogle()
      // On success the browser is already navigating to Google, so the loading
      // state is intentionally kept until the redirect replaces this page.
      // If the navigation never happens the watchdog below releases the form.
      googleRedirectTimeoutRef.current = window.setTimeout(() => {
        googleRedirectTimeoutRef.current = null
        setGoogleSubmitting(false)
        setLocalError(GOOGLE_REDIRECT_BLOCKED_MESSAGE)
      }, GOOGLE_REDIRECT_TIMEOUT_MS)
    } catch (err: any) {
      clearGoogleRedirectTimeout()
      setLocalError(err?.message || 'Error al iniciar sesión con Google. Intentalo de nuevo.')
      setGoogleSubmitting(false)
    }
  }

  const activeError = localError || (error ? error.message : null)

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-screen bg-[#0B0E14] px-5 py-8 text-[#F8FAFC]">
      {/* App Branding */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-16 h-16 rounded-[20px] bg-[#111827] border border-[#1E293B] flex items-center justify-center text-[32px] mb-4 shadow-lg shadow-black/40">
          📊
        </div>
        <div className="text-[11px] font-bold uppercase tracking-widest text-[#60A5FA] mb-1">
          CONTROL INTELIGENTE
        </div>
        <h1 className="text-[28px] font-bold text-[#FFFFFF] leading-tight">
          Gastos Daily
        </h1>
        <p className="text-[14px] text-[#94A3B8] mt-2 max-w-[280px]">
          Tu límite de gasto diario recalculado al instante, sin estrés ni planillas.
        </p>
      </div>

      {/* Confirmation State or Input Form */}
      {sentEmail ? (
        <div className="w-full max-w-[353px] bg-[#111827] border border-[#1E293B] rounded-[24px] p-6 text-center shadow-xl">
          <div className="w-12 h-12 rounded-full bg-[#064E3B] border border-[#34D399]/30 flex items-center justify-center mx-auto mb-4 text-[#34D399]">
            <CheckCircle2 size={24} />
          </div>
          <h2 className="text-[20px] font-bold text-[#FFFFFF] mb-2">
            ¡Revisá tu correo!
          </h2>
          <p className="text-[13px] leading-[18px] text-[#94A3B8] mb-4">
            Enviamos un enlace de acceso a <strong className="text-[#F8FAFC]">{sentEmail}</strong>. Hacé clic en el enlace para ingresar a tu cuenta.
          </p>
          <div className="bg-[#1E293B] rounded-[14px] p-3 text-[12px] text-[#64748B] mb-5">
            Si no lo ves en unos minutos, revisá la carpeta de correo no deseado (spam).
          </div>
          <button
            type="button"
            onClick={() => {
              setSentEmail(null)
              setEmail('')
              setLocalError(null)
              if (onClearError) onClearError()
            }}
            className="text-[13px] font-bold text-[#38BDF8] hover:text-[#60A5FA] transition-colors cursor-pointer"
          >
            ← Usar otro correo
          </button>
        </div>
      ) : (
        <div className="w-full max-w-[353px] bg-[#111827] border border-[#1E293B] rounded-[24px] p-6 shadow-xl">
          <h2 className="text-[18px] font-bold text-[#FFFFFF] mb-1">
            Iniciar sesión
          </h2>
          <p className="text-[12px] text-[#94A3B8] mb-5">
            Elegí cómo querés ingresar: con tu cuenta de Google o con un enlace por correo.
          </p>

          {onSignInWithGoogle && (
            <>
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={submitting || googleSubmitting || loading}
                className="w-full h-[52px] bg-[#FFFFFF] hover:bg-[#F1F5F9] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#1F2937] text-[15px] font-bold rounded-[16px] flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md"
              >
                {googleSubmitting ? (
                  <div className="w-5 h-5 border-2 border-[#1F2937] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <GoogleIcon />
                    <span>Continuar con Google</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-[#1E293B]" />
                <span className="text-[#64748B] text-[11px]">o</span>
                <div className="h-px flex-1 bg-[#1E293B]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email-input"
                className="block text-[12px] font-medium leading-[15px] text-[#94A3B8] mb-2"
              >
                Correo electrónico
              </label>
              <div
                className={`w-full h-[52px] bg-[#0B0E14] border rounded-[16px] px-3.5 flex items-center gap-2.5 transition-colors ${
                  activeError ? 'border-[#EF4444]' : 'border-[#1E293B] focus-within:border-[#2563EB]'
                }`}
              >
                <Mail size={18} className="text-[#64748B] shrink-0" />
                <input
                  id="email-input"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (activeError) setLocalError(null)
                    if (onClearError) onClearError()
                  }}
                  placeholder="nombre@ejemplo.com"
                  disabled={submitting || googleSubmitting || loading}
                  className="w-full bg-transparent border-none outline-none text-[#F8FAFC] text-[15px] placeholder-[#64748B]"
                />
              </div>
            </div>

            {/* Error Message */}
            {activeError && (
              <div className="flex items-center gap-2 bg-[#450A0A] border border-[#EF4444]/40 rounded-[12px] p-3 text-[12px] text-[#EF4444]">
                <AlertCircle size={16} className="shrink-0" />
                <span>{activeError}</span>
              </div>
            )}

            {/* Primary CTA */}
            <button
              type="submit"
              disabled={submitting || googleSubmitting || loading || !email.trim()}
              className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#FFFFFF] text-[15px] font-bold rounded-[16px] flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md mt-1"
            >
              {submitting || loading ? (
                <div className="w-5 h-5 border-2 border-[#FFFFFF] border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>ENVIAR ENLACE DE ACCESO</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Footer Info */}
      <footer className="mt-8 text-center text-[11px] text-[#64748B]">
        Gastos Daily • Buenos Aires, Argentina
      </footer>
    </div>
  )
}
