import { applyRemainder } from "../core";
import {
    AccountError,
    type Db,
    loadAccountDetail,
    saveSplitResult,
} from "../db";
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
export async function FinalizeAccount(
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
        "Escolha ou sorteia quem fica com a diferença de valor.",
      );
    }
    if (!personIds.includes(recipientId)) {
      throw new AccountError(
        "UNKNOWN_PERSON",
        "Quem fica com a diferença precisa ser uma pessoa da conta.",
      );
    }
  }

  const final = applyRemainder(
    shares,
    remainderCents,
    recipientId ?? personIds[0],
  );
  //guardar no banco de dados o resultado
  await saveSplitResult(db, accountId, {
    shares: final.map((s) => ({
      personId: s.personId,
      amountCents: s.adjustmentCents,
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
