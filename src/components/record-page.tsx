"use client";

import { useSearchParams } from "next/navigation";
import { ItemDetail } from "./item-detail";
import { MemberDetail } from "./members";
import { Transaction } from "./transaction";

export function RecordPage({
  id: recordId,
  section,
}: {
  id: string;
  section: "items" | "members" | "lend" | "return";
}) {
  const localId = useSearchParams().get("record") ?? "";
  const resolved = recordId === "local" ? localId : recordId;
  if (recordId === "local" && !localId)
    return <p>管理対象のIDが指定されていません。備品・メンバー一覧から選択してください。</p>;

  if (section === "items") return <ItemDetail key={resolved} id={resolved} />;
  if (section === "members") return <MemberDetail key={resolved} id={resolved} />;

  return <Transaction key={`${section}-${resolved}`} id={resolved} mode={section} />;
}
