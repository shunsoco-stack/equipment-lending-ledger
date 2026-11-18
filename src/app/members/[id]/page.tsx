import { Suspense } from "react";
import { RecordPage } from "@/components/record-page";
import { seedMemberIds } from "@/lib/seed";

export const dynamicParams = false;

export function generateStaticParams() {
  return [...seedMemberIds, "local"].map((recordId) => ({ id: recordId }));
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id: recordId } = await params;

  return (
    <Suspense fallback={<p>台帳を読み込んでいます…</p>}>
      <RecordPage id={recordId} section="members" />
    </Suspense>
  );
}
