import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/lib/seed.ts";
import { today, japanNow, addDays, daysBetween, validDate } from "../src/lib/dates.ts";
import { overdueDays, overdueLoans } from "../src/lib/overdue.ts";
import { currentLoan, lend, returnItem } from "../src/lib/lending.ts";
import { saveItem, deleteItem } from "../src/lib/items.ts";
import { saveMember, deleteMember } from "../src/lib/members.ts";
import { byMember, filterHistory, historyStats } from "../src/lib/stats.ts";
import { qrContent, interpretQR, qrSvg } from "../src/lib/qrcode.ts";
import { csv, historyCSV, lendingCSV, historyFilename, lendingFilename } from "../src/lib/csv.ts";
import { exportBackup, importBackup, validateLedger } from "../src/lib/backup.ts";
import { loadStored, STORAGE_KEY } from "../src/lib/storage.ts";
import { recordPath } from "../src/lib/routes.ts";
import { projects, itemPurposes, lateReturnNotes } from "../src/lib/seed-catalog.ts";

const now = new Date("2026-11-18T12:34:00+09:00");

const make = () => createSeed(now);

const input = {
  id: "test-loan",
  itemId: "item-2",
  memberId: "member-1",
  dueOn: today(now),
  purpose: "テスト撮影",
};

const moments = [
  "2026-11-18T00:01:00+09:00",
  "2026-11-18T00:20:00+09:00",
  "2026-11-18T08:00:00+09:00",
  "2026-11-18T12:00:00+09:00",
  "2026-11-18T23:59:00+09:00",
  "2026-01-01T00:00:00+09:00",
  "2026-02-28T23:59:00+09:00",
  "2028-02-29T00:01:00+09:00",
  "2026-12-31T23:59:00+09:00",
  "2026-10-31T15:00:00Z",
];

for (const moment of moments) {
  test(`シードの記録は現在より前：${moment}`, () => {
    const clock = new Date(moment);
    const data = createSeed(clock);
    const stamp = japanNow(clock);
    assert.ok(data.items.every((item) => item.registeredOn < today(clock)));
    assert.ok(
      data.items.every(
        (item) =>
          daysBetween(item.registeredOn, today(clock)) >= 365 &&
          daysBetween(item.registeredOn, today(clock)) <= 1096,
      ),
    );

    for (const loan of data.loans) {
      assert.ok(loan.lentAt < stamp);
      assert.ok(!loan.returnedAt || loan.returnedAt < stamp);
      assert.ok(Number(loan.lentAt.slice(11, 13)) >= 9 && Number(loan.lentAt.slice(11, 13)) < 19);
      assert.ok(data.items.find((item) => item.id === loan.itemId).registeredOn < loan.lentAt);
    }

    assert.doesNotThrow(() => validateLedger(data, clock));
  });

  test(`遅延2件・9日と2日・当日返却予定は期限内：${moment}`, () => {
    const clock = new Date(moment);
    const data = createSeed(clock);
    const date = today(clock);
    assert.deepEqual(
      overdueLoans(data.loans, date).map((loan) => overdueDays(loan, date)),
      [9, 2],
    );

    assert.equal(data.loans.filter((loan) => !loan.returnedAt).length, 5);
    assert.equal(
      overdueDays(
        data.loans.find((loan) => !loan.returnedAt && loan.dueOn === date),
        date,
      ),
      0,
    );
  });
}

test("日本時間はUTCから9時間進む", () =>
  assert.equal(japanNow(new Date("2026-01-01T15:12:00Z")), "2026-01-02 00:12"));

test("月をまたいで加算できる", () => assert.equal(addDays("2026-01-31", 1), "2026-02-01"));

test("閏年を含む日数計算", () => assert.equal(daysBetween("2028-02-28", "2028-03-01"), 2));

test("不正な暦日を拒否", () => {
  assert.equal(validDate("2026-02-29"), false);
  assert.equal(validDate("2026-13-01"), false);
});

test("QRの生成内容を解釈して同じ備品に戻る", () => {
  const data = make();

  for (const item of data.items) assert.equal(interpretQR(qrContent(item), data).item.id, item.id);
});

test("QRの貸出中は返却へ", () => assert.equal(interpretQR("UMI-CAM-001", make()).action, "return"));

