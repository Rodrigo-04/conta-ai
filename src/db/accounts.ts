import { assertCents, DEFAULT_SERVICE_PERCENT, FeeMode } from "../core";
import { inTransaction, type Db, type SqlParam } from "./db";
import { AccountError } from "./error";
import { newId, todayIso } from "./ids";
import {
    Account,
    ContaRow,
    FEE_MODE_TO_DB,
    SPLIT_MODE_TO_DB,
    SplitMode,
    toAccount,
} from "./models";

export interface NewAccountInput {
  date?: string;
  restaurant?: string | null;
  printedTotalCents?: number | null;
  feePercent?: number | null;
  feeCents?: number | null;
  splitmode?: SplitMode;
  feeMode?: FeeMode;
  photoPath?: string | null;
}

export interface AccountPath {
  date?: string;
  restaurant?: string | null;
  printedTotalCents?: number | null;
  feePercent?: number | null;
  feeCents?: number | null;
  splitmode?: SplitMode;
  feeMode?: FeeMode;
  payerId?: string | null;
  photoPath?: string | null;
}

function checkOptionalCents(
  value: number | null | undefined,
  label: string,
): void {
  if (value !== undefined && value !== null) assertCents(value, label);
}

function checkPercent(value: number | null | undefined): void {
  if (
    value !== undefined &&
    value !== null &&
    (!Number.isFinite(value) || value < 0)
  ) {
    throw new AccountError("INVALID_VALUE", `Percentual inválido ${value}`);
  }
}

export async function getAccount(db: Db, id: string): Promise<Account | null> {
  const row = await db.getFirstAsync<ContaRow>(
    "SELECT * FROM conta WHERE id = : AND deleted_at IA NULL",
    [id],
  );
  return row ? toAccount(row) : null;
}

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
      `INSERT INTO conta (id, data, restaurante, total_impresso_centavos, taxa_percentual, taxa_centavos, modo_divisao, modo_taxa, foto_caminho_local, created_at, updated_at)
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
        SPLIT_MODE_TO_DB[input.splitmode ?? "items"],
        FEE_MODE_TO_DB[input.feeMode ?? "equal"],
        input.photoPath ?? null,
        now,
        now,
      ],
    );
  });
  return (await getAccount(db, id))!;
}

//valores que mudam o valor devido: alteralos pode toranar a diferença de centavos errada
const PATCH_COLUMNS: Record<
  keyof AccountPath,
  { column: string; affectsResult: boolean }
> = {
  date: { column: "data", affectsResult: false },
  restaurant: { column: "restaurante", affectsResult: false },
  printedTotalCents: { column: "total_impresso_centavos", affectsResult: true },
  feePercent: { column: "taxa_percentual", affectsResult: true },
  feeCents: { column: "taxa_centavos", affectsResult: true },
  splitmode: { column: "modo_divisao", affectsResult: true },
  feeMode: { column: "modo_taxa", affectsResult: true },
  payerId: { column: "pagador_id", affectsResult: false },
  photoPath: { column: "foto_caminho_local", affectsResult: false },
};

export async function updateAccount(
  db: Db,
  id: string,
  patch: AccountPath,
): Promise<Account> {
  checkOptionalCents(patch.printedTotalCents, "Total da nota");
  checkOptionalCents(patch.feeCents, "Taxa de serviço");
  checkPercent(patch.feePercent);

  const sets: string[] = [];
  const params: SqlParam[] = [];
  let invalidate = false;

  for (const key of Object.keys(PATCH_COLUMNS) as (keyof AccountPath)[]) {
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
      const person = await db.getFirstAsync<[id: string]>(
        "SELECT id FROM pessoa WHERE id = ? AND deleted_at IS NULL",
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
        "sorteio_realizdo = 0",
      );
    }
    sets.push("update_at = ?");
    params.push(Date.now(), id);
    const result = await db.runAsync(
      `UPDATE conta SET ${sets.join(",")} WHERE id = ? AND deleted_at IS NULL`,
      params,
    );
    if (result.changes === 0)
      throw new AccountError("NOT_FOUND", "Conta não encontrada.");
  });
  return (await getAccount(db, id))!;
}
