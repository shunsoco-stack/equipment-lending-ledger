import { importBackup } from "./backup.ts";
import { createSeed } from "./seed.ts";

export const STORAGE_KEY = "ell:v1";

export function loadStored(raw: string | null, now: Date) {
  if (raw === null) return { data: createSeed(now), recovered: false };

  try {
    return { data: importBackup(raw, now), recovered: false };
  } catch {
    return { data: createSeed(now), recovered: true };
  }
}
