import { Stack } from "expo-router";
import { DatabaseProvider } from "../db/DatabaseProvider";

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DatabaseProvider>
  );
}
