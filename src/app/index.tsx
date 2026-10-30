import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { splitByItems } from "../core";
import { createAccount, listAccountSummaries } from "../db";
import { openAppDatabase } from "../db/expo";

export default function Index() {
  const [msg, setMsg] = useState("testando...");
  useEffect(() => {
    (async () => {
      const db = await openAppDatabase();
      await createAccount(db, { restaurant: "Teste" });
      const total = (await listAccountSummaries(db)).length;
      const r = splitByItems({
        items: [{ id: "i", name: "x", quantity: 1, totalCents: 1000 }],
        personIds: ["a", "b", "c"],
        participations: [{ itemId: "i", personIds: ["a", "b", "c"] }],
        feeCents: 0,
        feeMode: "equal",
      });
      setMsg(`Contas: ${total} · sobra: ${r.remainderCents} centavo(s)`);
    })().catch((e) => setMsg(`ERRO: ${e.message}`));
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
      <Text>{msg}</Text>
    </View>
  );
}

// import { StyleSheet, Text, View } from "react-native";

// export default function Index() {
//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>Conta Aí</Text>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     alignItems: "center",
//     justifyContent: "center",
//     backgroundColor: "#ffffff",
//   },
//   title: { fontSize: 32, fontWeight: "700" },
// });
