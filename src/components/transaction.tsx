"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLedger } from "./ledger-provider";
import { PageHeading, Empty, Field } from "./ui";
import { addDays } from "@/lib/dates";
import { currentLoan, lend, returnItem } from "@/lib/lending";
import { overdueDays } from "@/lib/overdue";
import { recordPath } from "@/lib/routes";

export function Transaction({ id: recordId, mode }: { id: string; mode: "lend" | "return" }) {
  const { data, date, update } = useLedger();
  const router = useRouter();
  const [memberId, setMember] = useState("");
  const [dueOn, setDue] = useState(addDays(date, 7));
  const [memo, setMemo] = useState("");
  const item = data.items.find((item) => item.id === recordId);
  const loan = currentLoan(data, recordId);
  if (!item)
    return (
      <Empty>
        備品が見つかりません。<Link href="/items">一覧へ戻る</Link>
      </Empty>
    );

  if (mode === "lend" && loan)
    return (
      <section className="panel">
        <h1>この備品は貸出中です</h1>
        <p>
          {item.name}は{loan.memberName}さんが利用中です。
        </p>
        <Link className="button primary" href={recordPath("return", recordId)}>
          返却画面へ
        </Link>
      </section>
    );

  if (mode === "return" && !loan)
    return (
      <section className="panel">
        <h1>この備品は貸出可能です</h1>
        <Link className="button primary" href={recordPath("lend", recordId)}>
          貸出画面へ
        </Link>
      </section>
    );

  return (
    <>
      <PageHeading
        eyebrow={mode === "lend" ? "LEND EQUIPMENT" : "RETURN EQUIPMENT"}
        title={mode === "lend" ? "備品を貸し出す" : "備品を返却する"}
        description="内容を確認して記録してください。"
      />
      <div className="transaction-grid">
        <section className="panel">
          <p className="item-code">{item.code}</p>
          <h2>{item.name}</h2>
          <p className="muted">{item.location}</p>
          <p>{item.note}</p>
          {loan && (
            <dl className="details">
              <dt>借りている人</dt>
              <dd>{loan.memberName}</dd>
              <dt>貸出日時</dt>
              <dd>{loan.lentAt}</dd>
              <dt>返却予定日</dt>
              <dd>{loan.dueOn}</dd>
              <dt>遅延日数</dt>
              <dd className={overdueDays(loan, date) ? "text-danger" : ""}>
                {overdueDays(loan, date)}日
              </dd>
              <dt>用途メモ</dt>
              <dd>{loan.purpose || "—"}</dd>
            </dl>
          )}
        </section>
        <form
          className="panel"
          onSubmit={(event) => {
            event.preventDefault();
            const success = update(
              (current) =>
                mode === "lend"
                  ? lend(
                      current,
                      {
                        id: crypto.randomUUID(),
                        itemId: recordId,
                        memberId,
                        dueOn,
                        purpose: memo.trim(),
                      },
                      new Date(),
                    )
                  : returnItem(current, recordId, memberId, memo, new Date()),
              mode === "lend" ? "貸出を記録しました。" : "返却を記録しました。",
            );

            if (success) router.push(recordPath("items", recordId));
          }}
        >
          <Field label={mode === "lend" ? "借りるメンバー *" : "受け取った担当者 *"}>
            <select required value={memberId} onChange={(event) => setMember(event.target.value)}>
              <option value="">メンバーを選択してください</option>
              {data.members
                .filter((member) => mode === "return" || member.active)
                .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}（{member.department}
                    {!member.active ? "・休止中" : ""}）
                  </option>
                ))}
            </select>
          </Field>
          {mode === "lend" && (
            <Field label="返却予定日 *">
              <input
                required
                type="date"
                min={date}
                value={dueOn}
                onChange={(event) => setDue(event.target.value)}
              />
            </Field>
          )}
          <Field label={mode === "lend" ? "用途メモ（任意）" : "状態メモ（任意）"}>
            <textarea
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              placeholder={mode === "lend" ? "例：商店街紹介の撮影" : "例：ケーブル1本欠品"}
            />
          </Field>
          <p className="muted">日時は記録時の日本時間で自動保存されます。</p>
          <div className="actions">
            <button className="primary" type="submit">
              {mode === "lend" ? "貸出する" : "返却する"}
            </button>
            <Link className="button" href={recordPath("items", recordId)}>
              キャンセル
            </Link>
          </div>
        </form>
      </div>
    </>
  );
}
