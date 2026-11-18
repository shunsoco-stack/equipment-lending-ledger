import { seedItemIds, seedMemberIds } from "./seed.ts";

export function recordPath(section: "items" | "members" | "lend" | "return", recordId: string) {
  const known = section === "members" ? seedMemberIds : seedItemIds;

  return known.includes(recordId)
    ? `/${section}/${recordId}`
    : `/${section}/local?record=${encodeURIComponent(recordId)}`;
}
