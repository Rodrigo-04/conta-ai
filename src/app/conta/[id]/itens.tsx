//tela provisória
import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Screen } from "../../../ui/Screen";
import { spacing, text } from "../../../ui/theme";

export default function ItemsPlaceholder() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <Screen edges={["bottom", "left", "right"]}>
      <View style={styles.box}>
        <Text style={text.heading}>Conta criada</Text>
        <Text style={text.body}>A tela de Itens está em contrução.</Text>
        <Text style={text.caption}>id da conta: {id}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: spacing.lg, gap: spacing.sm },
});
