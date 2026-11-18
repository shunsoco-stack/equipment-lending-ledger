import { validDate, validTimestamp, japanNow } from "./dates.ts";
import { categories } from "./items.ts";
import type { Ledger } from "./types.ts";

type Row = Record<string, unknown>;

function object(value: unknown): value is Row {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function strings(row: Row, fields: string[]) {
  return fields.every(
    (field) => typeof row[field] === "string" && (row[field] as string).length <= 10000,
  );
}

function unique(rows: Row[], key: string) {
  return new Set(rows.map((row) => row[key])).size === rows.length;
}

export function validateLedger(value: unknown, now: Date = new Date()): Ledger {
  const fail = () => {
    throw new Error("バックアップの形式またはデータの整合性が正しくありません。");
  };

  if (
    !object(value) ||
    value.version !== 1 ||
    !Array.isArray(value.items) ||
    !Array.isArray(value.members) ||
    !Array.isArray(value.loans)
  )
    return fail();

  const { items, members, loans } = value;
  if (
    [items, members, loans].some(
      (rows) => rows.length > 50000 || !rows.every(object) || !unique(rows, "id"),
    )
  )
    return fail();

  const stamp = japanNow(now);
  if (
    !items.every(
      (row) =>
        strings(row, ["id", "code", "name", "category", "location", "registeredBy", "note"]) &&
        row.id &&
        row.name.trim() &&
        row.location.trim() &&
        row.registeredBy.trim() &&
        /^[A-Z0-9]+(?:-[A-Z0-9]+)+$/.test(row.code) &&
        categories.includes(row.category) &&
        validDate(row.registeredOn) &&
        row.registeredOn <= stamp.slice(0, 10),
    ) ||
    !unique(items, "code")
  )
    return fail();

  if (
    !members.every(
      (row) =>
        strings(row, ["id", "name", "department"]) &&
        row.id &&
        row.name.trim() &&
        row.department.trim() &&
        typeof row.active === "boolean",
    )
  )
    return fail();

  for (const row of loans) {
    if (
      !strings(row, [
        "id",
        "itemId",
        "itemName",
        "itemCode",
        "memberId",
        "memberName",
        "purpose",
        "condition",
      ]) ||
      !row.id ||
      !row.itemName ||
      !row.memberName ||
      !validTimestamp(row.lentAt) ||
      row.lentAt > stamp ||
      !validDate(row.dueOn) ||
      row.dueOn < row.lentAt.slice(0, 10)
    )
      return fail();

    if (row.returnedAt === null) {
      if (
        row.receivedBy !== null ||
        row.receiverName !== null ||
        !items.some((item) => item.id === row.itemId) ||
        !members.some((member) => member.id === row.memberId)
      )
        return fail();
    } else if (
      !validTimestamp(row.returnedAt) ||
      row.returnedAt < row.lentAt ||
      row.returnedAt > stamp ||
      typeof row.receivedBy !== "string" ||
      !row.receivedBy ||
      typeof row.receiverName !== "string" ||
      !row.receiverName.trim()
    )
      return fail();

    const item = items.find((item) => item.id === row.itemId);
    if (item && item.registeredOn > row.lentAt.slice(0, 10)) return fail();
  }

  const grouped = new Map<string, Row[]>();

  for (const loan of loans) {
    const group = grouped.get(loan.itemId) ?? [];
    group.push(loan);
    grouped.set(loan.itemId, group);
  }

  for (const group of grouped.values()) {
    group.sort((first, second) => (first.lentAt as string).localeCompare(second.lentAt as string));

    for (let index = 1; index < group.length; index++) {
      const previous = group[index - 1];
      if (!previous.returnedAt || (previous.returnedAt as string) > (group[index].lentAt as string))
        return fail();
    }
  }

  return structuredClone(value) as Ledger;
}

export function exportBackup(data: Ledger): string {
  return JSON.stringify(data, null, 2);
}

export function importBackup(text: string, now: Date = new Date()): Ledger {
  if (text.length > 20_000_000) throw new Error("ファイルが大きすぎます（上限20MB）。");
  let value: unknown;

  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("JSONファイルを読み込めません。");
  }

  return validateLedger(value, now);
}
