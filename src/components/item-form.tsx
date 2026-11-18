"use client";

import { useState } from "react";
import { useLedger } from "./ledger-provider";
import { Field } from "./ui";
import { categories, saveItem } from "@/lib/items";
import type { Item } from "@/lib/types";

export function ItemForm({ item, onDone }: { item?: Item; onDone: () => void }) {
  const { data, date, update } = useLedger();
  const [error, setError] = useState("");
  const [value, setValue] = useState<Item>(
    item ?? {
      id: "",
      code: "",
      name: "",
      category: categories[0],
      location: "",
      registeredOn: date,
      registeredBy: data.members.find((member) => member.active)?.name ?? "",
      note: "",
    },
  );

  function field(key: keyof Item, text: string) {
    setValue((previous) => ({ ...previous, [key]: text }));
  }

  return (
    <form
      className="panel form-panel"
      onSubmit={(event) => {
        event.preventDefault();
        const candidate = { ...value, id: value.id || crypto.randomUUID() };

        try {
          saveItem(data, candidate, new Date());
          if (update((current) => saveItem(current, candidate, new Date()), "備品を保存しました。"))
            onDone();
        } catch (error) {
          setError((error as Error).message);
        }
      }}
    >
      <h2>{item ? "備品を編集" : "備品を追加"}</h2>
      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      <div className="form-grid">
        <Field label="管理番号 *">
          <input
            required
            value={value.code}
            onChange={(event) => field("code", event.target.value)}
            placeholder="UMI-CAM-003"
          />
        </Field>
        <Field label="備品名 *">
          <input
            required
            value={value.name}
            onChange={(event) => field("name", event.target.value)}
          />
        </Field>
        <Field label="カテゴリ *">
          <select
            value={value.category}
            onChange={(event) => field("category", event.target.value)}
          >
            {categories.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </Field>
        <Field label="保管場所 *">
          <input
            required
            value={value.location}
            onChange={(event) => field("location", event.target.value)}
          />
        </Field>
        <Field label="登録日 *">
          <input
            required
            type="date"
            max={date}
            value={value.registeredOn}
            onChange={(event) => field("registeredOn", event.target.value)}
          />
        </Field>
        <Field label="登録者 *">
          <input
            required
            value={value.registeredBy}
            onChange={(event) => field("registeredBy", event.target.value)}
          />
        </Field>
      </div>
      <Field label="備考">
        <textarea value={value.note} onChange={(event) => field("note", event.target.value)} />
      </Field>
      <div className="actions">
        <button className="primary" type="submit">
          保存する
        </button>
        <button type="button" onClick={onDone}>
          キャンセル
        </button>
      </div>
    </form>
  );
}
