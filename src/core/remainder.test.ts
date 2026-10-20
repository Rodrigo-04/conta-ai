import { SplitError } from "./errors";
import { applyRemainder, drawRemainderRecipient } from "./remainder";

describe("drawRemainderRecipient", () => {
  const ids = ["a", "b", "c"];

  it("escolhe a pessoa conforme o número sorteado", () => {
    expect(drawRemainderRecipient(ids, () => 0)).toBe("a");
    expect(drawRemainderRecipient(ids, () => 0.34)).toBe("b");
    expect(drawRemainderRecipient(ids, () => 0.99)).toBe("c");
  });

  it("não estoura o índice se o gerador devolver 1", () => {
    expect(drawRemainderRecipient(ids, () => 1)).toBe("c");
  });

  it("usa Math.random por padrão e sempre devolve alguém da lista", () => {
    for (let i = 0; i < 100; i++) {
      expect(ids).toContain(drawRemainderRecipient(ids));
    }
  });

  it("falha sem pessoas", () => {
    expect(() => drawRemainderRecipient([])).toThrow(SplitError);
  });
});

describe("applyRemainder", () => {
  const shares = [
    { personId: "a", totalCents: 3333 },
    { personId: "b", totalCents: 3333 },
    { personId: "c", totalCents: 3333 },
  ];

  it("atribui toda a diferença à pessoa escolhida", () => {
    const r = applyRemainder(shares, 1, "b");
    expect(r.map((s) => s.finalCents)).toEqual([3333, 3334, 3333]);
    expect(r.map((s) => s.adjustmentCents)).toEqual([0, 1, 0]);
  });

  it("a soma final fecha com o total", () => {
    const r = applyRemainder(shares, 1, "c");
    expect(r.reduce((acc, s) => acc + s.finalCents, 0)).toBe(10000);
  });

  it("diferença zero não altera nada", () => {
    const r = applyRemainder(shares, 0, "a");
    expect(r.map((s) => s.finalCents)).toEqual([3333, 3333, 3333]);
  });

  it("mantém os demais campos do objeto original", () => {
    const r = applyRemainder([{ personId: "a", totalCents: 10, extra: "x" }], 2, "a");
    expect(r[0].extra).toBe("x");
    expect(r[0].finalCents).toBe(12);
  });

  it("rejeita pessoa desconhecida e diferença inválida", () => {
    expect(() => applyRemainder(shares, 1, "zzz")).toThrow(SplitError);
    expect(() => applyRemainder(shares, -1, "a")).toThrow(SplitError);
  });
});
