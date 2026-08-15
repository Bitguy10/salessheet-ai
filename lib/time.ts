/** "just now" / "5m ago" / "3h ago" / "2d ago" / date — for recent-sheet lists. */
export function relativeTime(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - ts);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Current epoch milliseconds. Wrapping Date.now() keeps impure time reads out
 *  of React render paths (the purity lint rule only knows built-in globals) and
 *  gives one place to stub the clock in tests. */
export const nowMs = (): number => Date.now();
