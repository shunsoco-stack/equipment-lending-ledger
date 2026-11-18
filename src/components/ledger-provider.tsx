"use client";

import { createContext, useContext, useEffect, useState, useRef } from "react";
import type { Ledger } from "@/lib/types";
import { loadStored, STORAGE_KEY } from "@/lib/storage";
import { validateLedger } from "@/lib/backup";
import { today } from "@/lib/dates";

type Context = {
  data: Ledger;
  date: string;
  message: string;
  notify: (text: string) => void;
  update: (change: (data: Ledger) => Ledger, message?: string) => boolean;
};

const LedgerContext = createContext<Context | null>(null);

export function useLedger() {
  const value = useContext(LedgerContext);
  if (!value) throw new Error("データの準備中です。");

  return value;
}

export function LedgerProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<Ledger | null>(null);
  const [date, setDate] = useState("");
  const [message, notify] = useState("");
  const latest = useRef<Ledger | null>(null);
  useEffect(() => {
    const initialize = () => {
      const now = new Date();

      try {
        const loaded = loadStored(localStorage.getItem(STORAGE_KEY), now);
        latest.current = loaded.data;
        setData(loaded.data);
        setDate(today(now));
        if (loaded.recovered) notify("保存データが壊れていたため、既定データに戻しました。");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded.data));
      } catch {
        const loaded = loadStored(null, now);
        latest.current = loaded.data;
        setData(loaded.data);
        setDate(today(now));
        notify("ブラウザの保存領域を利用できません。保存設定を確認してください。");
      }
    };

    const timer = setTimeout(initialize, 0);
    const clock = setInterval(() => setDate(today()), 30_000);
    const sync = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) initialize();
    };

    window.addEventListener("storage", sync);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});

    return () => {
      clearTimeout(timer);
      clearInterval(clock);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function update(change: (data: Ledger) => Ledger, success = "保存しました。") {
    try {
      if (!latest.current) return false;
      // 更新直前に保存済みデータを読み直し、別タブの操作も反映する。
      const stored = localStorage.getItem(STORAGE_KEY);
      const base = stored ? loadStored(stored, new Date()).data : latest.current;
      const next = validateLedger(change(base));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      latest.current = next;
      setData(next);
      notify(success);

      return true;
    } catch (error) {
      notify(error instanceof Error ? error.message : "保存できませんでした。");

      return false;
    }
  }

  if (!data)
    return (
      <div className="loading" role="status">
        台帳を準備しています…
      </div>
    );

  return (
    <LedgerContext.Provider value={{ data, date, message, notify, update }}>
      {children}
    </LedgerContext.Provider>
  );
}
