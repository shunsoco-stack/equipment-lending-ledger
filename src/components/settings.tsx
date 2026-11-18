"use client";

import { useState } from "react";
import Link from "next/link";
import { exportBackup, importBackup } from "@/lib/backup";
import { createSeed } from "@/lib/seed";
import { download } from "@/lib/download";
import type { Ledger } from "@/lib/types";
import { useLedger } from "./ledger-provider";
import { PageHeading } from "./ui";

export function Backup() {
  const { data, date, update, notify } = useLedger();
  const [pending, setPending] = useState<Ledger | null>(null);

  return (
    <>
      <PageHeading
        eyebrow="BACKUP"
        title="バックアップ"
        description="大切な台帳をJSONファイルで手元に保存できます。"
      />
      <div className="detail-grid">
        <section className="panel">
          <h2>台帳を書き出す</h2>
          <p>備品・メンバー・貸出返却履歴をまとめて保存します。</p>
          <p className="muted">
            備品 {data.items.length}点 / メンバー {data.members.length}名 / 履歴 {data.loans.length}
            件
          </p>
          <button
            className="primary"
            onClick={() =>
              download(exportBackup(data), `貸出台帳バックアップ_${date}.json`, "application/json")
            }
          >
            ↓ バックアップを書き出す（JSON）
          </button>
        </section>
        <section className="panel">
          <h2>保存した台帳を復元</h2>
          <p>読み込んだ内容を確認したあと、現在の台帳を置き換えます。</p>
          <input
            className="visually-hidden file-input"
            id="backup-file"
            type="file"
            accept=".json,application/json"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              setPending(null);
              if (!file) return;

              try {
                if (file.size > 20_000_000) throw new Error("ファイルは20MB以下にしてください。");
                setPending(importBackup(await file.text()));
              } catch (error) {
                notify((error as Error).message);
              }
            }}
          />
          <label className="button file-label" htmlFor="backup-file">
            バックアップを読み込む（JSON）
          </label>
          {pending && (
            <div className="import-preview">
              <h3>読み込み内容</h3>
              <p>
                備品 {pending.items.length}点・メンバー {pending.members.length}名・履歴{" "}
                {pending.loans.length}件
              </p>
              <p>現在のデータはすべて置き換わります。</p>
              <div className="actions">
                <button
                  className="primary"
                  onClick={() => {
                    if (update(() => pending, "バックアップを復元しました。")) setPending(null);
                  }}
                >
                  この内容で置き換える
                </button>
                <button onClick={() => setPending(null)}>キャンセル</button>
              </div>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

export function About() {
  const { update } = useLedger();

  return (
    <>
      <PageHeading
        eyebrow="ABOUT"
        title="このデモについて"
        description="共用備品の「貸す・返す」をシンプルに。"
      />
      <section className="panel prose">
        <h2>デモ用の架空データです</h2>
        <p>
          うみねこデザイン室、所属、人物、備品の利用履歴はすべて架空です。実在の企業・個人とは無関係です。
        </p>
        <h2>保存先は、このブラウザだけ</h2>
        <p>
          データはlocalStorage（ell:v1）に保存します。ログインやサーバー保存、外部API、通知機能はありません。別の端末やブラウザには同期されません。ブラウザのデータを消去すると台帳も失われます。
        </p>
        <Link className="button" href="/backup">
          バックアップを開く
        </Link>
        <h2>貸出・返却サイクルに集中</h2>
        <p>
          購入・棚卸し・減価償却・修理・保守点検・予約・在庫数量の管理は行いません。QRラベルは備品詳細で1枚ずつ表示・印刷できます。
        </p>
        <h2>日時の扱い</h2>
        <p>
          日本時間の日付で返却遅れを判定します。返却予定日当日は遅延ではありません。初回のサンプルは開いた日を基準に生成し、その後は記録した日付を保ちます。
        </p>
        <h2>既定データに戻す</h2>
        <p>現在の台帳を消去し、今の日時を基準に架空データを再生成します。</p>
        <button
          className="danger-button"
          onClick={() => {
            if (
              confirm(
                "現在のデータをすべて消去し、既定データに戻しますか？この操作は取り消せません。",
              )
            )
              update(
                () => createSeed(new Date()),
                "現在の日時を基準に既定データを再生成しました。",
              );
          }}
        >
          既定データに戻す
        </button>
      </section>
    </>
  );
}
