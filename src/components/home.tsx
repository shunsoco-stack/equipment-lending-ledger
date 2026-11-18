"use client";

import Link from "next/link";
import { useState } from "react";
import { useLedger } from "./ledger-provider";
import { PageHeading, ItemCard, Empty } from "./ui";
import { overdueLoans } from "@/lib/overdue";
import { currentLoan } from "@/lib/lending";

export function Home() {
  const { data, date } = useLedger();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const active = data.loans.filter((loan) => !loan.returnedAt);
  const late = overdueLoans(data.loans, date);
  const items = data.items.filter(
    (item) =>
      `${item.name} ${item.code} ${item.location}`.toLowerCase().includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "lent" ? !!currentLoan(data, item.id) : !currentLoan(data, item.id))),
  );

  return (
    <>
      <PageHeading
        eyebrow="OVERVIEW"
        title="ホーム"
        description="みんなの備品を、気持ちよく次の人へ。"
      >
        <Link href="/scan" className="button primary">
          ▣　QRで読み取る
        </Link>
      </PageHeading>
      <div className="summary-grid">
        <Link href="/items" className="summary">
          <span>登録されている備品</span>
          <strong>
            {data.items.length}
            <small>点</small>
          </strong>
          <p>チームで使う共用備品</p>
        </Link>
        <Link href="/lending" className="summary">
          <span>現在貸出中</span>
          <strong>
            {active.length}
            <small>点</small>
          </strong>
          <p>{new Set(active.map((loan) => loan.memberId)).size}名のメンバーが利用中</p>
        </Link>
        <Link href="/lending?tab=overdue" className="summary overdue-summary">
          <span>返却遅れ</span>
          <strong>
            {late.length}
            <small>件</small>
          </strong>
          <p>返却状況を確認する →</p>
        </Link>
        <div className="summary">
          <span>貸出可能</span>
          <strong>
            {data.items.length - active.length}
            <small>点</small>
          </strong>
          <p>今すぐ利用できます</p>
        </div>
      </div>
      {late.length > 0 && (
        <Link href="/lending?tab=overdue" className="overdue-banner">
          <span className="warning-mark">!</span>
          <span>
            <strong>{late.length}件の備品が返却予定日を過ぎています</strong>
            <small>借りているメンバーと返却状況を確認しましょう。</small>
          </span>
          <span className="banner-link">一覧を見る →</span>
        </Link>
      )}
      <section>
        <div className="section-heading">
          <h2>
            備品の貸出状況 <span className="count">{data.items.length}</span>
          </h2>
          <Link href="/items" className="text-link">
            備品を管理 →
          </Link>
        </div>
        <div className="toolbar">
          <div className="tabs">
            {[
              ["all", "すべて"],
              ["lent", "貸出中"],
              ["available", "貸出可"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <input
            className="search"
            aria-label="備品を検索"
            placeholder="⌕　備品名・管理番号で検索"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="item-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
        {!items.length && <Empty />}
      </section>
    </>
  );
}
