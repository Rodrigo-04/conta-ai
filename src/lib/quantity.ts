//converte o valor digitado, aceitando até três casas decimais

//separar quantidade
export function parseQuantity(text: string): number | null {
  const normalized = text.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 ? value : null;
}

//formatar quantidade
export function formatQuantity(value: number): string {
  return String(value).replace(".", ",");
}
