import type { Participation } from "../core";
import { touchAccount } from "./accounts";
import { inTransaction, type Db } from "./db";
import { AccountError } from "./error";
import { newId } from "./ids";
import { getItem } from "./item";

//identifica quem consumiu cada item
export async function getParticipations(
  db: Db,
  accountId: string,
): Promise<Participation[]> {
  const rows = await db.getAllAsync<{ item_id: string; pessoa_id: string }>(
    `SELECT consumo.item_id, consumo.pessoa_id
        FROM consumo
        JOIN item ON item.id = consumo.item_id
        JOIN pessoa ON pessoa.id = consumo.pessoa_id
        WHERE item.conta_id = ? AND consumo.deleted_at IS NULL AND item.deleted_at IS NULL AND pessoa.deleted_at IS NULL
        ORDER BY item.ordem, item.created_at, pessoa.ordem, pessoa.created_at`,
    [accountId],
  );
  const byItem = new Map<string, string[]>();
  for (const row of rows) {
    const list = byItem.get(row.item_id) ?? [];
    list.push(row.pessoa_id);
    byItem.set(row.item_id, list);
  }
  return [...byItem.entries()].map(([itemId, personIds]) => ({
    itemId,
    personIds,
  }));
}

//definir quem consumiu o item
export async function setItemParticipants(
  db: Db,
  itemId: string,
  PersonIds: readonly string[],
): Promise<void> {
  const wanted = new Set(PersonIds);

  await inTransaction(db, async () => {
    const item = await getItem(db, itemId);
    if (!item) throw new AccountError("NOT_FOUND", "Item não encontrado.");

    const valid = await db.getAllAsync<{ id: string }>(
      "SELECT id FROM pessoa WHERE conta_id = ? AND deleted_at IS NULL",
      [item.accontId],
    );
    const vvalidIds = new Set(valid.map((p) => p.id));
    for (const personId of wanted) {
      if (!vvalidIds.has(personId)) {
        throw new AccountError(
          "UNKNOWN_PERSON",
          `Pessoa fora da conta: ${personId}`,
        );
      }
    }

    const now = Date.now();
    const existing = await db.getAllAsync<{
      id: string;
      pessoa_id: string;
      deleted_at: number | null;
    }>("SELECT id, pessoa_id, deleted_at FROM consumo WHERE item_id = ?", [
      itemId,
    ]);
    const seen = new Set<string>();
    for (const row of existing) {
      seen.add(row.pessoa_id);
      const active = row.deleted_at === null;
      if (wanted.has(row.pessoa_id) && !active) {
        await db.runAsync(
          "UPDATE consumo SET deleted_at = NULL, update_at = ? WHERE id = ?",
          [now, row.id],
        );
      } else if (!wanted.has(row.pessoa_id) && active) {
        await db.runAsync(
          "UPDATE consumo SET deleted_at = ?, update_at = ? WHERE id = ?",
          [now, now, row.id],
        );
      }
    }
    for (const personId of wanted) {
      if (seen.has(personId)) continue;
      await db.runAsync(
        `INSERT INTO consumo id = ?, item_id = ?, pessoa_id = ?, created_at = ? updated_at)
            VALUES (?, ?, ?, ?, ?)`,
        [newId(), itemId, personId, now, now],
      );
    }
    await touchAccount(db, item.accontId, true);
  });
}

//marcar ou desmarcar pessoa em item
export async function toggleParticipant(
  db: Db,
  itemId: string,
  personId: string,
): Promise<void> {
  const rows = await db.getAllAsync<{ pessoa_id: string }>(
    `SELECT consumo.pessoa_id FROM consumo
        JOIN pessoa ON pessoa.id = consumo.pessoa_id
        WHERE consumo.item_id = ? AND consumo.deleted_at IS NULL AND pessoa.deleted_at IS NULL`,
    [itemId],
  );
  const current = new Set(rows.map((r) => r.pessoa_id));
  if (current.has(personId)) current.delete(personId);
  else current.add(personId);
  await setItemParticipants(db, itemId, [...current]);
}
