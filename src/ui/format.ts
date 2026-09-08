/**
 * Formats a money amount in cents to es-AR ARS currency string without decimals.
 * Example: 1000000 cents -> '$ 10.000'
 * Example: -350000 cents -> '-$ 3.500'
 */
export function formatArs(amountCents: number): string {
  const pesos = Math.round(amountCents / 100)
  const isNegative = pesos < 0
  const absPesos = Math.abs(pesos)
  const formattedNumber = absPesos.toLocaleString('es-AR')

  if (isNegative) {
    return `-$ ${formattedNumber}`
  }
  return `$ ${formattedNumber}`
}

/**
 * Formats a raw pesos amount directly.
 * Example: 10000 pesos -> '$ 10.000'
 */
export function formatPesos(pesos: number): string {
  const isNegative = pesos < 0
  const absPesos = Math.abs(Math.round(pesos))
  const formattedNumber = absPesos.toLocaleString('es-AR')

  if (isNegative) {
    return `-$ ${formattedNumber}`
  }
  return `$ ${formattedNumber}`
}

