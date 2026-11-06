//tela inicial
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  AccountSummary,
  createAccount,
  deleteAccount,
  listAccountSummaries,
} from "../db";
import { useDb } from "../db/DatabaseProvider";
import { formatDateBR } from "../lib/date";
import { formatCents } from "../lib/money";
import { Button } from "../ui/Button";
import { Screen } from "../ui/Screen";
import { colors, radius, spacing, text } from "../ui/theme";

//nome de cada conta
function accountTitle(summary: AccountSummary): string {
  return summary.account.restaurant?.trim() || "Conta sem nome";
}

//home
export default function Home() {
  const db = useDb();
  const router = useRouter();
  const [accounts, setAccounts] = useState<AccountSummary[] | null>(null);

  //carregamento
  const load = useCallback(async () => {
    setAccounts(await listAccountSummaries(db));
  }, [db]);

  //atualização de tela
  useFocusEffect(
    useCallback(() => {
      load().catch((error) =>
        console.error("Falha ao listar as contas:", error),
      );
    }, [load]),
  );

  //abrir uma conta
  const openAccount = (summary: AccountSummary) => {
    router.push(`./conta/${summary.account.id}/itens`);
  };

  //criar uma conta
  const newAccount = async () => {
    try {
      const account = await createAccount(db);
      router.push(`./conta/${account.id}/itens`);
    } catch (error) {
      Alert.alert(
        "Não foi opssível criar a conta",
        error instanceof Error ? error.message : String(error),
      );
    }
  };

  //apagar uma conta
  const confirmDelete = (summary: AccountSummary) => {
    Alert.alert("Excluir conta?", `"${accountTitle(summary)}" será removida.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteAccount(db, summary.account.id);
            await load();
          } catch (error) {
            Alert.alert(
              "Não foi possível excluir",
              error instanceof Error ? error.message : String(error),
            );
          }
        },
      },
    ]);
  };

  //visual da tela
  return (
    <Screen>
      {/* cabeçalho */}
      <View style={styles.header}>
        <Text style={text.title}>Conta Aí</Text>
        <Text style={text.caption}>Suas contas de restaurantes</Text>
      </View>

      {/* lista de contas */}
      <FlatList
        data={accounts ?? []}
        keyExtractor={(summary) => summary.account.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          accounts === null ? undefined : (
            <View style={styles.empty}>
              <Text style={text.heading}>Nenhuma conta ainda</Text>
              <Text style={[text.caption, styles.emptyText]}>
                Toque em "Nova conta" para dividir a conta do restaurante.
              </Text>
            </View>
          )
        }
        // renderização da conta
        renderItem={({ item: summary }) => {
          const people = summary.peopleCount;
          return (
            // card da conta
            <Pressable
              onPress={() => openAccount(summary)}
              onLongPress={() => confirmDelete(summary)}
              accessibilityRole="button"
              accessibilityHint="Toque para abrir. Segure para excluir."
              style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
              ]}
            >
              {/* informações da conta */}
              <View style={styles.cardTop}>
                <Text
                  style={[text.heading, styles.cardTitle]}
                  numberOfLines={1}
                >
                  {accountTitle(summary)}
                </Text>
                <Text style={text.caption}>
                  {formatDateBR(summary.account.date)}
                </Text>
              </View>
              <Text style={text.body}>
                {people} {people === 1 ? "pessoa" : "pessoas"} -{" "}
                {formatCents(summary.itemsSubtotalCents)}
              </Text>
              {summary.pendingCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {summary.pendingCount}{" "}
                    {summary.pendingCount === 1 ? "pendente" : "pendentes"} -{" "}
                    {formatCents(summary.pendingCents)}
                  </Text>
                </View>
              )}
            </Pressable>
          );
        }}
      />
      {/* botão para nova conta */}
      <View style={styles.footer}>
        <Button title="Nova conta" onPress={newAccount} />
        {accounts !== null && accounts.length > 0 && (
          <Text style={[text.caption, styles.hint]}>
            Segure uma conta para excluir.
          </Text>
        )}
      </View>
    </Screen>
  );
}

//estilo
const styles = StyleSheet.create({
  header: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.md,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.sm,
    textAlign: "center",
  },
  card: {
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: spacing.sm,
  },
  cardTitle: {
    flexShrink: 1,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.warning,
  },
  footer: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  hint: {
    textAlign: "center",
  },
});
