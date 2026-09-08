export interface CategoryConfig {
  id: string
  label: string
  emoji: string
  bg: string
}

export const CATEGORIES: readonly CategoryConfig[] = [
  { id: 'comida', label: 'Comida', emoji: '🍔', bg: '#1E1B4B' },
  { id: 'super', label: 'Súper', emoji: '🛒', bg: '#064E3B' },
  { id: 'viaje', label: 'Viaje', emoji: '🚗', bg: '#172554' },
  { id: 'varios', label: 'Varios', emoji: '🛍️', bg: '#1E293B' },
] as const

export const CATEGORY_MAP: Record<string, CategoryConfig> = Object.fromEntries(
  CATEGORIES.map((cat) => [cat.id, cat])
)

export const DEFAULT_CATEGORY = CATEGORIES[3] // varios
