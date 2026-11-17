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
import { formatQuantity } from "@/lib/quantity";
import { Button } from "@/ui/Button";
import { Screen } from "@/ui/Screen";
import { StepHeader } from "@/ui/StepHeader";
import { colors, radius, spacing, text } from "@/ui/theme";
import * as ExpoRouter from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

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
  return (
    <Screen edges={["bottom", "left", "right"]}>
        <ScrollView contentContainerStyle={styles.content}>
            <StepHeader step="Atribuição" />
            {items.length === 0 || people.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={text.heading}>
                        {people.length === 0 ? "Nenhuma pessoa na conta" : "Nenhum item na conta" }
                    </Text>
                    <Text style={[text.caption, styles.emptyText]}>
                        {people.length === 0 ? "Adicione quem estava na mesa para marcar quem consumiu cada item" : "Adicione os itens da nota no primeiro passo"}
                    </Text>
                    <Button title="Voltar" variant="secondary" onPress={() => router.back()} />
                </View>
                ) : (
                    <>
                    <View style={[
                        styles.status, unassigned.length === 0 ? styles.statusOk : styles.statusWarn,
                    ]}>
                        <Text style={unassigned.length === 0 ? styles.statusOkText : styles.statusWarnText}>
                            {unassigned.length === 0 ? "✓ Todos os itens têm dono" : unassigned.length === 1 ? "1 item sem ninguém marcado" : `${unassigned.length} itens sem ninguém marcado`}
                        </Text>
                        <Text style={text.caption}>
                            Toque nas pessoas que consumiram cada item. Mais de uma pessoa divide o item igualmente
                        </Text>
                    </View>

                    <Text style={text.heading}>Itens ({items.length})</Text>

                    {items.map((item) => {
                        const ids = marks[item.id] ?? [];
                        const first = people.find((p) => ids.includes(p.id));
                        return(
                            <View key={item.id} style={[styles.card, ids.length === 0 && styles.cardWarn]}>
                                <View style={styles.cardTop}>
                                    <Text style={text.body} numberOfLines={2}>
                                        {item.name}
                                    </Text>
                                    {item.quantity !== 1&& (
                                        <Text style={text.caption}>
                                            Qtd.: {formatQuantity(item.quantity)}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.price}>
                                    {formatCents(item.totalCents)}
                                </Text>
                            </View>

                            
                        )
                    })}
                    </>
                )
        </ScrollView>
    </Screen>
  )
}


//estilo
const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: { textAlign: "center", marginBottom: spacing.sm },
  status: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md },
  statusOk: { backgroundColor: colors.successSoft },
  statusWarn: { backgroundColor: colors.warningSoft },
  statusOkText: { fontSize: 15, fontWeight: "600", color: colors.success },
  statusWarnText: { fontSize: 15, fontWeight: "600", color: colors.warning },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  cardWarn: {
    borderColor: colors.warning,
    backgroundColor: colors.warningSoft,
  },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  cardName: { flex: 1, gap: spacing.xs },
  price: { fontSize: 16, fontWeight: "600", color: colors.text },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  chipOn: { backgroundColor: colors.successSoft, borderColor: colors.success },
  chipText: { fontSize: 14, color: colors.textMuted },
  chipTextOn: { color: colors.success, fontWeight: "600" },
  all: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
  },
  allText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  warnLine: { fontSize: 13, color: colors.warning, fontWeight: "600" },
});
