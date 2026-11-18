import { daysBetween } from "./dates.ts";
import { overdueDays } from "./overdue.ts";
import type { Loan } from "./types.ts";

export function csv(rows: (string | number)[][]): string {
  return (
    "\uFEFF" +
    rows
      .map((row) =>
        row
          .map((value) => {
            const text = String(value);
            const safe = /^[=+@\-\t\r\n]/.test(text) ? "'" + text : text;

            return '"' + safe.replaceAll('"', '""') + '"';
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function historyFilename(from: string, endDate: string) {
  return `貸出返却履歴_${from}_${endDate}.csv`;
}

export function lendingFilename(date: string) {
  return `貸出中備品一覧_${date}.csv`;
}

export function historyCSV(loans: Loan[], date: string) {
  return csv([
    [
      "貸出日時",
      "管理番号",
      "備品",
      "借りた人",
      "返却予定日",
      "返却日時",
      "受け取った人",
      "貸出日数",
      "遅延有無",
      "用途メモ",
      "状態メモ",
    ],
    ...loans.map((loan) => [
      loan.lentAt,
      loan.itemCode,
      loan.itemName,
      loan.memberName,
      loan.dueOn,
      loan.returnedAt ?? "",
      loan.receiverName ?? "",
      daysBetween(loan.lentAt, loan.returnedAt ?? date),
      overdueDays(loan, date) > 0 ? "遅延あり" : "なし",
      loan.purpose,
      loan.condition,
    ]),
  ]);
}

export function lendingCSV(loans: Loan[], date: string) {
  return csv([
    ["管理番号", "備品", "借りている人", "貸出日時", "返却予定日", "遅延日数"],
    ...loans
      .filter((loan) => !loan.returnedAt)
      .map((loan) => [
        loan.itemCode,
        loan.itemName,
        loan.memberName,
        loan.lentAt,
        loan.dueOn,
        overdueDays(loan, date),
      ]),
  ]);
}
