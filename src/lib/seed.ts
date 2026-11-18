import { addDays, today } from "./dates.ts";
import {
  itemCatalog,
  memberCatalog,
  projects,
  itemPurposes,
  returnNotes,
  lateReturnNotes,
} from "./seed-catalog.ts";
import type { Ledger, Loan } from "./types.ts";

export const seedItemIds = itemCatalog.map((_entry, index) => `item-${index + 1}`);

export const seedMemberIds = memberCatalog.map((_entry, index) => `member-${index + 1}`);

export function createSeed(now: Date): Ledger {
  const date = today(now);
  let state = 93817;
  const random = () => {
    state = (state * 16807) % 2147483647;

    return state / 2147483647;
  };

  const members = memberCatalog.map(([name, department], index) => ({
    id: seedMemberIds[index],
    name,
    department,
    active: index !== 6,
  }));

  const items = itemCatalog.map(([code, name, category, location, note], index) => ({
    id: seedItemIds[index],
    code,
    name,
    category,
    location,
    note,
    registeredOn: addDays(date, -400 - Math.floor(random() * 620)),
    registeredBy: members[[5, 1, 4][Math.floor(random() * 3)]].name,
  }));

  const active = [
    { item: 0, member: 0, ago: 16, due: -9 },
    { item: 2, member: 2, ago: 8, due: -2 },
    { item: 3, member: 0, ago: 4, due: 0 },
    { item: 4, member: 1, ago: 2, due: 3 },
    { item: 14, member: 3, ago: 1, due: 6 },
  ];

  const loans: Loan[] = [];
  const pick = <Value>(values: readonly Value[]): Value =>
    values[Math.floor(random() * values.length)];
  const monthlyProjects = new Map<string, string[]>();
  const usedPurposes = new Set<string>();
  const clock = () =>
    `${String(9 + Math.floor(random() * 10)).padStart(2, "0")}:${String(Math.floor(random() * 60)).padStart(2, "0")}`;

  // 各備品の履歴を独立した不規則な間隔で生成し、重複貸出を避ける。
  const frequencies = [14, 9, 6, 5, 4, 4, 2, 3, 7, 3, 2, 2, 5, 4, 3];
  items.forEach((item, index) => {
    const start = (index === 8 ? -255 : -330) + Math.floor(random() * 70);
    const current = active.find((entry) => entry.item === index);
    const recentOffsets: Record<number, number> = { 1: -2, 5: -5, 8: -9, 12: -7, 13: -12 };
    const end = current
      ? -current.ago - 1
      : (recentOffsets[index] ?? -18 - Math.floor(random() * 55));
    const gaps = Array.from({ length: frequencies[index] - 1 }, () => 0.5 + random());
    const totalWeight = gaps.reduce((sum, weight) => sum + weight, 0);
    const extraDays = end - start - 15 * gaps.length;
    let cursor = start;

    for (let occurrence = 0; occurrence < frequencies[index]; occurrence++) {
      // 最短15日間隔を確保し、残りの日数を不均等に配分する。
      // これにより1〜14日の貸出が重ならず、毎回の間隔も一定にならない。
      if (occurrence > 0) cursor += 15 + (extraDays * gaps[occurrence - 1]) / totalWeight;
      const offset = Math.floor(cursor);
      const duration = 1 + Math.floor(random() * 14);
      const memberIndex =
        offset < -200 && random() < 0.12
          ? 6
          : random() < 0.65
            ? [0, 4, 1, 0, 2, 4, 3, 1, 4, 2, 3, 5, 0, 0, 2][index]
            : Math.floor(random() * 6);

      const member = members[memberIndex];
      const returnedOn = addDays(date, offset);
      const lentOn = addDays(returnedOn, -duration);
      const late = random() < 0.19 ? 1 + Math.floor(random() * Math.min(4, duration)) : 0;
      const month = lentOn.slice(0, 7);
      if (!monthlyProjects.has(month)) {
        const choices = [...projects];
        monthlyProjects.set(
          month,
          Array.from(
            { length: 3 },
            () => choices.splice(Math.floor(random() * choices.length), 1)[0],
          ),
        );
      }

      const focusProjects = monthlyProjects.get(month)!;
      let purpose = `${pick(random() < 0.75 ? focusProjects : projects)}：${pick(itemPurposes[index])}`;

      // 同じ用途の連発を避けつつ、月内の案件には偏りを残す。
      for (let attempt = 0; usedPurposes.has(purpose) && attempt < 20; attempt++) {
        purpose = `${pick(projects)}：${pick(itemPurposes[index])}`;
      }

      usedPurposes.add(purpose);
      const eligibleReceivers = members.filter(
        (candidate) => candidate.active && candidate.id !== member.id,
      );
      const receiver =
        member.id !== members[5].id && random() < 0.63
          ? members[5]
          : pick(eligibleReceivers.filter((candidate) => candidate.id !== members[5].id));

      loans.push({
        id: `history-${loans.length + 1}`,
        itemId: item.id,
        itemName: item.name,
        itemCode: item.code,
        memberId: member.id,
        memberName: member.name,
        lentAt: `${lentOn} ${clock()}`,
        dueOn: addDays(lentOn, duration - late),
        purpose,
        returnedAt: `${returnedOn} ${clock()}`,
        receivedBy: receiver.id,
        receiverName: receiver.name,
        condition: "",
      });
    }
  });

  // 履歴をシャッフルし、メモを重複なく配る。遅延理由は遅れた返却だけに付ける。
  const noteCandidates = [...loans];

  for (let index = noteCandidates.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1));
    [noteCandidates[index], noteCandidates[swapIndex]] = [
      noteCandidates[swapIndex],
      noteCandidates[index],
    ];
  }

  const delayed = noteCandidates.filter((loan) => loan.returnedAt!.slice(0, 10) > loan.dueOn);
  lateReturnNotes.forEach((note, index) => {
    if (delayed[index]) delayed[index].condition = note;
  });
  const availableNotes = returnNotes.map((notes) => [...notes]);
  let noteCount = loans.filter((loan) => loan.condition).length;

  for (const loan of noteCandidates) {
    if (noteCount >= 22) break;
    if (loan.condition) continue;
    const notes = availableNotes[seedItemIds.indexOf(loan.itemId)];
    if (!notes.length) continue;
    loan.condition = notes.splice(Math.floor(random() * notes.length), 1)[0];
    noteCount++;
  }

  active.forEach((entry, index) => {
    const item = items[entry.item];
    const member = members[entry.member];
    loans.push({
      id: `active-${index + 1}`,
      itemId: item.id,
      itemName: item.name,
      itemCode: item.code,
      memberId: member.id,
      memberName: member.name,
      lentAt: `${addDays(date, -entry.ago)} ${clock()}`,
      dueOn: addDays(date, entry.due),
      purpose: [
        "潮風通りの店舗インタビュー",
        "秋の企画合宿・資料編集",
        "手仕事展の作品物撮り",
        "新人向けデザイン勉強会",
        "絵本フェアの受付アンケート",
      ][index],
      returnedAt: null,
      receivedBy: null,
      receiverName: null,
      condition: "",
    });
  });

  return { version: 1, items, members, loans };
}
