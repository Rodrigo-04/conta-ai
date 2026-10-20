//importações
import { SplitError } from "./errors";
import { assertCents } from "./money";
import type { Cents, PersonTotal, WithAdjustment } from "./types";

//sorteia uma pessoa para receber a diferença da conta (quando tem resto na divisão)
export function drawRemainderRecipient(
  personIds: readonly string[],
  rng: () => number = Math.random,
): string {
  if (personIds.length === 0) {
    throw new SplitError(
      "NO_PEOPLE",
      "É preciso ao menos uma pessoa para o sorteio.",
    );
  }
  const index = Math.min(
    personIds.length - 1,
    Math.floor(rng() * personIds.length),
  );
  return personIds[index];
}

//atribui diferença ao valor total da pessoa sortiada
export function applyRemainder<T extends PersonTotal>(
  shares: readonly T[],
  remainderCents: Cents,
  recipientId: string,
): WithAdjustment<T>[] {
  assertCents(remainderCents, "Diferença");
  if (!shares.some((s) => s.personId === recipientId)) {
    throw new SplitError(
      "UNKNOWN_PERSON",
      `Pessoa desconhecida: ${recipientId}`,
    );
  }
  return shares.map((share) => {
    const adjustmentCents = share.personId === recipientId ? remainderCents : 0;
    return {
      ...share,
      adjustmentCents,
      finalCents: share.totalCents + adjustmentCents,
    };
  });
}
