"use client";

import { useState } from "react";
import Link from "next/link";
import { useLedger } from "./ledger-provider";
import { PageHeading, Status, Empty } from "./ui";
import { currentLoan } from "@/lib/lending";
import { categories } from "@/lib/items";
import { recordPath } from "@/lib/routes";
import { ItemForm } from "./item-form";
import { lendingCSV, lendingFilename } from "@/lib/csv";
import { download } from "@/lib/download";

export function Items() {
  const { data, date } = useLedger();
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const items = data.items.filter(
    (item) =>
      (!category || item.category === category) &&
      `${item.name} ${item.code} ${item.location}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <>
      <PageHeading
        eyebrow="EQUIPMENT"
        title="備品一覧"
        description="共用備品の保管場所と貸出状況をまとめて確認。"
      >
        <button
          onClick={() =>
            download(lendingCSV(data.loans, date), lendingFilename(date), "text/csv;charset=utf-8")
          }
        >
          ↓ 貸出中CSV
        </button>
        <button className="primary" onClick={() => setAdding(true)}>
          ＋ 備品を追加
        </button>
      </PageHeading>
      {adding && <ItemForm onDone={() => setAdding(false)} />}
      <div className="toolbar">
        <input
          className="search"
          aria-label="備品を検索"
          placeholder="備品名・管理番号・保管場所で検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          aria-label="カテゴリ"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
        >
          <option value="">すべてのカテゴリ</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
        <span>{items.length}点</span>
      </div>
      <div className="table-wrap" tabIndex={0}>
        <table>
          <thead>
            <tr>
              {["管理番号 / 備品名", "カテゴリ", "保管場所", "貸出状況", "操作"].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const loan = currentLoan(data, item.id);

              return (
                <tr key={item.id}>
                  <td>
                    <small>{item.code}</small>
                    <Link className="text-link" href={recordPath("items", item.id)}>
                      {item.name}
                    </Link>
                  </td>
                  <td>{item.category}</td>
                  <td>{item.location}</td>
                  <td>
                    <Status loan={loan} date={date} />
                    {loan && (
                      <small>
                        {loan.memberName} · {loan.dueOn}まで
                      </small>
                    )}
                  </td>
                  <td>
                    <Link className="button" href={recordPath(loan ? "return" : "lend", item.id)}>
                      {loan ? "返却する" : "貸出する"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!items.length && <Empty />}
      </div>
    </>
  );
}
