import {
  resolveBillTotal,
  resolveServiceFee,
  splitByItems,
  splitEqual,
  sumCents,
  type Cents,
  type PersonShare,
  type PersonTotal,
} from "../core";
import type { AccountDetail } from "../db/detail";

//motivos de erro
export type IncompleteReason =
  | "NO_PEOPLE"
  | "NO_ITEMS"
  | "NO_TOTAL"
  | "UNASSIGNED_ITEMS";

//calculo da conta (no sucesso e na falha)
export type AccountCalculation =
  | {
      status: "ok";
      mode: "equal" | "items";
      subtotalCents: Cents;
      feeCents: Cents;
      totalCents: Cents;
      shares: (PersonTotal | PersonShare)[]; //valor de cada pessoa antes da diferença de centavos
      remainderCents: Cents; //diferença de centavos para distribuir
    }
  | {
      status: "incomplete";
      reason: IncompleteReason;
      itemIds?: string[]; //itens sem ninguém atributos (quando `reason` = UNASSIGNED_ITEMS)
    };

//calcula a divisão de uma conta salva, sem gravar nada
//em vez de lançar erro, devolve `incomplete` com o motivo, para a tela bloquear o fechamento
export function calculateAccount(detail: AccountDetail): AccountCalculation {
  const { account, items, people, participations } = detail;
  const personIds = people.map((p) => p.id);
  if (personIds.length === 0)
    return { status: "incomplete", reason: "NO_PEOPLE" };

  const subtotalCents = sumCents(items.map((i) => i.totalCents));
  const feeCents = resolveServiceFee(subtotalCents, {
    amountCents: account.feeCents,
    percent: account.feePercent,
  });

  if (account.splitMode === "equal") {
    const totalCents = resolveBillTotal({
      items,
      feeCents,
      printedTotalCents: account.printedTotalCents,
    });
    if (totalCents === 0) return { status: "incomplete", reason: "NO_TOTAL" };
    const result = splitEqual(totalCents, personIds);
    return {
      status: "ok",
      mode: "equal",
      subtotalCents,
      feeCents,
      totalCents,
      shares: result.shares,
      remainderCents: result.remainderCents,
    };
  }

  if (items.length === 0) return { status: "incomplete", reason: "NO_ITEMS" };

  const assigned = new Set(
    participations.filter((p) => p.personIds.length > 0).map((p) => p.itemId),
  );
  const unassigned = items.filter((i) => !assigned.has(i.id)).map((i) => i.id);
  if (unassigned.length > 0) {
    return {
      status: "incomplete",
      reason: "UNASSIGNED_ITEMS",
      itemIds: unassigned,
    };
  }

  const result = splitByItems({
    items,
    personIds,
    participations,
    feeCents,
    feeMode: account.feeMode,
  });
  return {
    status: "ok",
    mode: "items",
    subtotalCents: result.subtotalCents,
    feeCents: result.feeCents,
    totalCents: result.totalCents,
    shares: result.shares,
    remainderCents: result.remainderCents,
  };
}
