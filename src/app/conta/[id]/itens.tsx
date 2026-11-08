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
      await reload;
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
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
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

          <View style={styles.listHeader}>
            <Text style={text.heading}>Itens ({items.length})</Text>
            <Text style={text.body}>Subtotal: {formatCents(subtotal)}</Text>
          </View>

          {items.length === 0 ? (
            <Text style={[text.caption, styles.emptyText]}>
              Nenhum item ainda. Adicione o que está na nota; o valor é o total
              de cada linha.
            </Text>
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => startEdit(item)}
                accessibilityRole="button"
                accessibilityHint="Toque para editar"
                style={({ pressed }) => [
                  styles.itemRow,
                  item.id === editingId && styles.itemRowEditing,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.itemInfo}>
                  <Text style={text.body} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.quantity !== 1 && (
                    <Text style={text.caption}>
                      Qtd.: {formatQuantity(item.quantity)}
                    </Text>
                  )}
                </View>
                <Text style={styles.itemValue}>
                  {formatCents(item.totalCents)}
                </Text>
                <Pressable
                  onPress={() => confirmRemove(item)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remover ${item.name}`}
                >
                  <Text style={styles.remove}>Remover</Text>
                </Pressable>
              </Pressable>
            ))
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
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
  },
  itemRowEditing: {
    borderColor: colors.primary,
    backgroundColor: colors.successSoft,
  },
  pressed: { opacity: 0.85 },
  itemInfo: { flex: 1, gap: spacing.xs },
  itemValue: { fontSize: 16, fontWeight: "600", color: colors.text },
  remove: { fontSize: 13, color: colors.danger },
});
