//importação
import { assertCents, sumCents } from "./money";
import type { Cents, Item } from "./types";

//estrutura do resultado da conferência
export interface ReceiptCheck {
  subtotalCents: Cents;
  feeCents: Cents;
  expectedTotalCents: Cents; //subtotal itens + taxa
  printedTotalCents: Cents; //total esperado (valor da nota)
  differenceCents: number;
  matches: boolean;
}

//confere se a conta fecha (valor de soma + taxa bate com o da nota)
export function reconcileReceipt(input: {
  items: readonly Item[];
  feeCents: Cents;
  printedTotalCents: Cents;
}): ReceiptCheck {
  const { items, feeCents, printedTotalCents } = input;
  assertCents(feeCents, "Taxa de serviço");
  assertCents(printedTotalCents, "Total da nota");

  const subtotalCents = sumCents(items.map((i) => i.totalCents));
  const expectedTotalCents = subtotalCents + feeCents;
  const differenceCents = printedTotalCents - expectedTotalCents;

  return {
    subtotalCents,
    feeCents,
    expectedTotalCents,
    printedTotalCents,
    differenceCents,
    matches: differenceCents === 0,
  };
}

//define o total usado na divisão
export function resolveBillTotal(input: {
  items: readonly Item[];
  feeCents: Cents;
  printedTotalCents?: Cents | null;
}): Cents {
  if (
    input.printedTotalCents !== undefined &&
    input.printedTotalCents !== null
  ) {
    assertCents(input.printedTotalCents, "Total da nota");
    return input.printedTotalCents;
  }
  assertCents(input.feeCents, "Taxa de serviço");
  return sumCents(input.items.map((i) => i.totalCents)) + input.feeCents;
}
