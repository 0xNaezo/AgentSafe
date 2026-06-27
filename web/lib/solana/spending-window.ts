/**
 * Client-side mirror of the on-chain lazy-reset logic
 * (see execute_payment.rs).
 *
 * The smart-contract uses **epoch-aligned** windows — it divides
 * unix timestamps by 86 400 (day) / 3 600 (hour) and compares
 * the resulting integer "day number" / "hour number".
 * Resets only happen lazily, inside `execute_payment`.
 *
 * This function reproduces the same math so the UI can show
 * the *effective* spent amounts without waiting for a tx.
 */

const SECONDS_PER_DAY = 86_400;
const SECONDS_PER_HOUR = 3_600;

export function getEffectiveSpent(
  spentToday: number,
  spentHour: number,
  lastResetTime: number, // unix seconds (from on-chain i64)
): { effectiveDaily: number; effectiveHourly: number } {
  const now = Math.floor(Date.now() / 1000);

  const lastDay = Math.floor(lastResetTime / SECONDS_PER_DAY);
  const currentDay = Math.floor(now / SECONDS_PER_DAY);

  const lastHour = Math.floor(lastResetTime / SECONDS_PER_HOUR);
  const currentHour = Math.floor(now / SECONDS_PER_HOUR);

  // New day → both counters reset
  if (currentDay > lastDay) {
    return { effectiveDaily: 0, effectiveHourly: 0 };
  }

  // Same day, but new hour → only hourly counter resets
  if (currentHour > lastHour) {
    return { effectiveDaily: spentToday, effectiveHourly: 0 };
  }

  // Same hour — show raw on-chain values
  return { effectiveDaily: spentToday, effectiveHourly: spentHour };
}
