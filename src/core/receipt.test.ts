import { reconcileReceipt, resolveBillTotal } from "./receipt";
import type { Item } from "./types";

const item = (id: string, totalCents: number): Item => ({ id, name: id, quantity: 1, totalCents });

describe("reconcileReceipt", () => {
  const items = [item("a", 6000), item("b", 1500)];

  it("bate quando itens + taxa = total impresso", () => {
    const r = reconcileReceipt({ items, feeCents: 750, printedTotalCents: 8250 });
    expect(r.matches).toBe(true);
    expect(r.differenceCents).toBe(0);
    expect(r.expectedTotalCents).toBe(8250);
  });

  it("aponta diferença positiva (a nota tem mais do que os itens somam)", () => {
    const r = reconcileReceipt({ items, feeCents: 750, printedTotalCents: 9000 });
    expect(r.matches).toBe(false);
    expect(r.differenceCents).toBe(750);
  });

  it("aponta diferença negativa (item lido a mais ou valor errado)", () => {
    const r = reconcileReceipt({ items, feeCents: 750, printedTotalCents: 8000 });
    expect(r.matches).toBe(false);
    expect(r.differenceCents).toBe(-250);
  });
});

describe("resolveBillTotal", () => {
  const items = [item("a", 6000), item("b", 1500)];

  it("usa o total impresso na nota quando existe", () => {
    expect(resolveBillTotal({ items, feeCents: 750, printedTotalCents: 9999 })).toBe(9999);
  });

  it("sem total impresso, usa itens + taxa", () => {
    expect(resolveBillTotal({ items, feeCents: 750 })).toBe(8250);
    expect(resolveBillTotal({ items, feeCents: 750, printedTotalCents: null })).toBe(8250);
  });
});
