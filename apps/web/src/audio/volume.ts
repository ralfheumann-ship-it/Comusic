// Knob volume mapping used by both the per-loop instrument knob and the
// client-side master knob.
//
// 0% → -60 dB (effectively silent)
// 50% → 0 dB (no change relative to the instrument's baked-in balance)
// 100% → +6 dB (boost)
//
// Piecewise linear in dB. The "knob at 50%" position is the unity reference,
// so a fresh project sounds the same as the per-instrument balancing intended.
export const VOLUME_NEUTRAL_PCT = 50
export const VOLUME_MIN_DB = -60
export const VOLUME_MAX_DB = 6

export function pctToDb(pct: number): number {
  const p = Math.max(0, Math.min(100, pct))
  if (p <= 0) return VOLUME_MIN_DB
  if (p >= VOLUME_NEUTRAL_PCT) {
    return ((p - VOLUME_NEUTRAL_PCT) / (100 - VOLUME_NEUTRAL_PCT)) * VOLUME_MAX_DB
  }
  return VOLUME_MIN_DB + (p / VOLUME_NEUTRAL_PCT) * -VOLUME_MIN_DB
}
