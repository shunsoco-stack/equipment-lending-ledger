"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLedger } from "./ledger-provider";

const navigation = [
  ["/", "ホーム", "⌂"],
  ["/items", "備品一覧", "▦"],
  ["/lending", "貸出状況", "⇄"],
  ["/history", "貸出・返却履歴", "◷"],
  ["/members", "メンバー", "♧"],
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { date, message, notify } = useLedger();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">⇄</span>
          <span>
            うみねこ台帳<small>EQUIPMENT LENDING</small>
          </span>
        </Link>
        <div className="workspace">
          うみねこデザイン室<small>共用備品・機材の貸出管理</small>
        </div>
        <p className="nav-label">ワークスペース</p>
        <nav aria-label="メインナビゲーション">
          {navigation.map(([href, label, icon]) => (
            <Link
              key={href}
              href={href}
              className={path === href || (href !== "/" && path.startsWith(href)) ? "active" : ""}
            >
              <span aria-hidden="true">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Link href="/backup">↧　バックアップ</Link>
          <Link href="/about">ⓘ　このデモについて</Link>
          <div className="demo-badge">デモ用の架空データです</div>
          <small>このブラウザに自動保存</small>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <span>備品・機材の貸出返却台帳</span>
          <span className="top-date">
            {date.replaceAll("-", ".")} <span className="avatar">澄</span>
          </span>
        </header>
        <main id="main-content">
          {message && (
            <div className="notice" role="status">
              <span>{message}</span>
              <button aria-label="通知を閉じる" onClick={() => notify("")}>
                ×
              </button>
            </div>
          )}
          {children}
          <footer>
            <div className="footer-links">
              <Link href="/backup">バックアップ</Link>
              <Link href="/about">このデモについて</Link>
            </div>
            うみねこデザイン室（架空） · デモ用の架空データです
          </footer>
        </main>
      </div>
      <nav className="mobile-tabs" aria-label="モバイルナビゲーション">
        {navigation.map(([href, label, icon]) => (
          <Link key={href} href={href} className={path === href ? "active" : ""}>
            <span aria-hidden="true">{icon}</span>
            {label === "貸出・返却履歴" ? "履歴" : label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
