//definir estruturas e conversões

import type { FeeMode, Item } from "../core";

//uso do APP
//propriedades
export type SplitMode = "equal" | "items";
export type InstallmentStatus = "pending" | "paid";

//dados da conta
export interface Account {
  id: string;
  date: string; //formato yy-MM-dd
  restaurant: string | null;
  printedTotalCents: number | null; //valor total da nota
  feePercent: number | null; //percentual da taxa, quando a nota não tem o valor
  feeCents: number | null; //valor da taxa na nota (0 = sem taxa)
  discountCents: number;
  splitMode: SplitMode;
  feeMode: FeeMode;
  payerId: string | null;
  remainderCents: number; //diferença dos centavos
  remainderPersonId: string | null; //pessoa escolhida no sorteio para diferença
  drawDone: boolean; //se o valor já foi distribuido
  photoPath: string | null;
  createdAt: number;
  updateAt: number;
}

//itens da conta
export interface AccountItem extends Item {
  accontId: string;
  order: number;
}

//pessoa da conta
export interface Person {
  id: string;
  accountId: string;
  name: string;
  nickname: string | null;
  order: number;
}

//parcela da conta
export interface Installment {
  id: string;
  accountId: string;
  personId: string;
  amountCents: number;
  status: InstallmentStatus;
  paidAt: number | null;
}

//exibir nome, ou apelido se houver
export function personLabel(person: Pick<Person, "name" | "nickname">): string {
  return person.nickname?.trim() || person.name;
}

//resumo da conta
export interface AccountSumary {
  account: Account;
  peopleCount: number;
  itemSubtotalCents: number;
  pendingCount: number;
  pendingCents: number;
}

//uso do Banco
//dados da conta
export interface ContaRow {
  id: string;
  data: string;
  restaurante: string | null;
  total_impresso_centavos: number | null;
  taxa_percentual: number | null;
  taxa_centavos: number | null;
  desconto_centavos: number;
  modo_divisao: "igual" | "itens";
  modo_taxa: "igual" | "proporrcional";
  pagador_id: string | null;
  diferenca_centavos: number;
  pessoa_diferenca_id: string | null;
  sorteio_realizado: boolean;
  foto_caminho_local: string | null;
  created_at: number;
  updated_at: number;
}

//pessoas da conta
export interface PessoaRow {
  id: string;
  conta_id: string;
  nome: string;
  apelido: string | null;
  ordem: number;
}

//itens da conta
export interface ItemRow {
  id: string;
  conta_id: string;
  nome: string;
  quantidade: number;
  valor_linha_centavos: number;
  ordem: number;
}

//parcela da conta
export interface ParcelaRow {
  id: string;
  conta_id: string;
  pessoa_id: string;
  valor_devido_centavos: number;
  status: "pendente" | "pago";
  pago_em: number | null;
  deleted_at?: number | null;
}

//conversões
export const SPLIT_MODE_TO_DB = { equal: "igual", items: "itens" } as const;
export const FEE_MODE_TO_DB = {
  equal: "igual",
  proportional: "proporcional",
} as const;
export const STATUS_TO_DB = { pending: "pendente", paid: "pago" } as const;

//formatar ddados do Banco para o padrão do App
//conta
export function toAccount(r: ContaRow): Account {
  return {
    id: r.id,
    date: r.data,
    restaurant: r.restaurante,
    printedTotalCents: r.total_impresso_centavos,
    feePercent: r.taxa_percentual,
    feeCents: r.taxa_centavos,
    discountCents: r.desconto_centavos,
    splitMode: r.modo_divisao === "igual" ? "equal" : "items",
    feeMode: r.modo_taxa === "igual" ? "equal" : "proportional",
    payerId: r.pagador_id,
    remainderCents: r.diferenca_centavos,
    remainderPersonId: r.pessoa_diferenca_id,
    drawDone: r.sorteio_realizado,
    photoPath: r.foto_caminho_local,
    createdAt: r.created_at,
    updateAt: r.updated_at,
  };
}

//pessoa
export function toPerson(r: PessoaRow): Person {
  return {
    id: r.id,
    accountId: r.conta_id,
    name: r.nome,
    nickname: r.apelido,
    order: r.ordem,
  };
}

//item
export function toItem(r: ItemRow): AccountItem {
  return {
    id: r.id,
    accontId: r.conta_id,
    name: r.nome,
    quantity: r.quantidade,
    totalCents: r.valor_linha_centavos,
    order: r.ordem,
  };
}

//parcela
export function toInstallment(r: ParcelaRow): Installment {
  return {
    id: r.id,
    accountId: r.conta_id,
    personId: r.pessoa_id,
    amountCents: r.valor_devido_centavos,
    status: r.status === "pago" ? "paid" : "pending",
    paidAt: r.pago_em,
  };
}