test("QRの貸出可能は貸出へ", () =>
  assert.equal(interpretQR(" UMI-CAM-002\n", make()).action, "lend"));

test("不明なQRはエラー", () => assert.throws(() => interpretQR("https://example.com/", make())));

test("空のQRはエラー", () => assert.throws(() => interpretQR("", make())));

test("qrcodeのSVGが生成される", async () => {
  const svg = await qrSvg(make().items[0]);
  assert.match(svg, /<svg[^>]+xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /viewBox=/);
  assert.match(svg, /<path/);
  assert.ok(svg.endsWith("</svg>\n") || svg.endsWith("</svg>"));
});

test("貸出を記録し元データを変更しない", () => {
  const data = make();
  const next = lend(data, input, now);
  assert.equal(next.loans.length, data.loans.length + 1);
  assert.equal(currentLoan(next, input.itemId).lentAt, japanNow(now));
  assert.equal(currentLoan(data, input.itemId), undefined);
});

test("二重貸出不可", () =>
  assert.throws(() => lend(lend(make(), input, now), { ...input, id: "second" }, now)));

test("休止メンバーへ貸出不可", () =>
  assert.throws(() => lend(make(), { ...input, memberId: "member-7" }, now)));

test("存在しないメンバーへ貸出不可", () =>
  assert.throws(() => lend(make(), { ...input, memberId: "unknown" }, now)));

test("存在しない備品の貸出不可", () =>
  assert.throws(() => lend(make(), { ...input, itemId: "unknown" }, now)));

test("過去の予定日を拒否", () =>
  assert.throws(() => lend(make(), { ...input, dueOn: addDays(today(now), -1) }, now)));

test("不正な予定日を拒否", () =>
  assert.throws(() => lend(make(), { ...input, dueOn: "invalid" }, now)));

test("貸出ID重複を拒否", () =>
  assert.throws(() => lend(make(), { ...input, id: "active-1" }, now)));

test("返却時に担当・メモ・日時が残る", () => {
  const next = returnItem(make(), "item-1", "member-6", "ケーブル確認", now);
  const loan = next.loans.find((loan) => loan.id === "active-1");
  assert.equal(loan.returnedAt, japanNow(now));
  assert.equal(loan.receivedBy, "member-6");
  assert.equal(loan.condition, "ケーブル確認");
  assert.equal(currentLoan(next, "item-1"), undefined);
});

test("二重返却不可", () =>
  assert.throws(() =>
    returnItem(returnItem(make(), "item-1", "member-6", "", now), "item-1", "member-6", "", now),
  ));

test("未貸出の返却不可", () =>
  assert.throws(() => returnItem(make(), "item-2", "member-6", "", now)));

test("担当者なしの返却不可", () =>
  assert.throws(() => returnItem(make(), "item-1", "unknown", "", now)));

test("貸出前への返却日時変更不可", () =>
  assert.throws(() => returnItem(make(), "item-1", "member-6", "", new Date("2020-01-01"))));

test("返却後の遅延日数は固定される", () => {
  const next = returnItem(make(), "item-1", "member-6", "", now);
  assert.equal(
    overdueDays(
      next.loans.find((loan) => loan.id === "active-1"),
      "2030-01-01",
    ),
    9,
  );
});

test("貸出中備品は削除不可", () => assert.throws(() => deleteItem(make(), "item-1")));

test("貸出中メンバーは削除不可", () => assert.throws(() => deleteMember(make(), "member-1")));

test("未貸出備品を削除して履歴を保持", () => {
  const data = make();
  const next = deleteItem(data, "item-2");
  assert.equal(next.items.length, 14);
  assert.equal(next.loans.length, data.loans.length);
  assert.doesNotThrow(() => validateLedger(next, now));
});

test("貸出のないメンバーを削除して履歴を保持", () => {
  const data = make();
  const next = deleteMember(data, "member-7");
  assert.equal(next.members.length, 6);
  assert.equal(next.loans.length, data.loans.length);
});

test("備品を追加", () => {
  const data = make();
  assert.equal(
    saveItem(data, { ...data.items[0], id: "new", code: "UMI-NEW-001" }, now).items.length,
    16,
  );
});

test("備品を編集", () => {
  const data = make();
  assert.equal(
    saveItem(data, { ...data.items[0], name: "新しい名前" }, now).items[0].name,
    "新しい名前",
  );
});

