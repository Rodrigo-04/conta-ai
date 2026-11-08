import { formatQuantity, parseQuantity } from "./quantity";

describe("parseQuantity", () => {
  it("aceita inteiros e decimais com vírgula ou ponto", () => {
    expect(parseQuantity("1")).toBe(1);
    expect(parseQuantity("12")).toBe(12);
    expect(parseQuantity("0,45")).toBe(0.45);
    expect(parseQuantity("0.45")).toBe(0.45);
    expect(parseQuantity(" 1,250 ")).toBe(1.25);
  });

  it("recusa vazio, zero, negativo, texto e casas demais", () => {
    expect(parseQuantity("")).toBeNull();
    expect(parseQuantity("0")).toBeNull();
    expect(parseQuantity("0,000")).toBeNull();
    expect(parseQuantity("-1")).toBeNull();
    expect(parseQuantity("abc")).toBeNull();
    expect(parseQuantity("1,2345")).toBeNull();
    expect(parseQuantity("1,2,3")).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("usa vírgula decimal", () => {
    expect(formatQuantity(0.45)).toBe("0,45");
    expect(formatQuantity(2)).toBe("2");
    expect(formatQuantity(1.25)).toBe("1,25");
  });
});
