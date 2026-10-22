import type { Participation } from "../core";
import { type Db } from "./db";

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
