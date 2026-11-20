import { formatPercent, parsePercent } from "./percent";

describe("parsePercent", () => {
  it("aceita inteiros e decimais com vírgula ou ponto", () => {
    expect(parsePercent("10")).toBe(10);
    expect(parsePercent("12,5")).toBe(12.5);
    expect(parsePercent("12.50")).toBe(12.5);
    expect(parsePercent(" 0 ")).toBe(0);
    expect(parsePercent("100")).toBe(100);
  });

  it("recusa vazio, negativo, texto, acima de 100 e casas demais", () => {
    expect(parsePercent("")).toBeNull();
    expect(parsePercent("-5")).toBeNull();
    expect(parsePercent("abc")).toBeNull();
    expect(parsePercent("101")).toBeNull();
    expect(parsePercent("10,123")).toBeNull();
    expect(parsePercent("1,2,3")).toBeNull();
  });
});

describe("formatPercent", () => {
  it("usa vírgula decimal", () => {
    expect(formatPercent(12.5)).toBe("12,5");
    expect(formatPercent(10)).toBe("10");
  });
});
