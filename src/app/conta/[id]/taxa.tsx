import { Stack } from "expo-router";
import { colors } from "../../../ui/theme";

//assistente de conta, cada passo é um tela
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
      <Stack.Screen name="pessoas" options={{ title: "Pessoas da conta" }} />
      <Stack.Screen
        name="atribuicao"
        options={{ title: "Quem consumiu o quê" }}
      />
      <Stack.Screen name="taxa" options={{ title: "Taxa de serviço" }} />
    </Stack>
  );
}
