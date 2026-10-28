//gerenciar itens
//importações
import { assertCents } from "../core";
import { touchAccount } from "./accounts";
import { type Db, inTransaction, type SqlParam } from "./db";
import { AccountError } from "./errors";
import { newId } from "./ids";
import { type AccountItem, type ItemRow, toItem } from "./models";

//objeto Item
export interface NewItemInput {
  name: string;
  quantity?: number;
  totalCents: number;
}

export type ItemPatch = Partial<NewItemInput>;

//válida o nome do item
function checkName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed)
    throw new AccountError("INVALID_VALUE", "O item precisa de um nome.");
  return trimmed;
}

//válida a quantidade
function checkQuantity(quantity: number): void {
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new AccountError("INVALID_VALUE", `Quantidade inválida ${quantity}`);
  }
}

//buscar item pelo id
export async function getItem(db: Db, id: string): Promise<AccountItem | null> {
  const row = await db.getFirstAsync<ItemRow>(
    "SELECT * FROM item WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return row ? toItem(row) : null;
}

//listar itens de uma conta
export async function listItems(
  db: Db,
  accountId: string,
): Promise<AccountItem[]> {
  const rows = await db.getAllAsync<ItemRow>(
    "SELECT * FROM item WHERE conta_id = ? AND deleted_at IS NULL ORDER BY ordem, created_at",
    [accountId],
  );
  return rows.map(toItem);
}

//adicionar item a conta
export async function addItem(
  db: Db,
  accountId: string,
  input: NewItemInput,
): Promise<AccountItem> {
  const name = checkName(input.name);
  const quantity = input.quantity ?? 1;
  checkQuantity(quantity);
  assertCents(input.totalCents, "Valor do item");

  const id = newId();
  await inTransaction(db, async () => {
    const now = Date.now();
    const next = await db.getFirstAsync<{ proxima: number }>(
      "SELECT COALESCE(MAX(ordem + 1, 0) AS proxima FROM item WHERE conta_id = ? AND deleted_at IS NULL",
      [accountId],
    );
    await touchAccount(db, accountId, true);
    await db.runAsync(
      `INSERT INTO item (id, conta_id, nome, quantidade, valor_linha_centavos, ordem, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        accountId,
        name,
        quantity,
        input.totalCents,
        next?.proxima ?? 0,
        now,
        now,
      ],
    );
  });
  return (await getItem(db, id))!;
}

//atualizar item
export async function updateItem(
  db: Db,
  id: string,
  patch: ItemPatch,
): Promise<AccountItem> {
  const sets: string[] = [];
  const params: SqlParam[] = [];
  if (patch.name !== undefined) {
    sets.push("nome = ?");
    params.push(checkName(patch.name));
  }
  if (patch.quantity !== undefined) {
    checkQuantity(patch.quantity);
    sets.push("quantidade = ?");
    params.push(patch.quantity);
  }
  if (patch.totalCents !== undefined) {
    assertCents(patch.totalCents, "Valor do item");
    sets.push("valor_linha_centavos = ?");
    params.push(patch.totalCents);
  }

  await inTransaction(db, async () => {
    const current = await getItem(db, id);
    if (!current) throw new AccountError("NOT_FOUND", "Item não encontrado.");
    if (sets.length > 0) {
      await db.runAsync(
        `UPDATE item SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`,
        [...params, Date.now(), id],
      );
    }
    await touchAccount(db, current.accontId, true);
  });
  return (await getItem(db, id))!;
}

//remover item
export async function removeItem(db: Db, id: string): Promise<void> {
  await inTransaction(db, async () => {
    const current = await getItem(db, id);
    if (!current) throw new AccountError("NOT_FOUND", "Item não encontrado.");
    const now = Date.now();
    await db.runAsync(
      "UPDATE consumo SET deleted_at = ?, updated_at = ? WHERE item_id = ? AND deleted_at IS NULL",
      [now, now, id],
    );
    await db.runAsync(
      "UPDATE item SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [now, now, id],
    );
    await touchAccount(db, current.accontId, true);
  });
}
