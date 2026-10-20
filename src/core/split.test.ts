import { SplitError } from "./errors";
import { splitByItems, splitEqual } from "./split";
import type { Item, Participation } from "./types";

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof SplitError ? e.code : "OUTRO_ERRO";
  }
  return undefined;
}

const item = (id: string, totalCents: number, quantity = 1): Item => ({
  id,
  name: id,
  quantity,
  totalCents,
});

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("splitEqual (modo 1)", () => {
  it("R$ 100,00 ÷ 3 sobra 1 centavo", () => {
    const r = splitEqual(10000, ["a", "b", "c"]);
    expect(r.shares.map((s) => s.totalCents)).toEqual([3333, 3333, 3333]);
    expect(r.remainderCents).toBe(1);
  });

  it("divisão exata não deixa sobra", () => {
    const r = splitEqual(9000, ["a", "b", "c"]);
    expect(r.shares.map((s) => s.totalCents)).toEqual([3000, 3000, 3000]);
    expect(r.remainderCents).toBe(0);
  });

  it("uma pessoa paga tudo", () => {
    const r = splitEqual(12345, ["a"]);
    expect(r.shares[0].totalCents).toBe(12345);
    expect(r.remainderCents).toBe(0);
  });

  it("15 pessoas: sobra entre 0 e 14", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
    const r = splitEqual(10000, ids);
    expect(r.shares[0].totalCents).toBe(666);
    expect(r.remainderCents).toBe(10);
    expect(sum(r.shares.map((s) => s.totalCents)) + r.remainderCents).toBe(10000);
  });

  it("total zero", () => {
    const r = splitEqual(0, ["a", "b"]);
    expect(r.shares.map((s) => s.totalCents)).toEqual([0, 0]);
    expect(r.remainderCents).toBe(0);
  });

  it("rejeita entradas inválidas", () => {
    expect(codeOf(() => splitEqual(1000, []))).toBe("NO_PEOPLE");
    expect(codeOf(() => splitEqual(1000, ["a", "a"]))).toBe("DUPLICATE_PERSON");
    expect(codeOf(() => splitEqual(10.5, ["a"]))).toBe("INVALID_AMOUNT");
    expect(codeOf(() => splitEqual(-1, ["a"]))).toBe("INVALID_AMOUNT");
  });
});

