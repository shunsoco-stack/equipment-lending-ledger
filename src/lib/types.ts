export type Item = {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  registeredOn: string;
  registeredBy: string;
  note: string;
};

export type Member = { id: string; name: string; department: string; active: boolean };

export type Loan = {
  id: string;
  itemId: string;
  itemName: string;
  itemCode: string;
  memberId: string;
  memberName: string;
  lentAt: string;
  dueOn: string;
  purpose: string;
  returnedAt: string | null;
  receivedBy: string | null;
  receiverName: string | null;
  condition: string;
};

export type Ledger = { version: 1; items: Item[]; members: Member[]; loans: Loan[] };
