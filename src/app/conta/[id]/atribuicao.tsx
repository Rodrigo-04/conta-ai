//tela de atribuição, identifica quem consumiu o quê
import {
    AccountItem,
    getParticipations,
    listItems,
    listPeople,
    Person,
    setItemParticipants,
} from "@/db";
import { useDb } from "@/db/DatabaseProvider";
import { formatCents } from "@/lib/money";
import * as ExpoRouter from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";

//item -> ids das pessoas que consumiram
type Marks = Record<string, string[]>;

//transforma erro em messagem
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

//quanto sai para cada pessoa em um item (divisão igual)
function perPersonText(item: AccountItem, count: number, only: string) {
  if (count === 1) return `Só ${only}`;
  const share = formatCents(Math.floor(item.totalCents / count));
  const approx = item.totalCents % count === 0 ? "" : "≈ ";
  return `Dicisão entre ${count} - ${approx}${share} por pessoa`;
}

//passo de atribuição
export default function AssignmentStep() {
  //conta
  const { id } = ExpoRouter.useLocalSearchParams<{ id: string }>();
  //banco de dados
  const db = useDb();
  //navegação
  const router = ExpoRouter.useRouter();

  const [items, setItems] = useState<AccountItem[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [marks, setMarks] = useState<Marks>({});
  const marksRef = useRef<Marks>({});
  const writes = useRef<Promise<void>>(Promise.resolve()); //fila de gravações

  //guarda as marcações
  const applyMarks = (next: Marks) => {
    marksRef.current = next;
    setMarks(next);
  };

  //atualizar informações com o banco de dados
  //itens que não tem ninguém, começam com todas as pessoas marcadas
  const load = useCallback(
    async (seed: boolean) => {
      const [list, crowd, found] = await Promise.all([
        listItems(db, id),
        listPeople(db, id),
        getParticipations(db, id),
      ]);
      let participations = found;
      if (seed && crowd.length > 0) {
        const assigned = new Set(
          found.filter((p) => p.personIds.length > 0).map((p) => p.itemId),
        );
        const empty = list.filter((item) => !assigned.has(item.id));
        for (const item of empty) {
          await setItemParticipants(
            db,
            item.id,
            crowd.map((p) => p.id),
          );
        }
        if (empty.length > 0) participations = await getParticipations(db, id);
      }
      const next: Marks = {};
      for (const p of participations) next[p.itemId] = [...p.personIds];
      setItems(list);
      setPeople(crowd);
      applyMarks(next);
    },
    [db, id],
  );

  //controlar comportamento de foco na tela
  ExpoRouter.useFocusEffect(
    useCallback(() => {
      load(true).catch((error) =>
        console.error("Falaha ao carregar a atribuição: ", error),
      );
    }, [load]),
  );

  //mostrar a mudança na hora e gravar em ordem
  const changeMarks = (itemId: string, ids: string[]) => {
    applyMarks({ ...marksRef.current, [itemId]: ids });
    writes.current = writes.current
      .then(() => setItemParticipants(db, itemId, ids))
      .catch(async (error) => {
        Alert.alert("Não foi possível salvar a marcação", messageOf(error));
        await load(false).catch(() => undefined);
      });
  };

  //marcar ou desmarcar pessoa de um item
  const togglePerson = (item: AccountItem, person: Person) => {
    const current = marksRef.current[item.id] ?? [];
    changeMarks(
      item.id,
      current.includes(person.id)
        ? current.filter((personId) => personId !== person.id)
        : [...current, person.id],
    );
  };

  //itens sem ninguém marcado
  const unassigned = items.filter(
    (item) => (marks[item.id] ?? []).length === 0,
  );

  //interface
}
