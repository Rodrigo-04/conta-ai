//converte o valor digitado em percentual
//aceita de 0 a 100, com até 2 casas decimais
//devolve null quando inválido

export function parsePercent(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value >= 0 && value <= 100 ? value : null;
}

export function formatPercent(value: number): string {
  return String(value).replace(".", ",");
}
