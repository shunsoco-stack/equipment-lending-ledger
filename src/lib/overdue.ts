import { daysBetween } from "./dates.ts";
import type { Loan } from "./types.ts";

export function overdueDays(loan: Loan, date: string): number {
  return Math.max(0, daysBetween(loan.dueOn, loan.returnedAt?.slice(0, 10) ?? date));
}

export function overdueLoans(loans: Loan[], date: string): Loan[] {
  return loans
    .filter((loan) => !loan.returnedAt && overdueDays(loan, date) > 0)
    .sort((first, second) => first.dueOn.localeCompare(second.dueOn));
}
