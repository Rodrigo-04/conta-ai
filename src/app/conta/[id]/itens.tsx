//tela de gerenciamento de itens
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
  addItem,
  getAccount,
  listItems,
  removeItem,
  updateAccount,
  updateItem,
  type AccountItem,
} from "../../../db";
import { useDb } from "../../../db/DatabaseProvider";
import { formatCents } from "../../../lib/money";
import { formatQuantity, parseQuantity } from "../../../lib/quantity";
import { Button } from "../../../ui/Button";
import { MoneyInput } from "../../../ui/MoneyInput";
import { Screen } from "../../../ui/Screen";
import { StepFooter } from "../../../ui/StepFooter";
import { StepHeader } from "../../../ui/StepHeader";
import { TextField } from "../../../ui/TextField";
import { colors, radius, spacing, text } from "../../../ui/theme";

//impede de mudar de tela enquanto o app salva o nome do restaurante
const usePreventRemove: typeof ExpoRouter.usePreventRemove =
  ExpoRouter.usePreventRemove ?? (() => () => undefined);

//transforma erro em mensagem
function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

//passos de item
export default function ItemStep() {
  //conta
  const { id } = ExpoRouter.useLocalSearchParams<{ id: string }>();
  //banco de dados
  const db = useDb();

  const [items, setItems] = useState<AccountItem[]>([]);
  const [restaurant, setRestaurant] = useState("");
  const restaurantLoaded = useRef(false);
  const restaurantText = useRef(""); //digitado atualmente
  const restaurantSaved = useRef(""); //o que existe no banco de dados
  const [unsaved, setUnsaved] = useState(false); //nome não gravado

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [cents, setCents] = useState(0);
  const [quantityText, setQuantityText] = useState("1");
  const nameInput = useRef<ComponentRef<typeof TextInput>>(null);
  const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const scrollToEndNext = useRef(false); //rolar até o fim quando a lista crescer

  //atualizar informações com o banco de dados
  const reload = useCallback(async () => {
    const [account, list] = await Promise.all([
      getAccount(db, id),
      listItems(db, id),
    ]);
    setItems(list);
    if (!restaurantLoaded.current) {
      restaurantLoaded.current = true;
      restaurantText.current = restaurantSaved.current =
        account?.restaurant ?? "";
    }
  }, [db, id]);

  //salvar restaurante
  const saveRestaurant = useCallback(async () => {
    const wanted = restaurantText.current.trim();
    if (!restaurantLoaded.current || wanted === restaurantSaved.current.trim())
      return;
    try {
      await updateAccount(db, id, { restaurant: wanted || null });
      restaurantSaved.current = wanted;
      setUnsaved(false);
    } catch (error) {
      console.error("Falah ao salvar o nome do restaurante: ", error);
    }
  }, [db, id]);

  //controlar o comportamento da tela com e sem foco
  useFocusEffect(
    useCallback(() => {
      reload().catch((error) =>
        console.error("Falhar ao carregar os itens: ", error),
      );
      return () => {
        void saveRestaurant();
      };
    }, [reload, saveRestaurant]),
  );

  //impedir saída antes do salvamento
  usePreventRemove(unsaved, async ({ repeat }) => {
    await saveRestaurant();
    repeat();
  });

  //digitação de restaurante
  const changeRestaurant = (value: string) => {
    restaurantText.current = value;
    setRestaurant(value);
    setUnsaved(value.trim() !== restaurantSaved.current.trim());
  };

  //rolar até o fim da lista, onde o item novo aparece
  const scrollToEndSoon = () => {
    scrollToEndNext.current = true;
    //garante a rolagem mesmo se a lista não mudar de tamanho (ex.: edição)
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
    setCents(0);
    setQuantityText("1");
  };

  //validações
  const quantity = parseQuantity(quantityText);
  const canSave = name.trim().length > 0 && cents > 0 && quantity !== null;

  //adicionar ou atualizar itens
  const saveItem = async () => {
    if (!canSave || quantity === null) return;
    try {
      if (editingId)
        await updateItem(db, editingId, { name, quantity, totalCents: cents });
      else await addItem(db, id, { name, quantity, totalCents: cents });
      resetForm();
      scrollToEndSoon();
      await reload();
      nameInput.current?.focus();
    } catch (error) {
      Alert.alert("Não foi possível salvar o item", messageOf(error));
    }
  };

  //editar item
  const startEdit = (item: AccountItem) => {
    setEditingId(item.id);
    setName(item.name);
    setCents(item.totalCents);
    setQuantityText(formatQuantity(item.quantity));
    scrollRef.current?.scrollTo({ y: 0, animated: true }); //mostra o formulário
    nameInput.current?.focus();
  };

  //apagar item
  const confirmRemove = (item: AccountItem) => {
    Alert.alert("Remove item?", `"${item.name}" será removido da conta.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeItem(db, item.id);
            if (editingId === item.id) resetForm();
            await reload();
          } catch (error) {
            Alert.alert("Não foi possível", messageOf(error));
          }
        },
      },
    ]);
  };

  //calcular subtotal
  const subtotal = items.reduce((sum, item) => sum + item.totalCents, 0);

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
              scrollRef.current?.scrollToEnd({ animated: true });
            }
          }}
        >
          <StepHeader step="Itens" />

          <TextField
            label="Restaurante (opcional)"
            placeholder="Ex.: Cantina do Zé"
            value={restaurant}
            onChangeText={changeRestaurant}
            onBlur={saveRestaurant}
            autoCapitalize="words"
            returnKeyType="done"
          />

          <View style={styles.form}>
            <Text style={text.heading}>
              {editingId ? "Editar item" : "Adicionar item"}
            </Text>
            <TextField
              ref={nameInput}
              label="Nome do item"
              placeholder="Ex.: Pizza grande"
              value={name}
              onChangeText={setName}
              autoCapitalize="sentences"
              returnKeyType="next"
            />
            <View style={styles.row}>
              <View style={styles.valueCol}>
                <Text style={text.caption}>Valor total da linha</Text>
                <MoneyInput
                  value={cents}
                  onChangeCents={setCents}
                  accessibilityLabel="Valor do item"
                />
              </View>
              <View style={styles.qtyCol}>
                <TextField
                  label="Qtd."
                  value={quantityText}
                  onChangeText={setQuantityText}
                  keyboardType="decimal-pad"
                  selectTextOnFocus
                />
              </View>
            </View>
            {quantity === null && (
              <Text style={styles.error}>
                Quantidade inválida (ex.: 1 ou 0,45).
              </Text>
            )}
            <Button
              title={editingId ? "Salvar alterações" : "Adicionar"}
              onPress={saveItem}
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

          {/* lista resumida, no fim da tela: os itens entram embaixo, na ordem em que são adicionados */}
          <View style={styles.listHeader}>
            <Text style={text.heading}>Itens ({items.length})</Text>
          </View>

          {items.length === 0 ? (
            <Text style={[text.caption, styles.emptyText]}>
              Nenhum item ainda. Adicione o que está na nota; o valor é o total
              de cada linha.
            </Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[text.caption, styles.colName]}>Item</Text>
                <Text style={[text.caption, styles.colQty]}>Qtd.</Text>
                <Text style={[text.caption, styles.colPrice]}>Preço</Text>
                <View style={styles.colRemove} />
              </View>

              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => startEdit(item)}
                  accessibilityRole="button"
                  accessibilityHint="Toque para editar"
                  style={({ pressed }) => [
                    styles.tableRow,
                    item.id === editingId && styles.itemRowEditing,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[text.body, styles.colName]} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={[text.body, styles.colQty]}>
                    {formatQuantity(item.quantity)}
                  </Text>
                  <Text style={[styles.itemValue, styles.colPrice]}>
                    {formatCents(item.totalCents)}
                  </Text>
                  <Pressable
                    onPress={() => confirmRemove(item)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${item.name}`}
                    style={styles.colRemove}
                  >
                    <Text style={styles.remove}>✕</Text>
                  </Pressable>
                </Pressable>
              ))}

              <View style={styles.tableTotal}>
                <Text style={text.heading}>Subtotal</Text>
                <Text style={text.heading}>{formatCents(subtotal)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Os próximos passos (pessoas, atribuição, taxa e resultado) entram nas próximas fatias. */}
      <StepFooter nextLabel="Próximo: Pessoas (em breve)" />
    </Screen>
  );
}

//estilo
const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
  form: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  row: { flexDirection: "row", gap: spacing.md, alignItems: "flex-end" },
  valueCol: { flex: 2, gap: spacing.xs },
  qtyCol: { flex: 1 },
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
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tableTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  colName: { flex: 1 },
  colQty: { width: 48, textAlign: "right" },
  colPrice: { width: 96, textAlign: "right" },
  colRemove: { width: 32, alignItems: "center" },
  itemRowEditing: {
    borderColor: colors.primary,
    backgroundColor: colors.successSoft,
  },
  pressed: { opacity: 0.85 },
  itemValue: { fontSize: 16, fontWeight: "600", color: colors.text },
  remove: { fontSize: 16, color: colors.danger },
});
