import React, { useState } from 'react'
import type { ApiTokenEntity } from '../../application/useApiTokens.ts'
import { Copy, Check, Trash2, Key, LogOut, AlertTriangle } from 'lucide-react'
import { formatFriendlyDate } from '../../application/dateUtils.ts'

export interface SettingsProps {
  initialBudgetCents?: number
  initialClosingDate?: string
  onSaveSettings: (settings: {
    budgetCents: number
    closingDate: string
  }) => Promise<void> | void
  // API Tokens props
  apiTokens?: ApiTokenEntity[]
  createdTokenPlaintext?: string | null
  onCreateApiToken?: (label: string) => Promise<any>
  onRevokeApiToken?: (tokenId: string) => Promise<any>
  onDismissPlaintextToken?: () => void
  apiTokensLoading?: boolean
  // Sign-out prop
  onSignOut?: () => Promise<void>
}

export const Settings: React.FC<SettingsProps> = ({
  initialBudgetCents = 30000000,
  initialClosingDate = '2026-09-30',
  onSaveSettings,
  apiTokens = [],
  createdTokenPlaintext = null,
  onCreateApiToken,
  onRevokeApiToken,
  onDismissPlaintextToken,
  apiTokensLoading = false,
  onSignOut,
}) => {
  const [budgetPesosStr, setBudgetPesosStr] = useState<string>(
    Math.round(initialBudgetCents / 100).toString()
  )
  const [closingDate, setClosingDate] = useState<string>(initialClosingDate)

  // Save settings state
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // API Token management state
  const [newLabel, setNewLabel] = useState<string>('Apple Shortcut')
  const [isCreatingToken, setIsCreatingToken] = useState<boolean>(false)
  const [tokenCreateError, setTokenCreateError] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<boolean>(false)
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false)
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null)
  const [tokenToRevokeConfirm, setTokenToRevokeConfirm] = useState<string | null>(null)

  // Sign out state
  const [isSigningOut, setIsSigningOut] = useState<boolean>(false)

  const SHORTCUT_ENDPOINT_URL = 'https://vsniofvjuminnkjladdi.supabase.co/functions/v1/register-expense'

  const handleBudgetChange = (val: string) => {
    const sanitized = val.replace(/\D/g, '')
    setBudgetPesosStr(sanitized)
  }

  const handleSave = async () => {
    if (isSaving) return
    const pesos = parseInt(budgetPesosStr || '0', 10) || 0
    if (pesos <= 0) {
      setSaveError('El presupuesto debe ser mayor a 0.')
      return
    }
    if (!closingDate) {
      setSaveError('Seleccioná una fecha de cierre válida.')
      return
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      await onSaveSettings({
        budgetCents: pesos * 100,
        closingDate,
      })
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Error al guardar los ajustes. Intentá nuevamente.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!onCreateApiToken) return
    const label = newLabel.trim()
    if (!label) return

    setIsCreatingToken(true)
    setTokenCreateError(null)
    try {
      await onCreateApiToken(label)
      setNewLabel('Apple Shortcut')
    } catch (err: any) {
      setTokenCreateError(err?.message || 'Error al generar el token.')
    } finally {
      setIsCreatingToken(false)
    }
  }

  const handleCopy = async (text: string, isUrl = false) => {
    try {
      await navigator.clipboard.writeText(text)
      if (isUrl) {
        setCopiedUrl(true)
        setTimeout(() => setCopiedUrl(false), 2000)
      } else {
        setCopiedToken(true)
        setTimeout(() => setCopiedToken(false), 2000)
      }
    } catch (err) {
      console.error('Failed to copy to clipboard', err)
    }
  }

  const handleRevokeConfirm = async (tokenId: string) => {
    if (!onRevokeApiToken) return
    setRevokingTokenId(tokenId)
    try {
      await onRevokeApiToken(tokenId)
      setTokenToRevokeConfirm(null)
    } catch (err) {
      console.error('Failed to revoke token', err)
    } finally {
      setRevokingTokenId(null)
    }
  }

  const handleSignOutClick = async () => {
    if (!onSignOut) return
    setIsSigningOut(true)
    try {
      await onSignOut()
    } catch (err) {
      console.error('Sign out error', err)
      setIsSigningOut(false)
    }
  }

  const displayPesosNumber = parseInt(budgetPesosStr || '0', 10) || 0
  const formattedBudgetDisplay = displayPesosNumber.toLocaleString('es-AR')

  const formatIsoDate = (isoStr: string | null) => {
    if (!isoStr) return 'Nunca'
    const dateOnly = isoStr.split('T')[0]
    return formatFriendlyDate(dateOnly)
  }

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#0B0E14] px-5 pt-6 pb-[calc(6rem+var(--safe-bottom))] text-[#F8FAFC]">
      {/* Screen Header */}
      <header className="flex justify-between items-center w-full mb-5">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#64748B] leading-[14px]">
            CONFIGURACIÓN
          </div>
          <h1 className="text-[22px] font-bold text-[#FFFFFF] leading-[27px] mt-0.5">
            Ajustes del Ciclo
          </h1>
        </div>

        <div className="w-9 h-9 bg-[#1E293B] rounded-full flex items-center justify-center text-[16px]">
          ⚙️
        </div>
      </header>

      {/* Presupuesto mensual a proteger */}
      <section className="w-full mb-5">
        <label
          htmlFor="budget-input"
          className="block text-[13px] font-medium leading-[16px] text-[#94A3B8] mb-2"
        >
          Presupuesto mensual a proteger
        </label>
        <div className="w-full h-[54px] bg-[#111827] border border-[#2563EB] rounded-[16px] px-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-1">
            <span className="text-[18px] font-bold text-[#FFFFFF]">$</span>
            <input
              id="budget-input"
              type="text"
              inputMode="numeric"
              value={formattedBudgetDisplay}
              onChange={(e) => handleBudgetChange(e.target.value)}
              className="bg-transparent border-none outline-none text-[18px] font-bold text-[#FFFFFF] w-full"
            />
          </div>
          <span className="text-[12px] font-bold leading-[15px] text-[#3B82F6] shrink-0">
            ARS
          </span>
        </div>
      </section>

      {/* Fecha de Cierre de Tarjeta */}
      <section className="w-full mb-5">
        <label
          htmlFor="closing-date-input"
          className="block text-[13px] font-medium leading-[16px] text-[#94A3B8] mb-2"
        >
          Fecha de Cierre de Tarjeta (Fin de ciclo)
        </label>
        <div className="relative w-full h-[54px] bg-[#111827] border border-[#1E293B] rounded-[16px] px-4 flex items-center justify-between focus-within:border-[#2563EB]">
          <input
            id="closing-date-input"
            type="date"
            value={closingDate}
            onChange={(e) => setClosingDate(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-[15px] text-[#F8FAFC] cursor-pointer"
          />
          <span className="text-[16px] pointer-events-none absolute right-4">
            📅
          </span>
        </div>
      </section>



      {/* Explanatory Note Card */}
      <section className="w-full bg-[#0E1B2A] border border-[#1E3A5F] rounded-[20px] p-4 mb-6">
        <div className="text-[11px] font-bold text-[#38BDF8] tracking-wider leading-[14px] mb-2">
          💡 TU OBJETIVO ANTI-DESCONTROL
        </div>
        <p className="text-[12px] leading-[16px] text-[#94A3B8]">
          Al tener la fecha de corte exacta (ej. 30/09) y $100.000 restantes, el sistema te da tu
          límite exacto hoy ($10.000). Si gastas $2.000 hoy, mañana tu límite sube a $10.888.
        </p>
      </section>

      {saveError && (
        <div className="w-full bg-[#450A0A] border border-[#EF4444]/40 rounded-[14px] p-3 mb-4 text-center">
          <p className="text-[12px] text-[#EF4444] font-medium">{saveError}</p>
        </div>
      )}

      {/* Save CTA */}
      <button
        type="button"
        disabled={isSaving}
        onClick={handleSave}
        className="w-full h-[52px] bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-[#FFFFFF] text-[15px] font-bold rounded-[16px] flex items-center justify-center cursor-pointer transition-all shadow-md mb-8"
      >
        {isSaving ? 'GUARDANDO...' : 'GUARDAR CONFIGURACIÓN'}
      </button>

      {/* Acceso Externo (API Tokens & Apple Shortcut) Section */}
      <section className="w-full bg-[#111827] border border-[#1E293B] rounded-[24px] p-5 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Key size={18} className="text-[#38BDF8]" />
          <h2 className="text-[16px] font-bold text-[#FFFFFF]">
            Acceso externo
          </h2>
        </div>
        <p className="text-[12px] text-[#94A3B8] leading-[16px] mb-4">
          Conectá tu Apple Shortcut u otras herramientas externas para registrar gastos por HTTP.
        </p>

        {/* Endpoint URL Display */}
        <div className="mb-5">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5">
            URL del Endpoint
          </span>
          <div className="flex items-center justify-between bg-[#0B0E14] border border-[#1E293B] rounded-[14px] px-3.5 py-2.5">
            <span className="text-[11px] font-mono text-[#F8FAFC] truncate mr-2 select-all">
              {SHORTCUT_ENDPOINT_URL}
            </span>
            <button
              type="button"
              onClick={() => handleCopy(SHORTCUT_ENDPOINT_URL, true)}
              title="Copiar URL"
              className="p-1.5 rounded-[8px] bg-[#1E293B] hover:bg-[#334155] text-[#94A3B8] hover:text-[#FFFFFF] cursor-pointer transition-colors shrink-0"
            >
              {copiedUrl ? <Check size={14} className="text-[#34D399]" /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        {/* Plaintext Token Alert (Shown EXACTLY ONCE) */}
        {createdTokenPlaintext && (
          <div className="w-full bg-[#172554] border border-[#2563EB] rounded-[18px] p-4 mb-5 shadow-lg">
            <div className="flex items-center gap-2 text-[#60A5FA] font-bold text-[12px] mb-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>TOKEN GENERADO EXITOSAMENTE</span>
            </div>
            <p className="text-[12px] text-[#94A3B8] leading-[16px] mb-3">
              Copiá este token ahora. <strong className="text-[#F8FAFC]">No se volverá a mostrar nunca más</strong> por motivos de seguridad.
            </p>
            <div className="flex items-center justify-between bg-[#0B0E14] border border-[#3B82F6]/50 rounded-[12px] px-3 py-2.5 mb-3">
              <span className="text-[12px] font-mono text-[#34D399] select-all break-all mr-2">
                {createdTokenPlaintext}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(createdTokenPlaintext)}
                className="p-1.5 rounded-[8px] bg-[#2563EB] hover:bg-[#1D4ED8] text-[#FFFFFF] cursor-pointer transition-colors shrink-0"
                title="Copiar Token"
              >
                {copiedToken ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              type="button"
              onClick={onDismissPlaintextToken}
              className="w-full py-2 bg-[#1E293B] hover:bg-[#334155] text-[#F8FAFC] text-[12px] font-semibold rounded-[10px] cursor-pointer transition-colors"
            >
              Ya guardé el token
            </button>
          </div>
        )}

        {/* Generate Token Form */}
        <form onSubmit={handleCreateToken} className="mb-5">
          <label
            htmlFor="token-label-input"
            className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-1.5"
          >
            Generar nuevo token
          </label>
          <div className="flex gap-2">
            <input
              id="token-label-input"
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ej. iPhone de Esteban"
              disabled={isCreatingToken || apiTokensLoading}
              className="flex-1 bg-[#0B0E14] border border-[#1E293B] focus:border-[#2563EB] rounded-[14px] px-3 text-[13px] text-[#F8FAFC] outline-none"
            />
            <button
              type="submit"
              disabled={isCreatingToken || apiTokensLoading || !newLabel.trim()}
              className="h-[42px] px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:scale-[0.99] disabled:opacity-50 text-[#FFFFFF] text-[12px] font-bold rounded-[14px] shrink-0 cursor-pointer transition-all"
            >
              {isCreatingToken ? 'Generando...' : 'Crear token'}
            </button>
          </div>
          {tokenCreateError && (
            <span className="block text-[11px] text-[#EF4444] mt-1.5">
              {tokenCreateError}
            </span>
          )}
        </form>

        {/* Existing Tokens List */}
        <div>
          <span className="block text-[11px] font-bold uppercase tracking-wider text-[#64748B] mb-2">
            Tokens existentes
          </span>

          {apiTokens.length === 0 ? (
            <div className="text-[12px] text-[#64748B] italic py-2">
              No tenés tokens creados todavía.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {apiTokens.map((token) => {
                const isRevoked = !!token.revokedAt
                return (
                  <div
                    key={token.id}
                    className="flex items-center justify-between bg-[#0B0E14] border border-[#1E293B] rounded-[14px] p-3"
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#F8FAFC]">
                          {token.label}
                        </span>
                        {isRevoked && (
                          <span className="text-[10px] font-semibold bg-[#450A0A] text-[#EF4444] px-2 py-0.5 rounded-full border border-[#EF4444]/30">
                            Revocado
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#64748B] mt-0.5">
                        Creado: {formatIsoDate(token.createdAt)} • Último uso: {formatIsoDate(token.lastUsedAt)}
                      </span>
                    </div>

                    {!isRevoked && (
                      <div>
                        {tokenToRevokeConfirm === token.id ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleRevokeConfirm(token.id)}
                              disabled={revokingTokenId === token.id}
                              className="px-2.5 py-1 bg-[#EF4444] hover:bg-[#DC2626] text-[#FFFFFF] text-[11px] font-bold rounded-[8px] cursor-pointer transition-colors"
                            >
                              {revokingTokenId === token.id ? '...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setTokenToRevokeConfirm(null)}
                              className="px-2 py-1 bg-[#1E293B] text-[#94A3B8] text-[11px] rounded-[8px] cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setTokenToRevokeConfirm(token.id)}
                            className="p-2 text-[#64748B] hover:text-[#EF4444] rounded-[8px] hover:bg-[#1E293B] cursor-pointer transition-colors"
                            title="Revocar token"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* Sign Out Section */}
      <section className="w-full">
        <button
          type="button"
          onClick={handleSignOutClick}
          disabled={isSigningOut}
          className="w-full h-[48px] bg-[#111827] hover:bg-[#1E293B] border border-[#1E293B] text-[#EF4444] text-[14px] font-semibold rounded-[16px] flex items-center justify-center gap-2 cursor-pointer transition-colors"
        >
          <LogOut size={16} />
          <span>{isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
        </button>
      </section>
    </div>
  )
}
