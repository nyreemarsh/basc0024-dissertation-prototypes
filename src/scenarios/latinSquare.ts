/**
 * Latin square counterbalancing for prototype order.
 *
 * The 4×4 balanced Latin square ensures each prototype appears exactly once
 * in each position across the 4-participant cycle. The cycle repeats for
 * P5–P8, P9–P12, giving 12 participants total (3 complete cycles).
 *
 * Position labels shown to participants ("Prototype 1–4") are always in
 * the same fixed order. The UNDERLYING prototype (A–D) at each position
 * depends on the participant's row.
 */

const LATIN_SQUARE_ROWS: Array<[string, string, string, string]> = [
  ["A", "B", "C", "D"], // P1, P5, P9
  ["B", "C", "D", "A"], // P2, P6, P10
  ["C", "D", "A", "B"], // P3, P7, P11
  ["D", "A", "B", "C"], // P4, P8, P12
];

/**
 * Returns the 4-prototype ordering for a given participant ID, or null
 * if the PID is invalid.
 *
 * Valid PIDs: P1 through P12 (case-sensitive, no leading zeros).
 */
export function getPrototypeOrder(
  pid: string
): [string, string, string, string] | null {
  const match = pid.match(/^P(\d+)$/);
  if (!match) return null;
  const n = parseInt(match[1], 10);
  if (n < 1 || n > 12) return null;
  return LATIN_SQUARE_ROWS[(n - 1) % 4];
}
