import {
  centsToInputText,
  digitsToCents,
  formatCents,
  formatCentsPlain,
  MAX_MONEY_DIGITS,
} from "./money";

const NBSP = "\u00A0";

describe("formatCents", () => {
  it("formata em reais com vírgula e separador de milhar", () => {
    expect(formatCents(0)).toBe(`R$${NBSP}0,00`);
    expect(formatCents(5)).toBe(`R$${NBSP}0,05`);
    expect(formatCents(1250)).toBe(`R$${NBSP}12,50`);
    expect(formatCents(100000)).toBe(`R$${NBSP}1.000,00`);
    expect(formatCents(123456789)).toBe(`R$${NBSP}1.234.567,89`);
  });

  it("valores negativos", () => {
    expect(formatCents(-1250)).toBe(`-R$${NBSP}12,50`);
    expect(formatCentsPlain(-5)).toBe("-0,05");
  });

  it("ignora centavos quebrados por segurança", () => {
    expect(formatCentsPlain(1250.7)).toBe("12,50");
  });
});

describe("digitação do valor (a vírgula entra sozinha)", () => {
  /** Simula o que o campo faz: o texto atual + a tecla digitada. */
  const type = (cents: number, key: string) => digitsToCents(centsToInputText(cents) + key);
  /** Simula o apagar: tira o último caractere do texto atual. */
  const backspace = (cents: number) => digitsToCents(centsToInputText(cents).slice(0, -1));

  it("1, 0, 0, 0 vira 0,01 → 0,10 → 1,00 → 10,00", () => {
    let cents = 0;
    const steps: string[] = [];
    for (const key of ["1", "0", "0", "0"]) {
      cents = type(cents, key);
      steps.push(formatCentsPlain(cents));
    }
    expect(steps).toEqual(["0,01", "0,10", "1,00", "10,00"]);
  });

  it("apagar desfaz o último dígito", () => {
    let cents = 1000; // 10,00
    const steps: string[] = [];
    for (let i = 0; i < 4; i++) {
      cents = backspace(cents);
      steps.push(centsToInputText(cents));
    }
    expect(steps).toEqual(["1,00", "0,10", "0,01", ""]);
  });

  it("digitar no meio de um valor existente segue a mesma regra", () => {
    expect(type(1050, "5")).toBe(10505); // 10,50 -> 105,05
  });

  it("campo zerado mostra vazio (placeholder) e o zero sozinho não muda nada", () => {
    expect(centsToInputText(0)).toBe("");
    expect(type(0, "0")).toBe(0);
  });

  it("ignora o que não é dígito (colar texto, símbolos)", () => {
    expect(digitsToCents("R$ 12,50")).toBe(1250);
    expect(digitsToCents("abc")).toBe(0);
  });

  it("depois do limite de dígitos o dígito novo é descartado", () => {
    const max = 10 ** MAX_MONEY_DIGITS - 1; // 999.999.999 centavos
    expect(digitsToCents(centsToInputText(max) + "7")).toBe(max);
  });
});