test("管理番号重複不可", () => {
  const data = make();
  assert.throws(() => saveItem(data, { ...data.items[1], code: data.items[0].code }, now));
});

test("不正な管理番号を拒否", () =>
  assert.throws(() => saveItem(make(), { ...make().items[0], code: "あいう" }, now)));

test("未来の登録日を拒否", () =>
  assert.throws(() =>
    saveItem(make(), { ...make().items[0], registeredOn: addDays(today(now), 1) }, now),
  ));

test("備品の空白名を拒否", () =>
  assert.throws(() => saveItem(make(), { ...make().items[0], name: " " }, now)));

test("メンバーの追加", () =>
  assert.equal(
    saveMember(make(), { id: "new", name: "架空 太郎", department: "企画", active: true }).members
      .length,
    8,
  ));

test("メンバーの休止への変更", () =>
  assert.equal(
    saveMember(make(), { ...make().members[0], active: false }).members[0].active,
    false,
  ));

test("空のメンバー名を拒否", () =>
  assert.throws(() => saveMember(make(), { ...make().members[0], name: " " })));

test("誰が借りているかを件数降順に集計", () => {
  const groups = byMember(make());
  assert.equal(groups[0].member.id, "member-1");
  assert.equal(groups[0].loans.length, 2);
  assert.equal(
    groups.reduce((sum, group) => sum + group.loans.length, 0),
    5,
  );
});

test("期間・備品・メンバーで履歴を絞る", () => {
  const data = make();
  const loan = data.loans[0];
  const rows = filterHistory(data.loans, {
    from: loan.lentAt.slice(0, 10),
    to: loan.lentAt.slice(0, 10),
    itemId: loan.itemId,
    memberId: loan.memberId,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].id, loan.id);
});

test("返却済みのみで平均と遅延率を算出", () => {
  const base = make().loans[0];
  const stats = historyStats([
    { ...base, lentAt: "2026-01-01 10:00", returnedAt: "2026-01-03 10:00", dueOn: "2026-01-02" },
    {
      ...base,
      id: "second",
      lentAt: "2026-01-01 10:00",
      returnedAt: "2026-01-05 10:00",
      dueOn: "2026-01-05",
    },
    { ...base, id: "third", returnedAt: null },
  ]);

  assert.equal(stats.count, 3);
  assert.equal(stats.averageDays, 3);
  assert.equal(stats.lateRate, 50);
});

test("空の集計は0", () => {
  const stats = historyStats([]);
  assert.equal(stats.averageDays, 0);
  assert.equal(stats.lateRate, 0);
});

test("トップ5は最多順", () => {
  const top = historyStats(make().loans).topItems;
  assert.equal(top.length, 5);
  assert.equal(top[0].name, make().items[0].name);
  assert.ok(top.every((item, index) => !index || top[index - 1].count >= item.count));
});

test("CSVはBOM・改行・引用符に対応", () =>
  assert.equal(csv([["a,b", '"c"', "a\nb"]]), '\uFEFF"a,b","""c""","a\nb"'));

test("CSVの数式注入を無効化", () =>
  assert.equal(csv([["=1+1", "+2", "@SUM(1)"]]), '\uFEFF"\'=1+1","\'+2","\'@SUM(1)"'));

test("履歴CSVのファイル名", () =>
  assert.equal(
    historyFilename("2026-10-01", "2026-11-18"),
    "貸出返却履歴_2026-10-01_2026-11-18.csv",
  ));

test("貸出中CSVのファイル名", () =>
  assert.equal(lendingFilename("2026-11-18"), "貸出中備品一覧_2026-11-18.csv"));

test("貸出中CSVは5件のみ", () =>
  assert.equal(lendingCSV(make().loans, today(now)).split("\r\n").length, 6));

test("履歴CSVは受取者とメモを含む", () => {
  const text = historyCSV(make().loans, today(now));
  assert.ok(text.startsWith("\uFEFF"));
  assert.match(text, /受け取った人/);
  assert.match(text, /状態メモ/);
});

test("バックアップを往復", () => assert.deepEqual(importBackup(exportBackup(make()), now), make()));

test("壊れたJSONを拒否", () => assert.throws(() => importBackup("{bad}", now)));

