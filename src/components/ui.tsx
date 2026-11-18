import Link from "next/link";
import type { Item, Loan } from "@/lib/types";
import { overdueDays } from "@/lib/overdue";
import { shortDate } from "@/lib/dates";
import { recordPath } from "@/lib/routes";
import { useLedger } from "./ledger-provider";
import { currentLoan } from "@/lib/lending";

export function PageHeading({
  eyebrow = "WORKSPACE",
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{description}</p>
      </div>
      <div className="actions">{children}</div>
    </div>
  );
}

export function Status({ loan, date }: { loan?: Loan; date: string }) {
  const late = loan ? overdueDays(loan, date) : 0;

  return (
    <span className={`badge ${late ? "danger" : loan ? "lent" : "available"}`}>
      <span aria-hidden="true">●</span> {late ? "返却遅れ" : loan ? "貸出中" : "貸出可"}
    </span>
  );
}

export function ItemCard({ item }: { item: Item }) {
  const { data, date } = useLedger();
  const loan = currentLoan(data, item.id);

  return (
    <article className="item-card">
      <div className="card-top">
        <span className="equipment-symbol" aria-hidden="true">
          {item.category === "PC・タブレット"
            ? "▱"
            : item.category === "カメラ・映像"
              ? "▣"
              : item.category === "ディスプレイ"
                ? "▤"
                : "⌘"}
        </span>
        <Status loan={loan} date={date} />
      </div>
      <p className="item-code">{item.code}</p>
      <h3>
        <Link href={recordPath("items", item.id)}>{item.name}</Link>
      </h3>
      <p className="item-location">
        {item.category} <span> / </span> {item.location}
      </p>
      <div className="card-loan">
        {loan ? (
          <>
            <span className="small-avatar">{loan.memberName.slice(0, 1)}</span>
            <span>
              {loan.memberName}さん
              <small className={overdueDays(loan, date) ? "text-danger" : ""}>
                {shortDate(loan.dueOn)}まで
                {overdueDays(loan, date) > 0 && ` · ${overdueDays(loan, date)}日遅延`}
              </small>
            </span>
          </>
        ) : (
          <span className="muted">すぐに貸出できます</span>
        )}
        <Link className="card-action" href={recordPath(loan ? "return" : "lend", item.id)}>
          {loan ? "返却" : "貸出"} <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}

export function Empty({
  children = "該当するデータはありません。",
}: {
  children?: React.ReactNode;
}) {
  return <div className="empty">{children}</div>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
