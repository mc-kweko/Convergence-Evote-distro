export function parseTimestampMs(value: string | null): number {
  if (!value) return 0

  // Supabase may return timezone-less timestamps; treat them as UTC.
  const hasTimezone = /[zZ]|[+-]\d{2}:\d{2}$/.test(value)
  const normalized = hasTimezone ? value : `${value}Z`
  const ms = Date.parse(normalized)

  return Number.isNaN(ms) ? 0 : ms
}
