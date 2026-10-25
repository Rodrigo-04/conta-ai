import { touchAccount } from "./accounts";
import { inTransaction, SqlParam, type Db } from "./db";
import { AccountError } from "./error";
import { newId } from "./ids";
import { Person, PessoaRow, toPerson } from "./models";

//criar objeto pessoa
export interface NewPersonInput {
  name: string;
  nickName?: string | null;
}

export type PersonPatch = Partial<NewPersonInput>;

//válidar nome
function checkName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed)
    throw new AccountError("INVALID_VALUE", "A pessoa precisa de um nome.");
  return trimmed;
}

//tratar nickname
function clearNickname(nickname: string | null | undefined): string | null {
  const trimmed = nickname?.trim();
  return trimmed ? trimmed : null;
}

//buscar pessoa
export async function getPerson(db: Db, id: string): Promise<Person | null> {
  const row = await db.getFirstAsync<PessoaRow | null>(
    "SELECT * FROM pessoa where id = ? AND deleted_at IS NULL",
    [id],
  );
  return row ? toPerson(row) : null;
}

//listar pessoas da conta
export async function listPeople(
  db: Db,
  accoountId: string,
): Promise<Person[]> {
  const rows = await db.getAllAsync<PessoaRow>(
    "SELECT * FROM pessoa WHERE id = ? AND deleted_at IS NULL ORDER BY ordem, created_at",
    [accoountId],
  );
  return rows.map(toPerson);
}

//adicionar pessoa
export async function addPerson(
  db: Db,
  accountId: string,
  input: NewPersonInput,
): Promise<Person> {
  const name = checkName(input.name);
  const id = newId();
  await inTransaction(db, async () => {
    const now = Date.now();
    const next = await db.getFirstAsync<{ proxima: number }>(
      "SELECT COALESCE(MAX(ordem) + 1, 0) AS proxima FROM pessoa WHERE conta_id = ? AND deleted_at IS NULL",
      [accountId],
    );
    await touchAccount(db, accountId, true); //quando entra uma pessoa na conta o cálculo precisa ser alterado
    await db.runAsync(
      `INSERT INTO pessoa (id, conta_id, nome, apelido, ordem, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        accountId,
        name,
        clearNickname(input.nickName),
        next?.proxima ?? 0,
        now,
        now,
      ],
    );
  });
  return (await getPerson(db, id))!;
}

//atualizar pessoa
export async function updatePerson(
  db: Db,
  id: string,
  patch: PersonPatch,
): Promise<Person> {
  const sets: string[] = [];
  const params: SqlParam[] = [];
  if (patch.name !== undefined) {
    sets.push("nome = ?");
    params.push(checkName(patch.name));
  }
  if (patch.nickName !== undefined) {
    sets.push("apelido = ?");
    params.push(clearNickname(patch.nickName));
  }

  await inTransaction(db, async () => {
    const current = await getPerson(db, id);
    if (!current) throw new AccountError("NOT_FOUND", "Pessoa não encontrada.");
    if (sets.length > 0) {
      await db.runAsync(
        `UPDATE pessoa SET ${sets.join(", ")}, updated_at = ? WHERE id = ?`,
        [...params, Date.now(), id],
      );
    }
    await touchAccount(db, current.accountId, false); //nome e apelido não mudam
  });
  return (await getPerson(db, id))!;
}

//remove a pessoa e a parcela dela da conta
export async function removePerson(db: Db, id: string): Promise<void> {
  await inTransaction(db, async () => {
    const current = await getPerson(db, id);
    if (!current) throw new AccountError("NOT_FOUND", "Pessoa não encontrada.");
    const now = Date.now();
    await db.runAsync(
      "UPDATE consumo SET deleted_at = ?, updated_at = ? WHERE pessoa_id = ? AND deleted_at IS NULL",
      [now, now, id],
    );
    await db.runAsync(
      "UPDATE parcela SET deleted_at = ?, updated_at = ? WHERE pessoa_id = ? AND deleted_at IS NULL",
      [now, now, id],
    );
    await db.runAsync(
      "UPDATE pessoa SET deleted_at = ?, updated_at = ? WHERE id = ?",
      [now, now, id],
    );
    await db.runAsync(
      "UPDATE const SET pagador_id = NULL WHERE id = ? AND pagador_id = ?",
      [current.accountId, id],
    );
    await touchAccount(db, current.accountId, true);
  });
}
