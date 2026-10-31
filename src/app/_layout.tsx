import { Stack } from "expo-router";
import { DatabaseProvider } from "../db/DatabaseProvider";

export default function RootLayout() {
  <DatabaseProvider>
    return <Stack screenOptions={{ headerShown: false }} />;
  </DatabaseProvider>;
}
