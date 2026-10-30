//controle de conta
import { assertCents, DEFAULT_SERVICE_PERCENT, FeeMode } from "../core";
import { inTransaction, type Db, type SqlParam } from "./db";
import { AccountError } from "./errors";
import { newId, todayIso } from "./ids";
import {
  Account,
  AccountSummary,
  ContaRow,
  FEE_MODE_TO_DB,
  SPLIT_MODE_TO_DB,
  SplitMode,
  toAccount,
} from "./models";

//conta
export interface NewAccountInput {
  date?: string;
  restaurant?: string | null;
  printedTotalCents?: number | null;
  feePercent?: number | null;
  feeCents?: number | null;
  splitMode?: SplitMode;
  feeMode?: FeeMode;
  photoPath?: string | null;
}

//permite modificar valores de mane
export interface AccountPatch {
  date?: string;
  restaurant?: string | null;
  printedTotalCents?: number | null;
  feePercent?: number | null;
  feeCents?: number | null;
  splitMode?: SplitMode;
  feeMode?: FeeMode;
  payerId?: string | null;
  photoPath?: string | null;
}

//verifica se o valor é válido
function checkOptionalCents(
  value: number | null | undefined,
  label: string,
): void {
  if (value !== undefined && value !== null) assertCents(value, label);
}

//verifica se o percentual da conta é válido
function checkPercent(value: number | null | undefined): void {
  if (
    value !== undefined &&
    value !== null &&
    (!Number.isFinite(value) || value < 0)
  ) {
    throw new AccountError("INVALID_VALUE", `Percentual inválido: ${value}`);
  }
}

//busca uma conta
export async function getAccount(db: Db, id: string): Promise<Account | null> {
  const row = await db.getFirstAsync<ContaRow>(
    "SELECT * FROM conta WHERE id = ? AND deleted_at IS NULL",
    [id],
  );
  return row ? toAccount(row) : null;
}

