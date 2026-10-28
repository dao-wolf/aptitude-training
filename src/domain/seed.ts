// The seed is the one value a visitor controls through the address bar, so it
// is allow-listed, capped and never echoed back as markup.

const SEED_PATTERN = /^[a-z0-9]{1,12}$/i

/** A seed from the address bar, or null if it isn't a short run of letters and digits. */
export function parseSeed(input: string | null | undefined): number | null {
  if (typeof input !== "string" || !SEED_PATTERN.test(input)) return null
  const n = parseInt(input, 36)
  return Number.isSafeInteger(n) ? n % 4294967296 : null
}

/** The address-bar form of a seed. */
export function formatSeed(seed: number): string {
  return (seed >>> 0).toString(36)
}
