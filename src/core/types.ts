//Definir tipos e objetos para usar depois nos cálculos, visando organização

/** Utilizarei o valor como inteiro, pois o JS lida melhor com contas nesse modelo
 * assim, 10,25 -> 1025**/
//Cria o valor em centavos, tornando um valor único, sem vírgula
export type Cents = number;

// Cria o produto da conta
export interface Item {
  id: string;
  name: string;
  quantity: number; //quantidade, fração do item, não influencia a conta (talvez seja implementado futuramente)
  totalCents: Cents; //valor do produto em centavos
}

// Define quem consumiu cada Item, item compartilhado é dividido igualmente entre as partes
export interface Participation {
  itemId: string;
  personIds: readonly string[]; //um array para identificar compartilhamento
}

// Define o modo da taxa de serviço
export type FeeMode = "equal" | "proportional";

// Define o valor a ser pago por cada pessoa
export interface PersonTotal {
  personId: string;
  totalCents: Cents; //total sem a diferença dos centavos, essa diferença vêm se o valor a ser dividido possui resto
}

//Divisão igual de uma conta
export interface EqualSplitResult {
  totalCents: Cents;
  shares: PersonTotal[];
  remainderCents: Cents;
}

//separa o consumo e a taxa de cada pessoa
export interface PersonShare extends PersonTotal {
  //PersonShare tem as propriedades de PersonTotal (herança) + as criadas
  itemsCents: Cents;
  feeCents: Cents;
}

//Divisão por item de uma conta
export interface ItemSplitResult {
  subtotalCents: Cents;
  feeCents: Cents;
  totalCents: Cents;
  shares: PersonShare[];
  remainderCents: Cents;
}

//Corrigir diferença de centavos
export type WithAdjustment<T> = T & {
  //permite manter as propriedades iniciais + as criadas, T representa um objeto
  adjustmentCents: Cents;
  finalCents: Cents;
};
