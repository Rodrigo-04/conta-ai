import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors, spacing, text } from "../ui/theme";
import type { Db } from "./db";
import { getAppDatabase } from "./expo";

//variável de contexto para o banco de dados
const DbContext = createContext<Db | null>(null);

//definindo estados para o banco de dados
type State =
  | { status: "loading" }
  | { status: "ready"; db: Db }
  | { status: "error"; message: string };

//abre o banco de dados uma vez e mostra o app quando já está pronto (já aplicou as migrações)
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getAppDatabase()
      .then((db) => !cancelled && setState({ status: "ready", db }))
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  if (state.status === "error") {
    return (
      <View style={styles.center}>
        <Text style={text.heading}>
          Não foi possível abrir o banco de dados.
        </Text>
        <Text style={[text.caption, styles.message]}>{state.message}</Text>
      </View>
    );
  }
  return <DbContext.Provider value={state.db}>{children}</DbContext.Provider>;
}

//o banco de dados do app só funciona dentro de <DatabaseProvider>
export function useDb(): Db {
  const db = useContext(DbContext);
  if (!db) throw new Error("useDb precisa estar dentro de <DatabaseProvider>.");
  return db;
}

//estilo para mensagem
const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    backgroundColor: colors.background,
  },
  message: { marginTop: spacing.sm, textAlign: "center" },
});
