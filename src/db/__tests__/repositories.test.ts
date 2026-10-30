/** @jest-environment node */
import { SplitError } from "../../core";
import {
  addItem,
  addPerson,
  createAccount,
  deleteAccount,
  getAccount,
  getParticipations,
  listAccountSummaries,
  listItems,
  listPeople,
  loadAccountDetail,
  removeItem,
  removePerson,
  setItemParticipants,
  toggleParticipant,
  updateAccount,
  updateItem,
  updatePerson,
  AccountError,
  personLabel,
  saveSplitResult,
  type Db,
} from "..";
import { createTestDb } from "../testing/testDb";

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (e) {
    return e instanceof AccountError || e instanceof SplitError ? e.code : "OUTRO_ERRO";
  }
  return undefined;
}

/** Conta com a divisão já sorteada, para testar a invalidação. */
async function accountWithDraw(db: Db) {
  const account = await createAccount(db);
  const ana = await addPerson(db, account.id, { name: "Ana" });
  await addPerson(db, account.id, { name: "Bia" });
  await saveSplitResult(db, account.id, {
    shares: [{ personId: ana.id, amountCents: 100 }],
    remainder: { cents: 1, personId: ana.id },
  });
  expect((await getAccount(db, account.id))?.drawDone).toBe(true);
  return { account, ana };
}

describe("contas", () => {
  it("cria com os padrões combinados", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    expect(account.feePercent).toBe(10);
    expect(account.feeCents).toBeNull();
    expect(account.splitMode).toBe("items");
    expect(account.feeMode).toBe("equal");
    expect(account.drawDone).toBe(false);
    expect(account.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(account.id).toHaveLength(36);
  });

  it("guarda o que veio da leitura da nota", async () => {
    const db = await createTestDb();
    const account = await createAccount(db, {
      restaurant: "Cantina",
      date: "2026-10-01",
      printedTotalCents: 8250,
      feeCents: 750,
      feePercent: null,
      feeMode: "proportional",
    });
    expect(account).toMatchObject({
      restaurant: "Cantina",
      date: "2026-10-01",
      printedTotalCents: 8250,
      feeCents: 750,
      feePercent: null,
      feeMode: "proportional",
    });
  });

  it("atualiza só os campos informados e permite limpar com null", async () => {
    const db = await createTestDb();
    const account = await createAccount(db, { restaurant: "A", feeCents: 500 });
    const updated = await updateAccount(db, account.id, { restaurant: "B", feeCents: null });
    expect(updated.restaurant).toBe("B");
    expect(updated.feeCents).toBeNull();
    expect(updated.feePercent).toBe(10);
    expect(updated.updatedAt).toBeGreaterThanOrEqual(account.updatedAt);
  });

  it("só aceita como pagador uma pessoa da conta", async () => {
    const db = await createTestDb();
    const a = await createAccount(db);
    const b = await createAccount(db);
    const personOfB = await addPerson(db, b.id, { name: "Bia" });
    const person = await addPerson(db, a.id, { name: "Ana" });

    expect(await codeOf(updateAccount(db, a.id, { payerId: personOfB.id }))).toBe("UNKNOWN_PERSON");
    expect((await updateAccount(db, a.id, { payerId: person.id })).payerId).toBe(person.id);
  });

  it("rejeita valores inválidos e conta inexistente", async () => {
    const db = await createTestDb();
    const a = await createAccount(db);
    expect(await codeOf(updateAccount(db, a.id, { feeCents: 1.5 }))).toBe("INVALID_AMOUNT");
    expect(await codeOf(updateAccount(db, a.id, { feePercent: -1 }))).toBe("INVALID_VALUE");
    expect(await codeOf(updateAccount(db, "nao-existe", { restaurant: "x" }))).toBe("NOT_FOUND");
    expect(await codeOf(createAccount(db, { printedTotalCents: -5 }))).toBe("INVALID_AMOUNT");
  });

  it("exclusão lógica: some da lista, leva os filhos junto e não apaga as linhas", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const person = await addPerson(db, account.id, { name: "Ana" });
    const item = await addItem(db, account.id, { name: "Pizza", totalCents: 5000 });
    await setItemParticipants(db, item.id, [person.id]);

    await deleteAccount(db, account.id);

    expect(await getAccount(db, account.id)).toBeNull();
    expect(await listAccountSummaries(db)).toHaveLength(0);
    expect(await listItems(db, account.id)).toHaveLength(0);
    expect(await listPeople(db, account.id)).toHaveLength(0);
    expect(await getParticipations(db, account.id)).toHaveLength(0);
    const rows = await db.getAllAsync("SELECT id FROM conta WHERE deleted_at IS NOT NULL");
    expect(rows).toHaveLength(1);
    expect(await codeOf(deleteAccount(db, account.id))).toBe("NOT_FOUND");
  });
});

