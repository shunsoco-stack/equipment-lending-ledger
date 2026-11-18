"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Member } from "@/lib/types";
import { saveMember, deleteMember } from "@/lib/members";
import { recordPath } from "@/lib/routes";
import { filterHistory } from "@/lib/stats";
import { useLedger } from "./ledger-provider";
import { Empty, Field, PageHeading } from "./ui";
import { HistoryTable } from "./history";

function MemberForm({ member, onDone }: { member?: Member; onDone: () => void }) {
  const { update } = useLedger();
  const [value, setValue] = useState<Member>(
    member ?? { id: "", name: "", department: "", active: true },
  );

  return (
    <form
      className="panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (
          update(
            (current) => saveMember(current, { ...value, id: value.id || crypto.randomUUID() }),
            "メンバーを保存しました。",
          )
        )
          onDone();
      }}
    >
      <h2>{member ? "メンバーを編集" : "メンバーを追加"}</h2>
      <div className="form-grid">
        <Field label="名前 *">
          <input
            required
            value={value.name}
            onChange={(event) => setValue({ ...value, name: event.target.value })}
          />
        </Field>
        <Field label="所属 *">
          <input
            required
            value={value.department}
            onChange={(event) => setValue({ ...value, department: event.target.value })}
          />
        </Field>
        <Field label="状態">
          <select
            value={value.active ? "active" : "paused"}
            onChange={(event) => setValue({ ...value, active: event.target.value === "active" })}
          >
            <option value="active">有効</option>
            <option value="paused">休止</option>
          </select>
        </Field>
      </div>
      <div className="actions">
        <button className="primary">保存する</button>
        <button type="button" onClick={onDone}>
          キャンセル
        </button>
      </div>
    </form>
  );
}

export function Members() {
  const { data } = useLedger();
  const [adding, setAdding] = useState(false);

  return (
    <>
      <PageHeading
        eyebrow="MEMBERS"
        title="メンバー"
        description="チームのメンバーと貸出中の備品を確認します。"
      >
        <button className="primary" onClick={() => setAdding(true)}>
          ＋ メンバーを追加
        </button>
      </PageHeading>
      {adding && <MemberForm onDone={() => setAdding(false)} />}
      <div className="item-grid">
        {data.members.map((member) => (
          <Link
            className="panel member-card"
            key={member.id}
            href={recordPath("members", member.id)}
          >
            <span className="member-avatar">{member.name.slice(0, 1)}</span>
            <h2>{member.name}</h2>
            <p>{member.department}</p>
            <span className={`badge ${member.active ? "available" : ""}`}>
              {member.active ? "有効" : "休止中"}
            </span>
            <p className="muted">
              貸出中{" "}
              {data.loans.filter((loan) => loan.memberId === member.id && !loan.returnedAt).length}
              点 →
            </p>
          </Link>
        ))}
      </div>
      {!data.members.length && <Empty />}
    </>
  );
}

export function MemberDetail({ id: recordId }: { id: string }) {
  const { data, update } = useLedger();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const member = data.members.find((member) => member.id === recordId);
  if (!member)
    return (
      <Empty>
        メンバーが見つかりません。<Link href="/members">一覧へ戻る</Link>
      </Empty>
    );

  const active = data.loans.filter((loan) => loan.memberId === recordId && !loan.returnedAt);

  return (
    <>
      <PageHeading
        eyebrow="MEMBER DETAIL"
        title={member.name}
        description={`${member.department} · ${member.active ? "有効" : "休止中"}`}
      >
        <button onClick={() => setEditing(!editing)}>編集</button>
        <button
          className="danger-button"
          disabled={active.length > 0}
          onClick={() => {
            if (
              confirm("このメンバーを削除しますか？貸出履歴は残ります。") &&
              update((current) => deleteMember(current, recordId), "メンバーを削除しました。")
            )
              router.push("/members");
          }}
        >
          削除
        </button>
      </PageHeading>
      {active.length > 0 && <p className="muted">貸出中の備品があるため削除できません。</p>}
      {editing && <MemberForm member={member} onDone={() => setEditing(false)} />}
      <section className="panel">
        <h2>現在借りている備品 · {active.length}点</h2>
        {active.length ? (
          active.map((loan) => (
            <p key={loan.id}>
              <Link className="text-link" href={recordPath("return", loan.itemId)}>
                {loan.itemName} → 返却
              </Link>
              　{loan.dueOn}まで
            </p>
          ))
        ) : (
          <Empty />
        )}
      </section>
      <h2 className="section-title">このメンバーの貸出履歴</h2>
      <HistoryTable loans={filterHistory(data.loans, { from: "", to: "", memberId: recordId })} />
    </>
  );
}