describe("splitByItems (modo 2)", () => {
  const people = ["ana", "bia", "cris"];
  const items = [item("pizza", 6000), item("cerveja", 1000), item("suco", 500)];
  const participations: Participation[] = [
    { itemId: "pizza", personIds: ["ana", "bia", "cris"] },
    { itemId: "cerveja", personIds: ["ana"] },
    { itemId: "suco", personIds: ["bia"] },
  ];

  it("taxa igual: cada um paga 1/3 da taxa", () => {
    const r = splitByItems({
      items,
      personIds: people,
      participations,
      feeCents: 750,
      feeMode: "equal",
    });
    expect(r.subtotalCents).toBe(7500);
    expect(r.totalCents).toBe(8250);
    expect(r.shares.map((s) => s.totalCents)).toEqual([3250, 2750, 2250]);
    expect(r.shares.map((s) => s.feeCents)).toEqual([250, 250, 250]);
    expect(r.remainderCents).toBe(0);
  });

  it("taxa proporcional ao consumo", () => {
    const r = splitByItems({
      items,
      personIds: people,
      participations,
      feeCents: 750,
      feeMode: "proportional",
    });
    expect(r.shares.map((s) => s.itemsCents)).toEqual([3000, 2500, 2000]);
    expect(r.shares.map((s) => s.feeCents)).toEqual([300, 250, 200]);
    expect(r.shares.map((s) => s.totalCents)).toEqual([3300, 2750, 2200]);
    expect(r.remainderCents).toBe(0);
  });

  it("item compartilhado por 2 e por 3 (com sobra de 1 centavo)", () => {
    const r = splitByItems({
      items: [item("i1", 100), item("i2", 100)],
      personIds: ["a", "b", "c"],
      participations: [
        { itemId: "i1", personIds: ["a", "b"] },
        { itemId: "i2", personIds: ["a", "b", "c"] },
      ],
      feeCents: 0,
      feeMode: "equal",
    });
    expect(r.shares.map((s) => s.totalCents)).toEqual([83, 83, 33]);
    expect(r.remainderCents).toBe(1);
  });

  it("item compartilhado por 7: sobra menor que 7", () => {
    const ids = ["a", "b", "c", "d", "e", "f", "g"];
    const r = splitByItems({
      items: [item("porcao", 1000)],
      personIds: ids,
      participations: [{ itemId: "porcao", personIds: ids }],
      feeCents: 0,
      feeMode: "equal",
    });
    expect(r.shares.every((s) => s.totalCents === 142)).toBe(true);
    expect(r.remainderCents).toBe(6);
  });

  it("muitos itens compartilhados não acumulam sobra além de N-1", () => {
    // 10 itens de R$ 0,10 divididos entre 3: exato = 0,333.. cada; total R$ 1,00.
    const its = Array.from({ length: 10 }, (_, i) => item(`i${i}`, 10));
    const r = splitByItems({
      items: its,
      personIds: ["a", "b", "c"],
      participations: its.map((i) => ({ itemId: i.id, personIds: ["a", "b", "c"] })),
      feeCents: 0,
      feeMode: "equal",
    });
    expect(r.shares.map((s) => s.totalCents)).toEqual([33, 33, 33]);
    expect(r.remainderCents).toBe(1);
  });

  it("pessoa sem consumo: paga parte da taxa igual, mas nada na proporcional", () => {
    const base = {
      items: [item("prato", 1000)],
      personIds: ["a", "b"],
      participations: [{ itemId: "prato", personIds: ["a"] }],
      feeCents: 100,
    };
    const igual = splitByItems({ ...base, feeMode: "equal" });
    expect(igual.shares.map((s) => s.totalCents)).toEqual([1050, 50]);

    const prop = splitByItems({ ...base, feeMode: "proportional" });
    expect(prop.shares.map((s) => s.totalCents)).toEqual([1100, 0]);
  });

  it("taxa proporcional com subtotal zero cai para divisão igual", () => {
    const r = splitByItems({
      items: [item("cortesia", 0)],
      personIds: ["a", "b", "c"],
      participations: [{ itemId: "cortesia", personIds: ["a"] }],
      feeCents: 90,
      feeMode: "proportional",
    });
    expect(r.shares.map((s) => s.totalCents)).toEqual([30, 30, 30]);
  });

  it("quantidade fracionada não interfere: vale o valor da linha", () => {
    const r = splitByItems({
      items: [item("self-service", 1890, 0.45)],
      personIds: ["a", "b"],
      participations: [{ itemId: "self-service", personIds: ["a", "b"] }],
      feeCents: 0,
      feeMode: "equal",
    });
    expect(r.shares.map((s) => s.totalCents)).toEqual([945, 945]);
  });

  it("uma pessoa só paga tudo", () => {
    const r = splitByItems({
      items: [item("x", 3333)],
      personIds: ["a"],
      participations: [{ itemId: "x", personIds: ["a"] }],
      feeCents: 333,
      feeMode: "proportional",
    });
    expect(r.shares[0].totalCents).toBe(3666);
    expect(r.remainderCents).toBe(0);
  });

  it("15 pessoas dividindo tudo", () => {
    const ids = Array.from({ length: 15 }, (_, i) => `p${i}`);
    const r = splitByItems({
      items: [item("rodizio", 100000)],
      personIds: ids,
      participations: [{ itemId: "rodizio", personIds: ids }],
      feeCents: 10000,
      feeMode: "equal",
    });
    expect(sum(r.shares.map((s) => s.totalCents)) + r.remainderCents).toBe(110000);
    expect(r.remainderCents).toBeLessThan(15);
  });

  it("junta participações repetidas do mesmo item sem duplicar pessoas", () => {
    const r = splitByItems({
      items: [item("x", 1000)],
      personIds: ["a", "b"],
      participations: [
        { itemId: "x", personIds: ["a", "a"] },
        { itemId: "x", personIds: ["b"] },
      ],
      feeCents: 0,
      feeMode: "equal",
    });
    expect(r.shares.map((s) => s.totalCents)).toEqual([500, 500]);
  });

  it("é determinístico: mesmos dados, mesmo resultado", () => {
    const input = {
      items,
      personIds: people,
      participations,
      feeCents: 751,
      feeMode: "proportional" as const,
    };
    expect(splitByItems(input)).toEqual(splitByItems(input));
  });

  it("rejeita item sem dono, informando quais", () => {
    try {
      splitByItems({
        items: [item("a", 100), item("b", 200)],
        personIds: ["x"],
        participations: [{ itemId: "a", personIds: ["x"] }],
        feeCents: 0,
        feeMode: "equal",
      });
      throw new Error("deveria ter falhado");
    } catch (e) {
      expect(e).toBeInstanceOf(SplitError);
      expect((e as SplitError).code).toBe("UNASSIGNED_ITEMS");
      expect((e as SplitError).details).toEqual({ itemIds: ["b"] });
    }
  });

  it("rejeita pessoa ou item desconhecido e entradas inválidas", () => {
    const base = {
      items: [item("a", 100)],
      personIds: ["x"],
      participations: [{ itemId: "a", personIds: ["x"] }],
      feeCents: 0,
      feeMode: "equal" as const,
    };
    expect(
      codeOf(() => splitByItems({ ...base, participations: [{ itemId: "a", personIds: ["zzz"] }] })),
    ).toBe("UNKNOWN_PERSON");
    expect(
      codeOf(() => splitByItems({ ...base, participations: [{ itemId: "nao-existe", personIds: ["x"] }] })),
    ).toBe("UNKNOWN_ITEM");
    expect(codeOf(() => splitByItems({ ...base, personIds: [] }))).toBe("NO_PEOPLE");
    expect(codeOf(() => splitByItems({ ...base, feeCents: -1 }))).toBe("INVALID_AMOUNT");
    expect(codeOf(() => splitByItems({ ...base, items: [item("a", 10.5)] }))).toBe("INVALID_AMOUNT");
  });
});
