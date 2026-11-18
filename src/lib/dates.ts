const DAY = 86_400_000;

export function japanNow(now: Date = new Date()): string {
  return new Date(now.getTime() + 9 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
}

export function today(now: Date = new Date()): string {
  return japanNow(now).slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(date + "T00:00:00Z") + days * DAY).toISOString().slice(0, 10);
}

export function daysBetween(from: string, endDate: string): number {
  return Math.round(
    (Date.parse(endDate.slice(0, 10) + "T00:00:00Z") -
      Date.parse(from.slice(0, 10) + "T00:00:00Z")) /
      DAY,
  );
}

export function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + "T00:00:00Z");

  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function validTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    validDate(value.slice(0, 10)) &&
    /^\d{4}-\d{2}-\d{2} ([01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

export function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;
}
