/** ISO date (YYYY-MM-DD) for Monday of the week containing `date`. */
export function weekStartMonday(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatWeekLabel(weekStartYmd: string): string {
  const d = new Date(`${weekStartYmd}T12:00:00`);
  if (Number.isNaN(d.getTime())) return weekStartYmd;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
