import type { Metadata } from "next";
import { LedgerProvider } from "@/components/ledger-provider";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "備品・機材の貸出返却台帳",
  description:
    "共用備品のQR貸出・返却、返却遅れ、メンバー別の利用状況を管理する台帳。デモ用の架空データです。",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main-content">
          本文へ移動
        </a>
        <LedgerProvider>
          <Shell>{children}</Shell>
        </LedgerProvider>
      </body>
    </html>
  );
}
