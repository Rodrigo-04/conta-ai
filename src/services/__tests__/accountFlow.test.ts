/** @jest-environment node */
import { drawRemainderRecipient } from "../../core";
import {
  addItem,
  addPerson,
  createAccount,
  getAccount,
  listAccountSummaries,
  listInstallments,
  loadAccountDetail,
  removePerson,
  setInstallmentStatus,
  setItemParticipants,
  updateAccount,
  updateItem,
  AccountError,
  type Db,
} from "../../db";
import { createTestDb } from "../../db/testing/testDb";
import { calculateAccount } from "../calculateAccount";
import { finalizeAccount } from "../finalizeAccount";

async function codeOf(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (e) {
    return e instanceof AccountError ? e.code : "OUTRO_ERRO";
  }
  return undefined;
}

/** Pizza R$ 60 (todos), cerveja R$ 10 (Ana), suco R$ 5 (Bia). Taxa 10%. */
async function threeFriends(db: Db) {
  const account = await createAccount(db, { feePercent: 10, feeMode: "proportional" });
  const ana = await addPerson(db, account.id, { name: "Ana" });
  const bia = await addPerson(db, account.id, { name: "Bia" });
  const cris = await addPerson(db, account.id, { name: "Cris" });
  const pizza = await addItem(db, account.id, { name: "Pizza", totalCents: 6000 });
  const cerveja = await addItem(db, account.id, { name: "Cerveja", totalCents: 1000 });
  const suco = await addItem(db, account.id, { name: "Suco", totalCents: 500 });
  await setItemParticipants(db, pizza.id, [ana.id, bia.id, cris.id]);
  await setItemParticipants(db, cerveja.id, [ana.id]);
  await setItemParticipants(db, suco.id, [bia.id]);
  await updateAccount(db, account.id, { payerId: ana.id });
  return { account, ana, bia, cris, pizza, cerveja, suco };
}

describe("calculateAccount", () => {
  it("calcula por itens com a taxa vinda do percentual", async () => {
    const db = await createTestDb();
    const { account } = await threeFriends(db);
    const calc = calculateAccount((await loadAccountDetail(db, account.id))!);
    expect(calc).toMatchObject({
      status: "ok",
      mode: "items",
      subtotalCents: 7500,
      feeCents: 750,
      totalCents: 8250,
      remainderCents: 0,
    });
    if (calc.status === "ok") expect(calc.shares.map((s) => s.totalCents)).toEqual([3300, 2750, 2200]);
  });

  it("o valor da taxa lido da nota vale mais que o percentual", async () => {
    const db = await createTestDb();
    const { account } = await threeFriends(db);
    await updateAccount(db, account.id, { feeCents: 300 });
    const calc = calculateAccount((await loadAccountDetail(db, account.id))!);
    expect(calc).toMatchObject({ status: "ok", feeCents: 300, totalCents: 7800 });
  });

  it("divisão igual usa o total impresso na nota", async () => {
    const db = await createTestDb();
    const account = await createAccount(db, { splitMode: "equal", printedTotalCents: 10000 });
    for (const name of ["A", "B", "C"]) await addPerson(db, account.id, { name });
    const calc = calculateAccount((await loadAccountDetail(db, account.id))!);
    expect(calc).toMatchObject({ status: "ok", mode: "equal", totalCents: 10000, remainderCents: 1 });
    if (calc.status === "ok") expect(calc.shares.map((s) => s.totalCents)).toEqual([3333, 3333, 3333]);
  });

  it("divisão igual sem total impresso usa itens + taxa", async () => {
    const db = await createTestDb();
    const account = await createAccount(db, { splitMode: "equal" });
    await addPerson(db, account.id, { name: "A" });
    await addPerson(db, account.id, { name: "B" });
    await addItem(db, account.id, { name: "Tudo", totalCents: 10000 });
    const calc = calculateAccount((await loadAccountDetail(db, account.id))!);
    expect(calc).toMatchObject({ status: "ok", totalCents: 11000 });
  });

  it("avisa o motivo quando a conta ainda não está pronta", async () => {
    const db = await createTestDb();
    const account = await createAccount(db);
    const load = async () => calculateAccount((await loadAccountDetail(db, account.id))!);

    expect(await load()).toEqual({ status: "incomplete", reason: "NO_PEOPLE" });
    const ana = await addPerson(db, account.id, { name: "Ana" });
    expect(await load()).toEqual({ status: "incomplete", reason: "NO_ITEMS" });

    const item = await addItem(db, account.id, { name: "Pizza", totalCents: 5000 });
    expect(await load()).toEqual({ status: "incomplete", reason: "UNASSIGNED_ITEMS", itemIds: [item.id] });

    await setItemParticipants(db, item.id, [ana.id]);
    expect((await load()).status).toBe("ok");

    await updateAccount(db, account.id, { splitMode: "equal", feeCents: 0 });
    await setItemParticipants(db, item.id, []);
    const empty = await createAccount(db, { splitMode: "equal" });
    await addPerson(db, empty.id, { name: "X" });
    expect(calculateAccount((await loadAccountDetail(db, empty.id))!)).toEqual({
      status: "incomplete",
      reason: "NO_TOTAL",
    });
  });
});