//cria uma conta
export async function createAccount(
  db: Db,
  input: NewAccountInput = {},
): Promise<Account> {
  checkOptionalCents(input.printedTotalCents, "Total da nota");
  checkOptionalCents(input.feeCents, "Taxa de serviço");
  checkPercent(input.feePercent);

  const id = newId();
  const now = Date.now();
  await inTransaction(db, async () => {
    await db.runAsync(
      `INSERT INTO conta (id, data, restaurante, total_impresso_centavos, taxa_percentual, taxa_centavos,
                          modo_divisao, modo_taxa, foto_caminho_local, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.date ?? todayIso(),
        input.restaurant ?? null,
        input.printedTotalCents ?? null,
        input.feePercent === undefined
          ? DEFAULT_SERVICE_PERCENT
          : input.feePercent,
        input.feeCents ?? null,
        SPLIT_MODE_TO_DB[input.splitMode ?? "items"],
        FEE_MODE_TO_DB[input.feeMode ?? "equal"],
        input.photoPath ?? null,
        now,
        now,
      ],
    );
  });
  return (await getAccount(db, id))!;
}

//relaciona as propriedades do TS às colunas do SQL
const PATCH_COLUMNS: Record<
  keyof AccountPatch,
  { column: string; affectsResult: boolean }
> = {
  date: { column: "data", affectsResult: false },
  restaurant: { column: "restaurante", affectsResult: false },
  printedTotalCents: { column: "total_impresso_centavos", affectsResult: true },
  feePercent: { column: "taxa_percentual", affectsResult: true },
  feeCents: { column: "taxa_centavos", affectsResult: true },
  splitMode: { column: "modo_divisao", affectsResult: true },
  feeMode: { column: "modo_taxa", affectsResult: true },
  payerId: { column: "pagador_id", affectsResult: false },
  photoPath: { column: "foto_caminho_local", affectsResult: false },
};

//atualizar conta
export async function updateAccount(
  db: Db,
  id: string,
  patch: AccountPatch,
): Promise<Account> {
  checkOptionalCents(patch.printedTotalCents, "Total da nota");
  checkOptionalCents(patch.feeCents, "Taxa de serviço");
  checkPercent(patch.feePercent);

  const sets: string[] = [];
  const params: SqlParam[] = [];
  let invalidate = false;

  for (const key of Object.keys(PATCH_COLUMNS) as (keyof AccountPatch)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    const { column, affectsResult } = PATCH_COLUMNS[key];
    sets.push(`${column} = ?`);
    if (key === "splitMode") params.push(SPLIT_MODE_TO_DB[value as SplitMode]);
    else if (key === "feeMode") params.push(FEE_MODE_TO_DB[value as FeeMode]);
    else params.push(value as SqlParam);
    invalidate ||= affectsResult;
  }

  await inTransaction(db, async () => {
    if (patch.payerId) {
      const person = await db.getFirstAsync<{ id: string }>(
        "SELECT id FROM pessoa WHERE id = ? AND conta_id = ? AND deleted_at IS NULL",
        [patch.payerId, id],
      );
      if (!person)
        throw new AccountError(
          "UNKNOWN_PERSON",
          "O pagador precisa ser uma pessoa da conta.",
        );
    }
    if (invalidate) {
      sets.push(
        "diferenca_centavos = 0",
        "pessoa_diferenca_id = NULL",
        "sorteio_realizado = 0",
      );
    }
    sets.push("updated_at = ?");
    params.push(Date.now(), id);
    const result = await db.runAsync(
      `UPDATE conta SET ${sets.join(", ")} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
    if (result.changes === 0)
      throw new AccountError("NOT_FOUND", "Conta não encontrada.");
  });
  return (await getAccount(db, id))!;
}

//marca alteração em um conta
export async function touchAccount(
  db: Db,
  accountId: string,
  invalidateDraw: boolean,
): Promise<void> {
  const reset = invalidateDraw
    ? ", diferenca_centavos = 0, pessoa_diferenca_id = NULL, sorteio_realizado = 0"
    : "";
  const result = await db.runAsync(
    `UPDATE conta SET updated_at = ?${reset} WHERE id = ? AND deleted_at IS NULL`,
    [Date.now(), accountId],
  );
  if (result.changes === 0)
    throw new AccountError("NOT_FOUND", "Conta não encontrada.");
}

//exclusão da conta e seus relacionamentos
export async function deleteAccount(db: Db, id: string): Promise<void> {
  await inTransaction(db, async () => {
    const now = Date.now();
    const result = await db.runAsync(
      "UPDATE conta SET deleted_at = ?, updated_at = ? WHERE id = ? AND deleted_at IS NULL",
      [now, now, id],
    );
    if (result.changes === 0)
      throw new AccountError("NOT_FOUND", "Conta não encontrada.");

    const mark = "SET deleted_at = ?, updated_at = ? WHERE deleted_at IS NULL";
    await db.runAsync(
      `UPDATE consumo ${mark} AND item_id IN (SELECT id FROM item WHERE conta_id = ?)`,
      [now, now, id],
    );
    await db.runAsync(`UPDATE item ${mark} AND conta_id = ?`, [now, now, id]);
    await db.runAsync(`UPDATE pessoa ${mark} AND conta_id = ?`, [now, now, id]);
    await db.runAsync(`UPDATE parcela ${mark} AND conta_id = ?`, [
      now,
      now,
      id,
    ]);
  });
}

type SummaryRow = ContaRow & {
  pessoas: number;
  subtotal_centavos: number;
  pendentes: number;
  pendente_centavos: number;
};

//lista a conta mais recente com pagamento pendente
export async function listAccountSummaries(db: Db): Promise<AccountSummary[]> {
  const rows = await db.getAllAsync<SummaryRow>(
    `SELECT c.*,
       (SELECT COUNT(*) FROM pessoa p WHERE p.conta_id = c.id AND p.deleted_at IS NULL) AS pessoas,
       (SELECT COALESCE(SUM(i.valor_linha_centavos), 0) FROM item i
          WHERE i.conta_id = c.id AND i.deleted_at IS NULL) AS subtotal_centavos,
       (SELECT COUNT(*) FROM parcela p WHERE p.conta_id = c.id AND p.deleted_at IS NULL
          AND p.status = 'pendente') AS pendentes,
       (SELECT COALESCE(SUM(p.valor_devido_centavos), 0) FROM parcela p WHERE p.conta_id = c.id
          AND p.deleted_at IS NULL AND p.status = 'pendente') AS pendente_centavos
     FROM conta c
     WHERE c.deleted_at IS NULL
     ORDER BY c.data DESC, c.created_at DESC`,
  );
  return rows.map((r) => ({
    account: toAccount(r),
    peopleCount: r.pessoas,
    itemsSubtotalCents: r.subtotal_centavos,
    pendingCount: r.pendentes,
    pendingCents: r.pendente_centavos,
  }));
}
