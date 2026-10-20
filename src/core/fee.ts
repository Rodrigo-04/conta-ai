//Calcular ou determinar o valor da taxa de serviço de uma conta

//importações
import { SplitError } from "./errors";
import { assertCents } from "./money";
import type { Cents } from "./types";

//definir um percentual padrão para o serviço (10%)
export const DEFAULT_SERVICE_PERCENT = 10;

//definir valor de serviço pela nota fiscal
export interface FeeInput {
  amountCents?: Cents | null; //valor da taxa lido na nota
  percent?: number | null; //usado quando a nota não traz o valor
}

//função para taxa de serviço
export function resolveServiceFee(subtotalCents: Cents, fee: FeeInput): Cents {
  assertCents(subtotalCents, "Subtotal"); //validar subtotal

  //valida se é um valor explícito
  if (fee.amountCents !== undefined && fee.amountCents !== null) {
    assertCents(fee.amountCents, "Taxa de serviço");
    return fee.amountCents;
  }

  //calcular taxa pelo percentual
  if (fee.percent !== undefined && fee.percent !== null) {
    if (!Number.isFinite(fee.percent) || fee.percent < 0) {
      throw new SplitError(
        "INVALID_PERCENT",
        `Percentual inválido: ${fee.percent}`,
      );
    }
    //faz a aritmética inteira, utilizando pontos-base (1% = 100), evita erro do float
    const basisPoints = Math.round(fee.percent * 100);
    return Math.floor((subtotalCents * basisPoints + 5000) / 10000);
  }
  //em último caso não traz taxa de serviço
  return 0;
}
