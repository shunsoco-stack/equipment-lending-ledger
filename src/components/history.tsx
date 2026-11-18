"use client";

import { useState } from "react";
import { useLedger } from "./ledger-provider";
import { PageHeading, Field, Empty } from "./ui";
import { addDays, daysBetween } from "@/lib/dates";
import { filterHistory, historyStats } from "@/lib/stats";
import { overdueDays } from "@/lib/overdue";
import { historyCSV, historyFilename } from "@/lib/csv";
import { download } from "@/lib/download";
import type { Loan } from "@/lib/types";

export function HistoryTable({ loans }: { loans: Loan[] }) {
  const { date } = useLedger();
  if (!loans.length) return <Empty />;

  return (
    <div className="table-wrap" tabIndex={0} aria-label="貸出返却履歴（横にスクロールできます）">
      <table>
        <thead>
          <tr>
            {[
              "貸出日時 / 備品",
              "借りた人",
              "返却予定日",
              "返却日時 / 受取担当",
              "日数",
              "遅延",
              "メモ",
            ].map((title) => (
              <th key={title}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loans.map((loan) => (
            <tr key={loan.id}>
              <td>
                <small>{loan.lentAt}</small>
                <strong>{loan.itemName}</strong>
                <small>{loan.itemCode}</small>
              </td>
              <td>{loan.memberName}</td>
              <td>{loan.dueOn}</td>
              <td>
                {loan.returnedAt ?? "貸出中"}
                <small>{loan.receiverName ?? "—"}</small>
              </td>
              <td>{daysBetween(loan.lentAt, loan.returnedAt ?? date)}日</td>
              <td className={overdueDays(loan, date) ? "text-danger" : ""}>
                {overdueDays(loan, date) ? `${overdueDays(loan, date)}日遅延` : "なし"}
              </td>
              <td className="memo-cell">
                {loan.purpose || "—"}
                {loan.condition && <small>返却時：{loan.condition}</small>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function History() {
  const { data, date } = useLedger();
  const [from, setFrom] = useState(addDays(date, -180));
  const [endDate, setTo] = useState(date);
  const [itemId, setItem] = useState("");
  const [memberId, setMember] = useState("");
  const invalid = from > endDate;
  const loans = invalid ? [] : filterHistory(data.loans, { from, to: endDate, itemId, memberId });
  const stats = historyStats(loans);
  const itemOptions = new Map(data.loans.map((loan) => [loan.itemId, loan.itemName]));
  const memberOptions = new Map(data.loans.map((loan) => [loan.memberId, loan.memberName]));

  return (
    <>
      <PageHeading
        eyebrow="HISTORY"
        title="貸出・返却履歴"
        description="記録を振り返り、チームの利用状況を把握します。"
      >
        <button
          disabled={invalid || !from || !endDate}
          onClick={() =>
            download(
              historyCSV(loans, date),
              historyFilename(from, endDate),
              "text/csv;charset=utf-8",
            )
          }
        >
          ↓ CSVダウンロード
        </button>
      </PageHeading>
      <div className="panel filter-grid">
        <Field label="貸出日（開始）">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
        </Field>
        <Field label="貸出日（終了）">
          <input type="date" value={endDate} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="備品">
          <select value={itemId} onChange={(event) => setItem(event.target.value)}>
            <option value="">すべての備品</option>
            {[...itemOptions].map(([recordId, name]) => (
              <option key={recordId} value={recordId}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="メンバー">
          <select value={memberId} onChange={(event) => setMember(event.target.value)}>
            <option value="">すべてのメンバー</option>
            {[...memberOptions].map(([recordId, name]) => (
              <option key={recordId} value={recordId}>
                {name}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {invalid && (
        <p role="alert" className="text-danger">
          終了日は開始日以降にしてください。
        </p>
      )}
      <div className="summary-grid three">
        <div className="summary">
          <span>期間内の貸出回数</span>
          <strong>
            {stats.count}
            <small>回</small>
          </strong>
        </div>
        <div className="summary">
          <span>平均貸出日数</span>
          <strong>
            {stats.averageDays.toFixed(1)}
            <small>日</small>
          </strong>
          <small>返却済みの記録で集計</small>
        </div>
        <div className="summary">
          <span>遅延返却率</span>
          <strong>
            {stats.lateRate.toFixed(1)}
            <small>%</small>
          </strong>
          <small>返却済みの記録で集計</small>
        </div>
      </div>
      <section className="panel">
        <h2>よく借りられる備品 TOP 5</h2>
        {stats.topItems.length ? (
          <ol className="ranking">
            {stats.topItems.map((item) => (
              <li key={item.name}>
                <span>{item.name}</span>
                <strong>{item.count}回</strong>
              </li>
            ))}
          </ol>
        ) : (
          <Empty />
        )}
      </section>
      <div className="section-heading">
        <h2>履歴一覧</h2>
        <span>{loans.length}件</span>
      </div>
      <HistoryTable loans={loans} />
    </>
  );
}
