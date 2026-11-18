import { japanNow, today, validDate } from "./dates.ts";
import type { Ledger, Loan } from "./types.ts";

export function currentLoan(data: Ledger, itemId: string): Loan | undefined {
  return data.loans.find((loan) => loan.itemId === itemId && !loan.returnedAt);
}

export function lend(
  data: Ledger,
  input: { id: string; itemId: string; memberId: string; dueOn: string; purpose: string },
  now: Date,
): Ledger {
  const item = data.items.find((item) => item.id === input.itemId);
  const member = data.members.find((member) => member.id === input.memberId);
  if (!item) throw new Error("備品が見つかりません。");
  if (currentLoan(data, item.id)) throw new Error("この備品は貸出中です。先に返却してください。");
  if (!member?.active) throw new Error("有効なメンバーを選択してください。");
  if (!validDate(input.dueOn) || input.dueOn < today(now))
    throw new Error("返却予定日は今日以降にしてください。");

  if (!input.id || data.loans.some((loan) => loan.id === input.id))
    throw new Error("記録IDが重複しています。");

  return {
    ...data,
    loans: [
      ...data.loans,
      {
        ...input,
        itemName: item.name,
        itemCode: item.code,
        memberName: member.name,
        lentAt: japanNow(now),
        returnedAt: null,
        receivedBy: null,
        receiverName: null,
        condition: "",
      },
    ],
  };
}

export function returnItem(
  data: Ledger,
  itemId: string,
  receiverId: string,
  condition: string,
  now: Date,
): Ledger {
  const loan = currentLoan(data, itemId);
  const receiver = data.members.find((member) => member.id === receiverId);
  if (!loan) throw new Error("この備品は貸出されていません。");
  if (!receiver) throw new Error("受け取った担当者を選択してください。");
  if (japanNow(now) < loan.lentAt) throw new Error("返却日時が貸出日時より前です。");

  return {
    ...data,
    loans: data.loans.map((row) =>
      row.id === loan.id
        ? {
            ...row,
            returnedAt: japanNow(now),
            receivedBy: receiver.id,
            receiverName: receiver.name,
            condition: condition.trim(),
          }
        : row,
    ),
  };
}
