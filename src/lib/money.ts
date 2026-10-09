/** All arithmetic happens in integer paise to avoid floating-point drift. */
export const toMinor = (rupees: number): number => Math.round(rupees * 100)
export const fromMinor = (paise: number): number => paise / 100

export function formatINR(rupees: number): string {
  const whole = Number.isInteger(rupees)
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(rupees)
}
