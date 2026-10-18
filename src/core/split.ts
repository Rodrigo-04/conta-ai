//importações
import { SplitError } from "./errors";
import { assertsCents } from "./money";
import type { Cents, EqualSplitResult } from "./types";

//constantes
const ZERO = BigInt(0);
const ONE = BigInt(1);

//função para MDC (máximo divisor comum)
function gcd(a: bigint, b: bigint): bigint {
  //algoritmo de Euclides
  while (b !== ZERO) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

//função para MMC (mínimo divisor comum)
function lcm(a: bigint, b: bigint): bigint {
  return (a / gcd(a, b)) * b;
}

//validar lista de pessoas
function assertPeople(personIds: readonly string[]): void {
  if (personIds.length === 0) {
    throw new SplitError(
      "NO_PEOPLE",
      "É preciso ao menos uma pessoa na conta.",
    );
  }
  if (new Set(personIds).size !== personIds.length) {
    throw new SplitError("DUPLICATE_PERSON", "Há pessoas repetidas na conta.");
  }
}

//dividir a conta igualmente
export function splitEqual(
  totalCents: Cents,
  personIds: readonly string[],
): EqualSplitResult {
  assertsCents(totalCents, "Total");
  assertPeople(personIds);

  const n = personIds.length;
  const base = Math.floor(totalCents / n);
  return {
    totalCents,
    shares: personIds.map((personId) => ({ personId, totalCents: base })),
    remainderCents: totalCents - base * n,
  };
}
