import React, { useState } from 'react'
import { Mail, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react'

export interface LoginProps {
  onSendMagicLink: (email: string) => Promise<void>
  loading?: boolean
  error?: Error | null
  onClearError?: () => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const Login: React.FC<LoginProps> = ({
  onSendMagicLink,
  loading = false,
  error = null,
  onClearError,
}) => {
  const [email, setEmail] = useState('')
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
            Ingresá tu correo para recibir un enlace mágico sin contraseña.
          </p>

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
                  disabled={submitting || loading}
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
              disabled={submitting || loading || !email.trim()}
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