describe("itens", () => {
  it("adiciona em ordem, aceita quantidade fracionada e limpa o nome", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const a = await addItem(db, account.id, { name: "  Self-service ", quantity: 0.45, totalCents: 1890 });
    const b = await addItem(db, account.id, { name: "Suco", totalCents: 800 });
    expect(a).toMatchObject({ name: "Self-service", quantity: 0.45, totalCents: 1890, order: 0 });
    expect(b.order).toBe(1);
    expect((await listItems(db, account.id)).map((i) => i.name)).toEqual(["Self-service", "Suco"]);
  });

  it("edita nome e valor e remove", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const item = await addItem(db, account.id, { name: "Chopp", totalCents: 1000 });
    const edited = await updateItem(db, item.id, { name: "Chopp 600ml", totalCents: 1200 });
    expect(edited).toMatchObject({ name: "Chopp 600ml", totalCents: 1200 });

    await removeItem(db, item.id);
    expect(await listItems(db, account.id)).toHaveLength(0);
    expect(await codeOf(updateItem(db, item.id, { name: "x" }))).toBe("NOT_FOUND");
  });

  it("rejeita nome vazio, quantidade e valor inválidos", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    expect(await codeOf(addItem(db, account.id, { name: "  ", totalCents: 100 }))).toBe("INVALID_VALUE");
    expect(await codeOf(addItem(db, account.id, { name: "x", quantity: 0, totalCents: 100 }))).toBe("INVALID_VALUE");
    expect(await codeOf(addItem(db, account.id, { name: "x", totalCents: 10.5 }))).toBe("INVALID_AMOUNT");
    expect(await codeOf(addItem(db, "nao-existe", { name: "x", totalCents: 100 }))).toBe("NOT_FOUND");
    expect(await listItems(db, account.id)).toHaveLength(0);
  });
});

describe("pessoas", () => {
  it("guarda nome e apelido, e o rótulo usa o apelido", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const ana = await addPerson(db, account.id, { name: "Ana Souza", nickname: " Aninha " });
    const bia = await addPerson(db, account.id, { name: "Bia" });
    expect(ana.nickname).toBe("Aninha");
    expect(bia.nickname).toBeNull();
    expect(personLabel(ana)).toBe("Aninha");
    expect(personLabel(bia)).toBe("Bia");

    const edited = await updatePerson(db, bia.id, { nickname: "Bi" });
    expect(personLabel(edited)).toBe("Bi");
    expect((await updatePerson(db, bia.id, { nickname: "" })).nickname).toBeNull();
  });

  it("remover o pagador deixa a conta sem pagador e leva o consumo da pessoa", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const ana = await addPerson(db, account.id, { name: "Ana" });
    const bia = await addPerson(db, account.id, { name: "Bia" });
    const item = await addItem(db, account.id, { name: "Pizza", totalCents: 5000 });
    await setItemParticipants(db, item.id, [ana.id, bia.id]);
    await updateAccount(db, account.id, { payerId: ana.id });

    await removePerson(db, ana.id);

    expect((await getAccount(db, account.id))?.payerId).toBeNull();
    expect(await getParticipations(db, account.id)).toEqual([{ itemId: item.id, personIds: [bia.id] }]);
    expect((await listPeople(db, account.id)).map((p) => p.name)).toEqual(["Bia"]);
  });
});

