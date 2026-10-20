//importações
import { SplitError } from "./errors";
import { assertsCents, sumCents } from "./money";
import type {
    Cents,
    EqualSplitResult,
    FeeMode,
    Item,
    ItemSplitResult,
    Participation,
    PersonShare,
} from "./types";

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

//dividir conta por consumo
export interface SplitByItemsInput {
  items: readonly Item[];
  personIds: readonly string[];
  participations: readonly Participation[];
  feeCents: Cents; //taxa de serviço já em centavos
  feeMode: FeeMode; //igual ou proporcional
}

//dividir a conta por itens
export function splitByItems(input: SplitByItemsInput): ItemSplitResult {
  //extrair e validar dados
  const { items, personIds, participations, feeCents, feeMode } = input;

  assertPeople(personIds);
  assertsCents(feeCents, "Taxa de serviço");
  items.forEach((item) =>
    assertsCents(item.totalCents, `Valor do item ${item.name}`),
  );

  //estrutura ára localizar pessoas e itens
  const personIndex = new Map(personIds.map((id, index) => [id, index]));
  const itemIds = new Set(items.map((item) => item.id));

  //juntar participações por itens
  const participantsByItem = new Map<string, Set<string>>();
  for (const p of participations) {
    if (!itemIds.has(p.itemId)) {
      throw new SplitError("UNKNOWN_ITEM", `Item desconhecido: ${p.itemId}`);
    }
    const set = participantsByItem.get(p.itemId) ?? new Set<string>();
    for (const personId of p.personIds) {
      if (!personIndex.has(personId)) {
        throw new SplitError(
          "UNKNOWN_PERSON",
          `Pessoas desconhecida: ${personId}`,
        );
      }
      set.add(personId);
    }
    participantsByItem.set(p.itemId, set);
  }

  //verificar itens sem participantes
  const unassigned = items
    .filter((item) => (participantsByItem.get(item.id)?.size ?? 0) === 0)
    .map((item) => item.id);
  if (unassigned.length > 0) {
    throw new SplitError(
      "UNASSIGNED_ITEMS",
      "Há itens sem ninguém atribuído.",
      {
        itemIds: unassigned,
      },
    );
  }

  //denominador comum para as frações
  let L = ONE;
  for (const set of participantsByItem.values()) {
    L = lcm(L, BigInt(set.size));
  }

  //consumo exato de cada pessoa
  const consumption: bigint[] = personIds.map(() => ZERO);
  for (const item of items) {
    const group = participantsByItem.get(item.id)!;
    const unit = BigInt(item.totalCents) * (L / BigInt(group.size));
    for (const personId of group) {
      consumption[personIndex.get(personId)!] += unit;
    }
  }

  //calcular subtotal e total
  const subtotalCents = sumCents(items.map((item) => item.totalCents));
  const totalCents = subtotalCents + feeCents;

  const S = BigInt(subtotalCents);
  const F = BigInt(feeCents);
  const N = BigInt(personIds.length);

  //determinar como a taxa será dividida
  const proportional = feeMode === "proportional" && subtotalCents > 0;
  const denominator = proportional ? L * S : L * N;

  //calcular a valor de cada pessoa
  const shares: PersonShare[] = personIds.map((personId, index) => {
    const exactConsumption = consumption[index];
    const numerator = proportional
      ? exactConsumption * (S + N)
      : exactConsumption * N + F * L;

    const total = Number(numerator / denominator);
    const itemsCents = Number(exactConsumption / L);
    return {
      personId,
      itemsCents,
      feeCents: total - itemsCents,
      totalCents: total,
    };
  });

  //devolver resultado
  return {
    subtotalCents,
    feeCents,
    totalCents,
    shares,
    remainderCents: totalCents - sumCents(shares.map((s) => s.totalCents)),
  };
}
