//padronizar estrutura da tela
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { colors } from "./theme";

//define propriedades da tela
interface ScreenProps {
  children: ReactNode;
  edges?: readonly Edge[]; //respoeita área segura
}

//componente screen recebe o contéudo internamente no children
export function Screen({
  children,
  edges = ["top", "bottom", "left", "right"],
}: ScreenProps) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

//estilização
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
