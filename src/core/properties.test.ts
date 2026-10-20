import fc from "fast-check";
import { applyRemainder } from "./remainder";
import { splitByItems, splitEqual } from "./split";
import type { Item, Participation } from "./types";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

const scenario = fc.record({
  n: fc.integer({ min: 1, max: 15 }),
  itemTotals: fc.array(fc.integer({ min: 0, max: 100000 }), { minLength: 1, maxLength: 12 }),
  picks: fc.array(fc.array(fc.boolean(), { minLength: 15, maxLength: 15 }), {
    minLength: 12,
    maxLength: 12,
  }),
  feeCents: fc.integer({ min: 0, max: 20000 }),
  proportional: fc.boolean(),
});

interface Scenario {
  n: number;
  itemTotals: number[];
  picks: boolean[][];
  feeCents: number;
  proportional: boolean;
}

function build(s: Scenario) {
  const personIds = Array.from({ length: s.n }, (_, i) => `p${i}`);
  const items: Item[] = s.itemTotals.map((totalCents, i) => ({
    id: `i${i}`,
    name: `item ${i}`,
    quantity: 1,
    totalCents,
  }));
  const participations: Participation[] = items.map((item, i) => {
    const chosen = personIds.filter((_, j) => s.picks[i][j]);
    return { itemId: item.id, personIds: chosen.length > 0 ? chosen : [personIds[i % s.n]] };
  });
  return {
    items,
    personIds,
    participations,
    feeCents: s.feeCents,
    feeMode: s.proportional ? ("proportional" as const) : ("equal" as const),
  };
}

describe("propriedades gerais", () => {
  it("modo 2: a soma das pessoas + diferença sempre é igual ao total", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const input = build(s);
        const r = splitByItems(input);
        const n = input.personIds.length;

        expect(r.totalCents).toBe(sum(input.items.map((i) => i.totalCents)) + input.feeCents);
        expect(sum(r.shares.map((x) => x.totalCents)) + r.remainderCents).toBe(r.totalCents);
        expect(r.remainderCents).toBeGreaterThanOrEqual(0);
        expect(r.remainderCents).toBeLessThan(n);
        for (const share of r.shares) {
          expect(share.totalCents).toBeGreaterThanOrEqual(0);
          expect(share.itemsCents + share.feeCents).toBe(share.totalCents);
          expect(share.feeCents).toBeGreaterThanOrEqual(0);
        }
        expect(sum(r.shares.map((x) => x.itemsCents))).toBeLessThanOrEqual(r.subtotalCents);
      }),
      { numRuns: 500 },
    );
  });

  it("modo 2: com a diferença aplicada, os valores finais fecham exatamente no total", () => {
    fc.assert(
      fc.property(scenario, fc.nat(), (s, pick) => {
        const input = build(s);
        const r = splitByItems(input);
        const recipient = input.personIds[pick % input.personIds.length];
        const final = applyRemainder(r.shares, r.remainderCents, recipient);
        expect(sum(final.map((x) => x.finalCents))).toBe(r.totalCents);
      }),
      { numRuns: 300 },
    );
  });

  it("taxa proporcional: quem não participa de nenhum item com valor não paga nada", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const input = { ...build(s), feeMode: "proportional" as const };
        const r = splitByItems(input);
        if (r.subtotalCents === 0) return;

        const valued = new Set(input.items.filter((i) => i.totalCents > 0).map((i) => i.id));
        const consumers = new Set(
          input.participations.filter((p) => valued.has(p.itemId)).flatMap((p) => [...p.personIds]),
        );
        for (const share of r.shares) {
          if (!consumers.has(share.personId)) expect(share.totalCents).toBe(0);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("modo 2: o resultado é determinístico", () => {
    fc.assert(
      fc.property(scenario, (s) => {
        const input = build(s);
        expect(splitByItems(input)).toEqual(splitByItems(input));
      }),
      { numRuns: 100 },
    );
  });

  it("modo 1: soma + sobra = total, e todos pagam o mesmo", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000_000 }),
        fc.integer({ min: 1, max: 30 }),
        (total, n) => {
          const ids = Array.from({ length: n }, (_, i) => `p${i}`);
          const r = splitEqual(total, ids);
          expect(sum(r.shares.map((x) => x.totalCents)) + r.remainderCents).toBe(total);
          expect(r.remainderCents).toBeGreaterThanOrEqual(0);
          expect(r.remainderCents).toBeLessThan(n);
          expect(new Set(r.shares.map((x) => x.totalCents)).size).toBe(1);
        },
      ),
      { numRuns: 500 },
    );
  });
});
