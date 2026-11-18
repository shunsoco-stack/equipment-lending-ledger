import type { Ledger, Member } from "./types.ts";

export function saveMember(data: Ledger, member: Member): Ledger {
  const clean = { ...member, name: member.name.trim(), department: member.department.trim() };
  if (!clean.id || !clean.name || !clean.department || typeof clean.active !== "boolean")
    throw new Error("名前と所属を入力してください。");

  return {
    ...data,
    members: data.members.some((row) => row.id === clean.id)
      ? data.members.map((row) => (row.id === clean.id ? clean : row))
      : [...data.members, clean],
  };
}

export function deleteMember(data: Ledger, recordId: string): Ledger {
  if (data.loans.some((loan) => loan.memberId === recordId && !loan.returnedAt))
    throw new Error("貸出中の備品があるメンバーは削除できません。");

  return { ...data, members: data.members.filter((member) => member.id !== recordId) };
}
