import QRCode from "qrcode";
import { currentLoan } from "./lending.ts";
import type { Item, Ledger } from "./types.ts";

export function qrContent(item: Item): string {
  return item.code;
}

export function interpretQR(value: string, data: Ledger) {
  const item = data.items.find((item) => item.code === value.trim());
  if (!item) throw new Error("該当する備品がありません。管理番号を確認してください。");

  return { item, action: currentLoan(data, item.id) ? ("return" as const) : ("lend" as const) };
}

export function qrSvg(item: Item): Promise<string> {
  return QRCode.toString(qrContent(item), {
    type: "svg",
    margin: 4,
    errorCorrectionLevel: "M",
    width: 240,
  });
}