const corruptions = {
  バージョン不一致: (data) => {
    data.version = 2;
  },
  備品配列欠損: (data) => {
    delete data.items;
  },
  メンバーID重複: (data) => {
    data.members[1].id = data.members[0].id;
  },
  管理番号重複: (data) => {
    data.items[1].code = data.items[0].code;
  },
  状態が文字列: (data) => {
    data.members[0].active = "true";
  },
  貸出日の不正: (data) => {
    data.loans[0].lentAt = "2026-99-99 99:99";
  },
  返却日が貸出前: (data) => {
    data.loans[0].returnedAt = "2000-01-01 10:00";
  },
  貸出中の備品欠損: (data) => {
    data.items = data.items.filter((item) => item.id !== "item-1");
  },
  貸出中のメンバー欠損: (data) => {
    data.members = data.members.filter((member) => member.id !== "member-1");
  },
  重複した貸出期間: (data) => {
    data.loans.push({ ...data.loans[0], id: "overlap" });
  },
  二重の現在貸出: (data) => {
    data.loans.push({ ...data.loans.at(-1), id: "double" });
  },
  返却担当者欠損: (data) => {
    data.loans[0].receiverName = null;
  },
};

for (const [name, mutate] of Object.entries(corruptions))
  test(`バックアップ検証：${name}`, () => {
    const data = make();
    mutate(data);
    assert.throws(() => validateLedger(data, now));
  });

test("保存データ破損時に再生成を通知", () => {
  const loaded = loadStored("broken", now);
  assert.equal(loaded.recovered, true);
  assert.deepEqual(loaded.data, make());
});

test("初回は通常の生成", () => assert.equal(loadStored(null, now).recovered, false));

test("正常保存データを読む", () =>
  assert.deepEqual(loadStored(exportBackup(make()), now).data, make()));

test("保存キーはell:v1", () => assert.equal(STORAGE_KEY, "ell:v1"));

test("シードは60〜90件・15備品・7名", () => {
  const data = make();
  assert.ok(data.loans.length >= 60 && data.loans.length <= 90);
  assert.equal(data.items.length, 15);
  assert.equal(data.members.length, 7);
});

test("シードの貸出間隔がばらつく", () => {
  const rows = make()
    .loans.filter((loan) => loan.itemId === "item-1")
    .sort((first, second) => first.lentAt.localeCompare(second.lentAt));

  const gaps = rows.slice(1).map((loan, index) => daysBetween(rows[index].lentAt, loan.lentAt));
  assert.ok(new Set(gaps).size >= 5);
});

test("用途メモの重複が少ない", () => {
  const loans = make().loans;
  assert.ok(new Set(loans.map((loan) => loan.purpose)).size / loans.length > 0.9);
});

test("メンバーごとの借りる頻度に偏りがある", () => {
  const data = make();
  const counts = data.members.map(
    (member) => data.loans.filter((loan) => loan.memberId === member.id).length,
  );

  assert.ok(Math.max(...counts) >= Math.min(...counts) * 3);
});

test("貸出期間は1〜14日でばらつく", () => {
  const days = make()
    .loans.filter((loan) => loan.returnedAt)
    .map((loan) => daysBetween(loan.lentAt, loan.returnedAt));

  assert.ok(days.every((day) => day >= 1 && day <= 14));
  assert.ok(new Set(days).size >= 10);
});

test("ドローンは月1回程度でカメラの利用が多い", () => {
  const data = make();
  const drone = data.loans.filter((loan) => loan.itemId === "item-9");
  assert.equal(drone.length, 7);
  assert.ok(data.loans.filter((loan) => loan.itemId === "item-1").length > drone.length);
});

test("休止メンバーは過去の履歴のみ", () => {
  const data = make();
  const rows = data.loans.filter((loan) => loan.memberId === "member-7");
  assert.ok(rows.length > 0);
  assert.ok(rows.every((loan) => loan.returnedAt && loan.returnedAt < addDays(today(now), -180)));
});

test("既定データの再生成は新しい日に追従", () => {
  const later = createSeed(new Date(now.getTime() + 86400000));
  assert.equal(daysBetween(make().loans[0].lentAt, later.loans[0].lentAt), 1);
});

test("追加レコードは静的シェルURLで開く", () =>
  assert.equal(recordPath("items", "custom-id"), "/items/local?record=custom-id"));

