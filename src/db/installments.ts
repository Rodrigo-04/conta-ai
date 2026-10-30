import { assertCents } from "../core";
import { touchAccount } from "./accounts";
import { inTransaction, type Db } from "./db";
import { AccountError } from "./errors";
import { newId } from "./ids";
import {
  STATUS_TO_DB,
  toInstallment,
  type Installment,
  type InstallmentStatus,
  type ParcelaRow,
} from "./models";

//lista as parcelas ativas
export async function listInstallments(
  db: Db,
  accountId: string,
): Promise<Installment[]> {
  const rows = await db.getAllAsync<ParcelaRow>(
    `SELECT pa.* FROM parcela pa
       JOIN pessoa pe ON pe.id = pa.pessoa_id
      WHERE pa.conta_id = ? AND pa.deleted_at IS NULL
      ORDER BY pe.ordem, pe.created_at`,
    [accountId],
  );
  return rows.map(toInstallment);
}

//marcar parcela como paga ou pendente
export async function setInstallmentStatus(
  db: Db,
  installmentId: string,
  status: InstallmentStatus,
): Promise<Installment> {
  await inTransaction(db, async () => {
    const row = await db.getFirstAsync<ParcelaRow>(
      "SELECT * FROM parcela WHERE id = ? AND deleted_at IS NULL",
      [installmentId],
    );
    if (!row) throw new AccountError("NOT_FOUND", "Cobrança não encontrada.");
    const now = Date.now();
    await db.runAsync(
      "UPDATE parcela SET status = ?, pago_em = ?, updated_at = ? WHERE id = ?",
      [
        STATUS_TO_DB[status],
        status === "paid" ? now : null,
        now,
        installmentId,
      ],
    );
    await touchAccount(db, row.conta_id, false); // não muda valores, mantém a diferença sorteada
  });
  const row = await db.getFirstAsync<ParcelaRow>(
    "SELECT * FROM parcela WHERE id = ?",
    [installmentId],
  );
  return toInstallment(row!);
}

//objeto resultado da divisão
export interface SaveSplitResultInput {
  shares: readonly { personId: string; amountCents: number }[];
  remainder: { cents: number; personId: string | null };
}

//grava o fechamento da conta, com valor de cada pessoa
export async function saveSplitResult(
  db: Db,
  accountId: string,
  input: SaveSplitResultInput,
): Promise<void> {
  //validar valores
  input.shares.forEach((s) => assertCents(s.amountCents, "Valor da pessoa"));
  assertCents(input.remainder.cents, "Diferença");

  await inTransaction(db, async () => {
    const account = await db.getFirstAsync<{ pagador_id: string | null }>(
      "SELECT pagador_id FROM conta WHERE id = ? AND deleted_at IS NULL",
      [accountId],
    );
    if (!account) throw new AccountError("NOT_FOUND", "Conta não encontrada.");

    //preparar dados
    const now = Date.now();
    const existing = await db.getAllAsync<ParcelaRow>(
      "SELECT * FROM parcela WHERE conta_id = ?",
      [accountId],
    );
    const byPerson = new Map(existing.map((p) => [p.pessoa_id, p]));
    const keep = new Set<string>();

    //percorrer os dados de cada pessoa
    for (const share of input.shares) {
      keep.add(share.personId);
      const current = byPerson.get(share.personId);
      const alive =
        current !== undefined && (current.deleted_at ?? null) === null;
      const isPayer = share.personId === account.pagador_id;
      const status = isPayer ? "pago" : alive ? current.status : "pendente";
      const paidAt =
        status === "pago"
          ? alive && current.pago_em
            ? current.pago_em
            : now
          : null;

      //atualizar ou criar parcela
      if (current) {
        await db.runAsync(
          `UPDATE parcela SET valor_devido_centavos = ?, status = ?, pago_em = ?, deleted_at = NULL,
                  updated_at = ? WHERE id = ?`,
          [share.amountCents, status, paidAt, now, current.id],
        );
      } else {
        await db.runAsync(
          `INSERT INTO parcela (id, conta_id, pessoa_id, valor_devido_centavos, status, pago_em, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId(),
            accountId,
            share.personId,
            share.amountCents,
            status,
            paidAt,
            now,
            now,
          ],
        );
      }
    }

    //remover parcela de pessoas que sairam da divisão
    for (const current of existing) {
      if (
        !keep.has(current.pessoa_id) &&
        (current.deleted_at ?? null) === null
      ) {
        await db.runAsync(
          "UPDATE parcela SET deleted_at = ?, updated_at = ? WHERE id = ?",
          [now, now, current.id],
        );
      }
    }

    //salvar diferença de centavos na conta
    const drawn =
      input.remainder.cents > 0 && input.remainder.personId !== null;
    await db.runAsync(
      `UPDATE conta SET diferenca_centavos = ?, pessoa_diferenca_id = ?, sorteio_realizado = ?, updated_at = ?
        WHERE id = ?`,
      [
        input.remainder.cents,
        drawn ? input.remainder.personId : null,
        drawn ? 1 : 0,
        now,
        accountId,
      ],
    );
  });
}
