import { daysBetween } from "./dates.ts";
import { overdueDays } from "./overdue.ts";
import type { Ledger, Loan } from "./types.ts";

export function byMember(data: Ledger) {
  return data.members
    .map((member) => ({
      member,
      loans: data.loans.filter((loan) => !loan.returnedAt && loan.memberId === member.id),
    }))
    .filter((group) => group.loans.length > 0)
    .sort((first, second) => second.loans.length - first.loans.length);
}

export function filterHistory(
  loans: Loan[],
  filter: { from: string; to: string; itemId?: string; memberId?: string },
) {
  return loans
    .filter(
      (loan) =>
        (!filter.from || loan.lentAt.slice(0, 10) >= filter.from) &&
        (!filter.to || loan.lentAt.slice(0, 10) <= filter.to) &&
        (!filter.itemId || loan.itemId === filter.itemId) &&
        (!filter.memberId || loan.memberId === filter.memberId),
    )
    .sort((first, second) => second.lentAt.localeCompare(first.lentAt));
}

export function historyStats(loans: Loan[]) {
  const returned = loans.filter((loan) => loan.returnedAt);
  const counts = new Map<string, { name: string; count: number }>();

  for (const loan of loans) {
    const old = counts.get(loan.itemId);
    counts.set(loan.itemId, { name: loan.itemName, count: (old?.count ?? 0) + 1 });
  }

  return {
    count: loans.length,
    averageDays: returned.length
      ? returned.reduce((sum, loan) => sum + daysBetween(loan.lentAt, loan.returnedAt!), 0) /
        returned.length
      : 0,
    lateRate: returned.length
      ? (returned.filter((loan) => overdueDays(loan, loan.returnedAt!) > 0).length /
          returned.length) *
        100
      : 0,
    topItems: [...counts.values()].sort((first, second) => second.count - first.count).slice(0, 5),
  };
}
