/**
 * Money formatter for TND (Tunisian Dinar).
 * All amounts in the codebase are stored as millimes (1 TND = 1000 millimes).
 */

const formatter = new Intl.NumberFormat('fr-TN', {
  style: 'decimal',
  minimumFractionDigits: 3,
  maximumFractionDigits: 3,
})

/**
 * Formats a millime amount as a human-readable TND string.
 *
 * @example formatTND(80_000) // "80,000 DT"
 * @example formatTND(20_500) // "20,500 DT"
 */
export function formatTND(millimes: number): string {
  const dinars = millimes / 1000
  return `${formatter.format(dinars)} DT`
}
