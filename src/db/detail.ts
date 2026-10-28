import type { Participation } from "@/core";
import { getAccount } from "./accounts";
import type { Db } from "./db";
import { listInstallments } from "./installments";
import { listItems } from "./items";
import type { Account, AccountItem, Installment, Person } from "./models";
import { getParticipations } from "./participations";
import { listPeople } from "./people";

//objeto detalhes da conta
export interface AccountDetail {
  account: Account;
  items: AccountItem[];
  people: Person[];
  participations: Participation[];
  installments: Installment[];
}

//carregar a conta completa
export async function loadAccountDetail(
  db: Db,
  accountId: string,
): Promise<AccountDetail | null> {
  const account = await getAccount(db, accountId);
  if (!account) return null;
  const [items, people, participations, installments] = await Promise.all([
    listItems(db, accountId),
    listPeople(db, accountId),
    getParticipations(db, accountId),
    listInstallments(db, accountId),
  ]);
  return { account, items, people, participations, installments };
}
