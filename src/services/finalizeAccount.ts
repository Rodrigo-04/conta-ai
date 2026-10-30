import { applyRemainder } from "../core";
import type { Db } from "../db/db";
import { loadAccountDetail } from "../db/detail";
import { AccountError } from "../db/errors";
import { saveSplitResult } from "../db/installments";
import { calculateAccount } from "./calculateAccount";

//quem recebe a diferença dos centavos
export interface FinalizeOptions {
  recipientId?: string | null;
}

//resulta final para cada pessoa
export interface FinalizedShare {
  personId: string;
  baseCents: number; //valor antes da diferença de centavos
  finalCents: number; //quanto a pessoa vai pagar (final)
}

//fecha a conta com os cálculos aplicados
export async function finalizeAccount(
  db: Db,
  accountId: string,
  options: FinalizeOptions = {},
): Promise<FinalizedShare[]> {
  const detail = await loadAccountDetail(db, accountId);
  if (!detail) throw new AccountError("NOT_FOUND", "Conta não encontrada.");

  const calculation = calculateAccount(detail);
  if (calculation.status !== "ok") {
    throw new AccountError(
      "INCOMPLETE",
      "A conta ainda não está pronta para fechar.",
      calculation,
    );
  }
  if (!detail.account.payerId) {
    throw new AccountError("NO_PAYER", "Escolha quem pagou a conta.");
  }

  const personIds = detail.people.map((p) => p.id);
  const { remainderCents, shares } = calculation;

  let recipientId: string | null = null;
  if (remainderCents > 0) {
    recipientId =
      options.recipientId ??
      (detail.account.drawDone ? detail.account.remainderPersonId : null);
    if (!recipientId) {
      throw new AccountError(
        "RECIPIENT_REQUIRED",
        "Escolha ou sorteie quem fica com a diferença.",
      );
    }
    if (!personIds.includes(recipientId)) {
      throw new AccountError(
        "UNKNOWN_PERSON",
        "Quem fica com a diferença precisa ser da conta.",
      );
    }
  }

  const final = applyRemainder(
    shares,
    remainderCents,
    recipientId ?? personIds[0],
  );
  await saveSplitResult(db, accountId, {
    shares: final.map((s) => ({
      personId: s.personId,
      amountCents: s.finalCents,
    })),
    remainder: { cents: remainderCents, personId: recipientId },
  });

  return final.map((s) => ({
    personId: s.personId,
    baseCents: s.totalCents,
    adjustmentCents: s.adjustmentCents,
    finalCents: s.finalCents,
  }));
}