for (const moment of moments) {
  const clock = new Date(moment);
  const data = createSeed(clock);
  const returned = data.loans.filter((loan) => loan.returnedAt);

  test(`受取者は有効な3人以上で借り手とは別：${moment}`, () => {
    assert.ok(new Set(returned.map((loan) => loan.receivedBy)).size >= 3);

    for (const loan of returned) {
      assert.notEqual(loan.receivedBy, loan.memberId);
      const receiver = data.members.find((member) => member.id === loan.receivedBy);
      assert.ok(receiver?.active);
      assert.equal(loan.receiverName, receiver.name);
    }
  });

  test(`登録者が有効な2〜3人に分散：${moment}`, () => {
    const registrars = new Set(data.items.map((item) => item.registeredBy));
    assert.ok(registrars.size >= 2 && registrars.size <= 3);
    assert.ok(
      [...registrars].every((name) =>
        data.members.some((member) => member.active && member.name === name),
      ),
    );
  });

  test(`最新返却は7日前以内・直近2週間に複数件：${moment}`, () => {
    const ages = returned.map((loan) => daysBetween(loan.returnedAt, today(clock)));
    assert.ok(Math.min(...ages) >= 2 && Math.min(...ages) <= 3);
    assert.ok(ages.filter((age) => age <= 7).length >= 1);
    assert.ok(ages.filter((age) => age <= 14).length >= 3);
  });

  test(`状態メモは15〜40%・20種類以上・重複なし：${moment}`, () => {
    const notes = data.loans.filter((loan) => loan.condition).map((loan) => loan.condition);
    assert.ok(notes.length / data.loans.length >= 0.15 && notes.length / data.loans.length <= 0.4);
    assert.ok(notes.length >= 20);
    assert.equal(new Set(notes).size, notes.length);
    const positions = data.loans.flatMap((loan, index) => (loan.condition ? [index] : []));
    assert.ok(
      new Set(positions.slice(1).map((position, index) => position - positions[index])).size >= 3,
    );
  });

  test(`案件名は順送りでなく備品に合う用途：${moment}`, () => {
    const indexes = returned.map((loan) => projects.indexOf(loan.purpose.split("：")[0]));
    assert.ok(indexes.every((index) => index >= 0));
    const sequential = indexes
      .slice(1)
      .filter((projectIndex, index) => projectIndex === (indexes[index] + 1) % projects.length);
    assert.ok(sequential.length < indexes.length / 2);

    for (const loan of returned) {
      const itemIndex = data.items.findIndex((item) => item.id === loan.itemId);
      assert.ok(itemPurposes[itemIndex].includes(loan.purpose.split("：")[1]));
    }

    const groups = new Map();

    for (const loan of returned) {
      const key = `${loan.lentAt.slice(0, 7)}:${loan.purpose.split("：")[0]}`;
      const items = groups.get(key) ?? new Set();
      items.add(loan.itemId);
      groups.set(key, items);
    }

    assert.ok([...groups.values()].filter((items) => items.size >= 2).length >= 3);
  });

  test(`現在貸出中を含めて全備品の期間が重ならない：${moment}`, () => {
    for (const item of data.items) {
      const rows = data.loans
        .filter((loan) => loan.itemId === item.id)
        .sort((first, second) => first.lentAt.localeCompare(second.lentAt));

      for (let index = 1; index < rows.length; index++) {
        assert.ok(rows[index - 1].returnedAt && rows[index - 1].returnedAt < rows[index].lentAt);
      }
    }
  });

  test(`遅延理由のあるメモは遅れて返却した履歴にだけ付く：${moment}`, () => {
    for (const note of lateReturnNotes) {
      const loan = returned.find((loan) => loan.condition === note);
      assert.ok(loan);
      assert.ok(loan.returnedAt.slice(0, 10) > loan.dueOn);
    }
  });
}

test("指定日時の総務受取は約5〜6割、2月の履歴も極端に少なくない", () => {
  const data = createSeed(new Date("2026-11-18T00:20:00+09:00"));
  const returned = data.loans.filter((loan) => loan.returnedAt);
  const adminCount = returned.filter(
    (loan) => data.members.find((member) => member.id === loan.receivedBy)?.department === "総務",
  ).length;
  assert.ok(adminCount / returned.length >= 0.5 && adminCount / returned.length <= 0.65);
  assert.ok(returned.filter((loan) => loan.lentAt.startsWith("2026-02")).length >= 4);
});
