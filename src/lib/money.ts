//formatação e digitação de valores em reais
//Todo valor é um inteiro em centavos

//Quantidade máxima de dígitos
export const MAX_MONEY_DIGITS = 9;

//espaço que não permite quebra de linha
const NBSP = "\u00A0";

//formatar valor, sem símbolo da moeda
export function formatCentsPlain(cents: number): string {
  const negative = cents < 0;
  const abs = Math.abs(Math.trunc(cents));
  const reais = String(Math.floor(abs / 100)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ".",
  );
  const rest = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${reais},${rest}`;
}

//formatar centavos colocando R$
export function formatCents(cents: number): string {
  const plain = formatCentsPlain(cents);
  return plain.startsWith("-")
    ? `-R$${NBSP}${plain.slice(1)}`
    : `R$${NBSP}${plain}`;
}

//converte texto em centavos

//posiciona a vírgula com duas casas decimais
export function digitsToCents(
  text: string,
  maxDigits: number = MAX_MONEY_DIGITS,
): number {
  const digits = text.replace(/\D/g, "").slice(0, maxDigits);
  return digits === "" ? 0 : parseInt(digits, 10);
}

//exibição no campo (vazio fica 0,00)
export function centsToInputText(cents: number): string {
  return cents > 0 ? formatCentsPlain(cents) : "";
}
