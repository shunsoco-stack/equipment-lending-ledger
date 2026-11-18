"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLedger } from "./ledger-provider";
import { PageHeading, Status, Empty } from "./ui";
import { overdueDays, overdueLoans } from "@/lib/overdue";
import { byMember } from "@/lib/stats";
import { recordPath } from "@/lib/routes";
import { lendingCSV, lendingFilename } from "@/lib/csv";
import { download } from "@/lib/download";
import type { Loan } from "@/lib/types";

function LoanRows({ loans }: { loans: Loan[] }) {
  const { date } = useLedger();
  if (!loans.length) return <Empty>該当する貸出中の備品はありません。</Empty>;

  return (
    <div className="loan-list">
      {loans.map((loan) => (
        <article key={loan.id} className={`loan-row ${overdueDays(loan, date) ? "late-row" : ""}`}>
          <div>
            <Status loan={loan} date={date} />
            <h3>
              <Link href={recordPath("items", loan.itemId)}>{loan.itemName}</Link>
            </h3>
            <small>{loan.itemCode}</small>
          </div>
          <div>
            <strong>{loan.memberName}</strong>
            <small>貸出：{loan.lentAt}</small>
          </div>
          <div>
            <span>返却予定：{loan.dueOn}</span>
            <small className={overdueDays(loan, date) ? "text-danger" : ""}>
              {overdueDays(loan, date) ? `${overdueDays(loan, date)}日遅延` : "期限内"}
            </small>
          </div>
          <Link className="button" href={recordPath("return", loan.itemId)}>
            返却する →
          </Link>
        </article>
      ))}
    </div>
  );
}

export function Lending() {
  const { data, date } = useLedger();
  const [tab, setTab] = useState("all");
  useEffect(() => {
    const timer = setTimeout(() => {
      const value = new URLSearchParams(window.location.search).get("tab");
      if (value === "overdue" || value === "members") setTab(value);
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  const active = data.loans.filter((loan) => !loan.returnedAt);
  const late = overdueLoans(data.loans, date);

  return (
    <>
      <PageHeading
        eyebrow="CURRENT LENDING"
        title="貸出状況"
        description="誰が、何を、いつまで。チームの利用状況をひと目で。"
      >
        <button
          onClick={() =>
            download(lendingCSV(active, date), lendingFilename(date), "text/csv;charset=utf-8")
          }
        >
          ↓ 貸出中CSV
        </button>
      </PageHeading>
      <div className="toolbar">
        <div className="tabs">
          {[
            ["all", `貸出中 ${active.length}`],
            ["overdue", `返却遅れ ${late.length}`],
            ["members", "誰が何を借りているか"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={tab === value ? "selected" : ""}
              onClick={() => {
                setTab(value);
                window.history.replaceState(null, "", `/lending?tab=${value}`);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {tab === "members" ? (
        <>
          {byMember(data).map(({ member, loans }) => (
            <section key={member.id} className="member-group">
              <h2>
                <Link href={recordPath("members", member.id)}>{member.name}</Link>
                <span className="muted"> {member.department}</span>
                <span className="count">{loans.length}点</span>
              </h2>
              <LoanRows loans={loans} />
            </section>
          ))}
          {!active.length && <Empty />}
        </>
      ) : (
        <LoanRows loans={tab === "overdue" ? late : active} />
      )}
    </>
  );
}
