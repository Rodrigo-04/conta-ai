import { resolveServiceFee } from "./fee";
import { SplitError } from "./errors";

function codeOf(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (e) {
    return e instanceof SplitError ? e.code : "OUTRO_ERRO";
  }
  return undefined;
}

describe("resolveServiceFee", () => {
  it("calcula 10% sobre o subtotal", () => {
    expect(resolveServiceFee(10000, { percent: 10 })).toBe(1000);
  });

  it("arredonda meio centavo para cima", () => {
    // 10% de 123,45 = 12,345 -> 12,35
    expect(resolveServiceFee(12345, { percent: 10 })).toBe(1235);
  });

  it("aceita percentual fracionado", () => {
    expect(resolveServiceFee(10000, { percent: 12.5 })).toBe(1250);
  });

  it("o valor da nota vale mais que o percentual", () => {
    expect(resolveServiceFee(10000, { amountCents: 500, percent: 10 })).toBe(500);
  });

  it("valor 0 remove a taxa, mesmo com percentual informado", () => {
    expect(resolveServiceFee(10000, { amountCents: 0, percent: 10 })).toBe(0);
  });

  it("sem valor nem percentual, a taxa é zero", () => {
    expect(resolveServiceFee(10000, {})).toBe(0);
    expect(resolveServiceFee(10000, { amountCents: null, percent: null })).toBe(0);
  });

  it("rejeita entradas inválidas", () => {
    expect(codeOf(() => resolveServiceFee(10000, { percent: -1 }))).toBe("INVALID_PERCENT");
    expect(codeOf(() => resolveServiceFee(10000, { percent: Number.NaN }))).toBe("INVALID_PERCENT");
    expect(codeOf(() => resolveServiceFee(10000, { amountCents: 10.5 }))).toBe("INVALID_AMOUNT");
    expect(codeOf(() => resolveServiceFee(-5, { percent: 10 }))).toBe("INVALID_AMOUNT");
  });
});