describe("finalizeAccount", () => {
  it("grava as cobranças: o pagador já consta como pago e os outros como pendentes", async () => {
    const db = await createTestDb();
    const { account, ana, bia, cris } = await threeFriends(db);

    const final = await finalizeAccount(db, account.id);
    expect(final.map((s) => s.finalCents)).toEqual([3300, 2750, 2200]);

    const installments = await listInstallments(db, account.id);
    expect(installments.map((i) => [i.personId, i.amountCents, i.status])).toEqual([
      [ana.id, 3300, "paid"],
      [bia.id, 2750, "pending"],
      [cris.id, 2200, "pending"],
    ]);
    expect(installments[0].paidAt).not.toBeNull();
    expect(installments[1].paidAt).toBeNull();

    const [summary] = await listAccountSummaries(db);
    expect(summary).toMatchObject({ pendingCount: 2, pendingCents: 4950, peopleCount: 3 });
  });

  it("exige escolher quem fica com a diferença e depois grava o escolhido", async () => {
    const db = await createTestDb();
    const account = await createAccount(db, { splitMode: "equal", printedTotalCents: 10000 });
    const people = [];
    for (const name of ["A", "B", "C"]) people.push(await addPerson(db, account.id, { name }));
    await updateAccount(db, account.id, { payerId: people[0].id });

    expect(await codeOf(finalizeAccount(db, account.id))).toBe("RECIPIENT_REQUIRED");
    expect(await codeOf(finalizeAccount(db, account.id, { recipientId: "estranho" }))).toBe("UNKNOWN_PERSON");

    const recipient = drawRemainderRecipient(people.map((p) => p.id), () => 0.5); // sorteia a pessoa B
    const final = await finalizeAccount(db, account.id, { recipientId: recipient });

    expect(final.reduce((acc, s) => acc + s.finalCents, 0)).toBe(10000);
    expect(final.find((s) => s.personId === recipient)).toMatchObject({ adjustmentCents: 1, finalCents: 3334 });
    expect(await getAccount(db, account.id)).toMatchObject({
      remainderCents: 1,
      remainderPersonId: recipient,
      drawDone: true,
    });
  });

  it("reabrir e fechar de novo reaproveita o sorteio gravado, sem sortear outra vez", async () => {
    const db = await createTestDb();
    const account = await createAccount(db, { splitMode: "equal", printedTotalCents: 10000 });
    const people = [];
    for (const name of ["A", "B", "C"]) people.push(await addPerson(db, account.id, { name }));
    await updateAccount(db, account.id, { payerId: people[0].id });

    await finalizeAccount(db, account.id, { recipientId: people[2].id });
    const again = await finalizeAccount(db, account.id); // sem recipientId
    expect(again.find((s) => s.adjustmentCents === 1)?.personId).toBe(people[2].id);
  });

  it("não fecha sem pagador nem com a conta incompleta", async () => {
    const db = await createTestDb();
    const { account } = await threeFriends(db);
    await updateAccount(db, account.id, { payerId: null });
    expect(await codeOf(finalizeAccount(db, account.id))).toBe("NO_PAYER");

    const empty = await createAccount(db);
    expect(await codeOf(finalizeAccount(db, empty.id))).toBe("INCOMPLETE");
    expect(await codeOf(finalizeAccount(db, "nao-existe"))).toBe("NOT_FOUND");
  });

  it("marcar como pago e pendente atualiza a data e a lista da tela inicial", async () => {
    const db = await createTestDb();
    const { account, bia } = await threeFriends(db);
    await finalizeAccount(db, account.id);

    const biaInstallment = (await listInstallments(db, account.id)).find((i) => i.personId === bia.id)!;
    const paid = await setInstallmentStatus(db, biaInstallment.id, "paid");
    expect(paid.status).toBe("paid");
    expect(paid.paidAt).not.toBeNull();
    expect((await listAccountSummaries(db))[0].pendingCount).toBe(1);

    const back = await setInstallmentStatus(db, biaInstallment.id, "pending");
    expect(back).toMatchObject({ status: "pending", paidAt: null });
  });

  it("ao fechar de novo, quem já pagou continua pago e o valor é atualizado", async () => {
    const db = await createTestDb();
    const { account, bia, suco } = await threeFriends(db);
    await finalizeAccount(db, account.id);
    const before = (await listInstallments(db, account.id)).find((i) => i.personId === bia.id)!;
    await setInstallmentStatus(db, before.id, "paid");

    // Bia consome pizza (R$ 20 de sua parte) e suco: corrigir o suco de R$ 5 para R$ 15 muda o valor dela.
    await updateItem(db, suco.id, { totalCents: 1500 });
    await finalizeAccount(db, account.id);

    const after = (await listInstallments(db, account.id)).find((i) => i.personId === bia.id)!;
    expect(before.amountCents).toBe(2750);
    expect(after.id).toBe(before.id);
    expect(after.status).toBe("paid");
    expect(after.amountCents).toBe(3850); // (2000 + 1500) + 10% de taxa proporcional
  });

  it("quem sai da divisão perde a cobrança", async () => {
    const db = await createTestDb();
    const { account, cris, pizza, ana, bia } = await threeFriends(db);
    await finalizeAccount(db, account.id);
    await removePerson(db, cris.id);
    await setItemParticipants(db, pizza.id, [ana.id, bia.id]);
    await finalizeAccount(db, account.id);

    const installments = await listInstallments(db, account.id);
    expect(installments.map((i) => i.personId)).toEqual([ana.id, bia.id]);
    expect(installments.reduce((acc, i) => acc + i.amountCents, 0)).toBe(8250);
  });
});