describe("quem consumiu o quê", () => {
  it("define, troca e limpa os participantes de um item", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const ana = await addPerson(db, account.id, { name: "Ana" });
    const bia = await addPerson(db, account.id, { name: "Bia" });
    const cris = await addPerson(db, account.id, { name: "Cris" });
    const item = await addItem(db, account.id, { name: "Porção", totalCents: 3000 });

    await setItemParticipants(db, item.id, [ana.id, bia.id]);
    expect(await getParticipations(db, account.id)).toEqual([{ itemId: item.id, personIds: [ana.id, bia.id] }]);

    await setItemParticipants(db, item.id, [bia.id, cris.id]);
    expect(await getParticipations(db, account.id)).toEqual([{ itemId: item.id, personIds: [bia.id, cris.id] }]);

    // Reativa quem já tinha sido marcado antes (sem violar a regra de unicidade).
    await setItemParticipants(db, item.id, [ana.id, bia.id, cris.id]);
    expect((await getParticipations(db, account.id))[0].personIds).toHaveLength(3);

    await setItemParticipants(db, item.id, []);
    expect(await getParticipations(db, account.id)).toEqual([]);
  });

  it("alterna uma pessoa com toggle", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const ana = await addPerson(db, account.id, { name: "Ana" });
    const item = await addItem(db, account.id, { name: "Suco", totalCents: 800 });

    await toggleParticipant(db, item.id, ana.id);
    expect(await getParticipations(db, account.id)).toHaveLength(1);
    await toggleParticipant(db, item.id, ana.id);
    expect(await getParticipations(db, account.id)).toHaveLength(0);
  });

  it("recusa pessoa de outra conta e item inexistente", async () => {
    const db = await createTestDb();
    const a = await createAccount(db);
    const b = await createAccount(db);
    const stranger = await addPerson(db, b.id, { name: "Estranha" });
    const item = await addItem(db, a.id, { name: "x", totalCents: 100 });

    expect(await codeOf(setItemParticipants(db, item.id, [stranger.id]))).toBe("UNKNOWN_PERSON");
    expect(await codeOf(setItemParticipants(db, "nao-existe", []))).toBe("NOT_FOUND");
  });
});

describe("a diferença sorteada é invalidada quando a divisão muda", () => {
  it("ao mudar item, pessoa, consumo ou regra de taxa", async () => {
    const mutations: [string, (db: Db, accountId: string, personId: string) => Promise<unknown>][] = [
      ["adicionar item", (db, id) => addItem(db, id, { name: "x", totalCents: 100 })],
      ["adicionar pessoa", (db, id) => addPerson(db, id, { name: "Cris" })],
      ["trocar a regra da taxa", (db, id) => updateAccount(db, id, { feeMode: "proportional" })],
      ["trocar o percentual", (db, id) => updateAccount(db, id, { feePercent: 12 })],
      ["trocar o modo de divisão", (db, id) => updateAccount(db, id, { splitMode: "equal" })],
      ["remover pessoa", (db, _id, personId) => removePerson(db, personId)],
    ];
    for (const [, mutate] of mutations) {
      const db = await createTestDb();
      const { account, ana } = await accountWithDraw(db);
      await mutate(db, account.id, ana.id);
      const after = await getAccount(db, account.id);
      expect(after).toMatchObject({ drawDone: false, remainderCents: 0, remainderPersonId: null });
    }
  });

  it("mas não ao mudar apelido, restaurante ou pagador", async () => {
    const db = await createTestDb();
    const { account, ana } = await accountWithDraw(db);
    await updatePerson(db, ana.id, { nickname: "A" });
    await updateAccount(db, account.id, { restaurant: "Cantina", payerId: ana.id });
    expect(await getAccount(db, account.id)).toMatchObject({
      drawDone: true,
      remainderCents: 1,
      remainderPersonId: ana.id,
    });
  });
});

describe("lista e carregamento", () => {
  it("lista as mais recentes primeiro, com subtotal e pessoas", async () => {
    const db = await createTestDb();
    const old = await createAccount(db, { date: "2026-09-01", restaurant: "Antiga" });
    const recent = await createAccount(db, { date: "2026-10-10", restaurant: "Recente" });
    await addItem(db, recent.id, { name: "A", totalCents: 1000 });
    await addItem(db, recent.id, { name: "B", totalCents: 500 });
    await addPerson(db, recent.id, { name: "Ana" });

    const list = await listAccountSummaries(db);
    expect(list.map((s) => s.account.restaurant)).toEqual(["Recente", "Antiga"]);
    expect(list[0]).toMatchObject({ itemsSubtotalCents: 1500, peopleCount: 1, pendingCount: 0 });
    expect(list[1].account.id).toBe(old.id);
  });

  it("carrega a conta inteira", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const ana = await addPerson(db, account.id, { name: "Ana" });
    const item = await addItem(db, account.id, { name: "Pizza", totalCents: 5000 });
    await setItemParticipants(db, item.id, [ana.id]);

    const detail = await loadAccountDetail(db, account.id);
    expect(detail?.items).toHaveLength(1);
    expect(detail?.people).toHaveLength(1);
    expect(detail?.participations).toEqual([{ itemId: item.id, personIds: [ana.id] }]);
    expect(await loadAccountDetail(db, "nao-existe")).toBeNull();
  });

  it("uma transação com erro desfaz tudo (conta inexistente não deixa item solto)", async () => {
    const db = await createTestDb();
    await addItem(db, "nao-existe", { name: "x", totalCents: 100 }).catch(() => undefined);
    expect(await db.getAllAsync("SELECT id FROM item")).toHaveLength(0);
  });
});
