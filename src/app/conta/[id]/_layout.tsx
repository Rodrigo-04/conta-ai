//layout de navegação de conta

import { colors } from "@/ui/theme";
import { Stack } from "expo-router";

//padroniza cabeçalho e voltar em todas as telas
export default function AccountLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="itens" options={{ title: "Itens da conta" }} />
    </Stack>
  );
}
