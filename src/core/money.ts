//importações
import { SplitError } from "./errors";
import type { Cents } from "./types";

//função para validar valor
export function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new SplitError(
      "INVALID_AMOUNT",
      `${label} deve ser um inteiro não negativo em centavos (recebido: ${value})`,
    );
  }
}

//soma valores em centavos
export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => acc + v, 0);
}
/** acc - acumulador, guarda soma parcial
 * v - valor atual do array
 * acc + v - soma o valor atual ao acumulador
 * 0 - valor inicial do acumulador **/
