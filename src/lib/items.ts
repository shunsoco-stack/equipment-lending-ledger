import { validDate, today } from "./dates.ts";
import { currentLoan } from "./lending.ts";
import type { Item, Ledger } from "./types.ts";

export const categories = [
  "カメラ・映像",
  "PC・タブレット",
  "ディスプレイ",
  "測定器",
  "工具",
  "撮影補助",
];

export function saveItem(data: Ledger, item: Item, now: Date): Ledger {
  const clean = Object.fromEntries(
    Object.entries(item).map(([key, value]) => [key, value.trim()]),
  ) as Item;

  if (
    !clean.id ||
    !clean.name ||
    !clean.location ||
    !clean.registeredBy ||
    !categories.includes(clean.category)
  )
    throw new Error("必須項目を入力してください。");

  if (!/^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(clean.code))
    throw new Error(
      "管理番号は UMI-CAM-003 のような半角英大文字・数字・ハイフンで入力してください。",
    );

  if (data.items.some((row) => row.code === clean.code && row.id !== clean.id))
    throw new Error("この管理番号は登録済みです。");

  if (!validDate(clean.registeredOn) || clean.registeredOn > today(now))
    throw new Error("登録日は今日以前にしてください。");

  return {
    ...data,
    items: data.items.some((row) => row.id === clean.id)
      ? data.items.map((row) => (row.id === clean.id ? clean : row))
      : [...data.items, clean],
  };
}

export function deleteItem(data: Ledger, recordId: string): Ledger {
  if (currentLoan(data, recordId)) throw new Error("貸出中の備品は削除できません。");

  return { ...data, items: data.items.filter((item) => item.id !== recordId) };
}
