//tela para adicioanr pessoas a conta
import * as ExpoRouter from "expo-router";
import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState, type ComponentRef } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addPerson,
  getAccount,
  listPeople,
  personLabel,
  removePerson,
  updateAccount,
  updatePerson,
  type Person,
} from "../../../db";
import { useDb } from "../../../db/DatabaseProvider";
import { Button } from "../../../ui/Button";
import { Screen } from "../../../ui/Screen";
import { StepFooter } from "../../../ui/StepFooter";
import { StepHeader } from "../../../ui/StepHeader";
import { TextField } from "../../../ui/TextField";
import { colors, radius, spacing, text } from "../../../ui/theme";

//transformar erro em mensagem
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

//passo de pessoas
export default function PeopleStep() {
  //conta
  const { id } = ExpoRouter.useLocalSearchParams<{ id: string }>();
  //banco de dados
  const db = useDb();

  const [people, setPeople] = useState<Person[]>([]);
  const [payerId, setPayerId] = useState<string | null>(null); //quem pagou a conta
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [nickname, setNickname] = useState("");
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const nicknameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollRef = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollToEndNext = useRef(false); //rolar até o fim da listaw

  //atualizar informações com o banco de dados
  const reload = useCallback(async () => {
    const [account, list] = await Promise.all([
      getAccount(db, id),
      listPeople(db, id),
    ]);
    setPeople(list);
    setPayerId(account?.payerId ?? null);
  }, [db, id]);

  //controlar o comportamento da tela com e sem foco
  useFocusEffect(
    useCallback(() => {
      reload().catch((error) =>
        console.error("Falaha ao carregar as pessoas: ", error),
      );
    }, [reload]),
  );

  //rolar até o fim da lista, onde a nova pessoa aparece
  const scrollToEndSoon = () => {
    scrollToEndNext.current = true;
    //garantir a rolagem mesmo quando a lista não mudar de tamanho
    setTimeout(() => {
      if (scrollToEndNext.current) {
        scrollToEndNext.current = false;
        scrollRef.current?.scrollToEnd({ animated: true });
      }
    }, 500);
  };

  //limpar formulário
  const resetForm = () => {
    setEditingId(null);
    setName("");
    setNickname("");
  };

  //validações: duas pessoas não podem ter o mesmo nome de exibição
  const typedLabel = (nickname.trim() || name.trim()).toLowerCase();
  const duplicate =
    typedLabel !== "" &&
    people.some(
      (p) => p.id !== editingId && personLabel(p).toLowerCase() === typedLabel,
    );
  const canSave = name.trim().length > 0 && !duplicate;

  //adicionar ou atualizar pessoas
  const savePerson = async () => {
    if (!canSave) return;
    try {
      if (editingId) await updatePerson(db, editingId, { name, nickname });
      else await addPerson(db, id, { name, nickname });
      resetForm();
      scrollToEndSoon();
      await reload();
      nameInput.current?.focus();
    } catch (error) {
      Alert.alert("Não foi possível salvar a pessoa", messageOf(error));
    }
  };

  //editar pessoa
  const startEdit = (person: Person) => {
    setEditingId(person.id);
    setName(person.name);
    setNickname(person.nickname ?? "");
    scrollRef.current?.scrollTo({ y: 0, animated: true }); //mostra o formulário
    nameInput.current?.focus();
  };

  //marcar ou desmarcar quem pagou a conta
  const togglePayer = async (person: Person) => {
    try {
      await updateAccount(db, id, {
        payerId: payerId === person.id ? null : person.id,
      });
      await reload();
    } catch (error) {
      Alert.alert("Não foi possível marcar quem pagou", messageOf(error));
    }
  };

  //remover pessoa
  const confirmRemove = (person: Person) => {
    Alert.alert(
      "remover pessoa?",
      `"${personLabel(person)}" sai da conta e das divisões.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              await removePerson(db, person.id);
              if (editingId === person.id) resetForm();
              await reload();
            } catch (error) {
              Alert.alert("Não foi possível remover", messageOf(error));
            }
          },
        },
      ],
    );
  };

  //interface
  return (
    <Screen edges={["bottom", "left", "right"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => {
            if (scrollToEndNext.current) {
              scrollToEndNext.current = false;
              scrollRef.current?.scrollToend({ animated: true });
            }
          }}
        >
          <StepHeader step="Pessoas" />
          <View style={styles.form}>
            <Text style={text.heading}>
              {editingId ? "Editar pessoa" : "adicionar pessoa"}
            </Text>
            <TextField
              ref={nameInput}
              label="Nome"
              placeholder="Ex.: Ana Souza"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={() => nicknameInput.current?.focus()}
            />
            <TextField
              ref={nicknameInput}
              label="Apelido (opcional)"
              placeholder="Ex.: Aninha"
              value={nickname}
              onChangeText={setNickname}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={savePerson}
            />
            {duplicate && (
              <Text style={styles.error}>
                Já existe alguém com esse nome. use um apelido para distinguir.
              </Text>
            )}
            <Button
              title={editingId ? "Salvar alterações" : "adicionar"}
              onPress={savePerson}
              disabled={!canSave}
            />
            {editingId && (
              <Button
                title="Cancelar edição"
                variant="secondary"
                onPress={resetForm}
              />
            )}
          </View>

          {/* lista no fim da tela */}
          <View style={styles.listHeader}>
            <Text style={text.heading}>Pessoas ({people.length})</Text>
          </View>

          {people.length === 0 ? (
            <Text style={[text.caption, styles.emptyText]}>
              Nenhuma pessoa ainda. Adicione quem estava na mesa. Um toque em
              "Pagou?" marca quem pagou a conta (pode ficar para depois).
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[text.caption, styles.colName]}>Pessoa</Text>
                <Text style={[text.caption, styles.colPayer]}>
                  Pagou a conta
                </Text>
                <View style={styles.colRemove} />
              </View>

              {people.map((person) => {
                const isPayer = person.id === payerId;
                return (
                  <Pressable
                    key={person.id}
                    onPress={() => startEdit(person)}
                    accessibilityRole="button"
                    accessibilityHint="Toque para editar"
                    style={({ pressed }) => [
                      styles.tableRow,
                      person.id === editingId && styles.rowEditing,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.colName}>
                      <Text style={text.body} numberOfLines={1}>
                        {personLabel(person)}
                      </Text>
                      {person.nickname?.trim() ? (
                        <Text style={text.caption} numberOfLines={1}>
                          {person.name}
                        </Text>
                      ) : null}
                    </View>
                    <Pressable
                      onPress={() => togglePayer(person)}
                      hitSlop={6}
                      accessibilityRole="button"
                      accessibilityLabel={
                        isPayer
                          ? `Desmarcar ${personLabel(person)} como quem pagou`
                          : `Marcar ${personLabel(person)} como quem pagou`
                      }
                      style={[styles.chip, isPayer && styles.chipOn]}
                    >
                      <Text
                        style={[styles.chipText, isPayer && styles.chipTextOn]}
                      >
                        {isPayer ? "Pagou" : "Pagou?"}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => confirmRemove(person)}
                      hitSlop={8}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover ${personLabel(person)}`}
                      style={styles.colRemove}
                    >
                      <Text style={styles.remove}>X</Text>
                    </Pressable>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
      <StepFooter nextLabel="Próximo: Atribuição (em breve)" />
    </Screen>
  );
}

//estilos
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  form: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  error: { color: colors.danger, fontSize: 13 },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  emptyText: { textAlign: "center", paddingVertical: spacing.md },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rowEditing: {
    borderColor: colors.primary,
    backgroundColor: colors.warningSoft,
  },
  colName: { flex: 1 },
  colPayer: { width: 96, textAlign: "center" },
  colRemove: { width: 32, alignItems: "center" },
  chip: {
    width: 96,
    alignItems: "center",
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.successSoft, borderColor: colors.success },
  chipText: { fontSize: 13, color: colors.textMuted },
  chipTextOn: { color: colors.success, fontWeight: "600" },
  pressed: { opacity: 0.85 },
  remove: { fontSize: 16, color: colors.danger },
});
