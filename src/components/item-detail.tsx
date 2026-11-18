"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLedger } from "./ledger-provider";
import { PageHeading, Status, Empty } from "./ui";
import { ItemForm } from "./item-form";
import { HistoryTable } from "./history";
import { currentLoan } from "@/lib/lending";
import { deleteItem } from "@/lib/items";
import { qrSvg } from "@/lib/qrcode";
import { recordPath } from "@/lib/routes";
import { filterHistory } from "@/lib/stats";
import type { Item } from "@/lib/types";

function QRLabel({ item }: { item: Item }) {
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    qrSvg(item)
      .then((svg) => {
        if (alive) setSvg(svg);
      })
      .catch(() => {
        if (alive) setError("QRコードを生成できませんでした。");
      });

    return () => {
      alive = false;
    };
  }, [item]);

  return (
    <section className="panel qr-panel">
      <div className="print-label">
        <h2>{item.name}</h2>
        {svg ? (
          <div
            role="img"
            aria-label={`${item.code}のQRコード`}
            dangerouslySetInnerHTML={{ __html: svg }}
          />
        ) : (
          <p>{error || "QRコードを生成中…"}</p>
        )}
        <strong>{item.code}</strong>
        <p>うみねこデザイン室（架空）</p>
      </div>
      <button disabled={!svg} onClick={() => window.print()}>
        QRラベルを1枚印刷
      </button>
    </section>
  );
}

export function ItemDetail({ id: recordId }: { id: string }) {
  const { data, date, update } = useLedger();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const item = data.items.find((item) => item.id === recordId);
  if (!item)
    return (
      <Empty>
        備品が見つかりません。<Link href="/items">備品一覧へ</Link>
      </Empty>
    );

  const loan = currentLoan(data, recordId);

  return (
    <>
      <PageHeading eyebrow="EQUIPMENT DETAIL" title={item.name} description={item.code}>
        <Link className="button primary" href={recordPath(loan ? "return" : "lend", recordId)}>
          {loan ? "返却する" : "貸出する"}
        </Link>
        <button onClick={() => setEditing(!editing)}>編集</button>
      </PageHeading>
      {editing && <ItemForm item={item} onDone={() => setEditing(false)} />}
      <div className="detail-grid">
        <section className="panel">
          <Status loan={loan} date={date} />
          <dl className="details">
            <dt>カテゴリ</dt>
            <dd>{item.category}</dd>
            <dt>保管場所</dt>
            <dd>{item.location}</dd>
            <dt>登録日</dt>
            <dd>{item.registeredOn}</dd>
            <dt>登録者</dt>
            <dd>{item.registeredBy}</dd>
            <dt>備考</dt>
            <dd>{item.note || "—"}</dd>
            {loan && (
              <>
                <dt>借りている人</dt>
                <dd>{loan.memberName}</dd>
                <dt>返却予定日</dt>
                <dd>{loan.dueOn}</dd>
              </>
            )}
          </dl>
          <button
            className="danger-button"
            disabled={!!loan}
            onClick={() => {
              if (
                confirm("この備品を削除しますか？貸出履歴は残ります。") &&
                update((current) => deleteItem(current, recordId), "備品を削除しました。")
              )
                router.push("/items");
            }}
          >
            備品を削除
          </button>
          {loan && <p className="muted">貸出中の備品は削除できません。</p>}
        </section>
        <QRLabel item={item} />
      </div>
      <h2 className="section-title">この備品の貸出履歴</h2>
      <HistoryTable loans={filterHistory(data.loans, { from: "", to: "", itemId: recordId })} />
    </>
  );
}
