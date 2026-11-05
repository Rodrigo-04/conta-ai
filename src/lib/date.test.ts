import { formatDateBR } from "./date";

describe("formatDateBR", () => {
  it("converte AAAA-MM-DD para DD/MM/AAAA", () => {
    expect(formatDateBR("2026-10-31")).toBe("31/10/2026");
    expect(formatDateBR("2026-01-05")).toBe("05/01/2026");
  });

  it("devolve o texto original se o formato for outro", () => {
    expect(formatDateBR("31/10/2026")).toBe("31/10/2026");
    expect(formatDateBR("")).toBe("");
    expect(formatDateBR("2026-10-31T10:00")).toBe("2026-10-31T10:00");
  });
});
