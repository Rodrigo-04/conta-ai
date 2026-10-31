import { Text, View } from "react-native";

export default function Index() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>funcionou</Text>
    </View>
  );
}

// import { useEffect, useState } from "react";
// import { StyleSheet, Text, View } from "react-native";
// import { SafeAreaView } from "react-native-safe-area-context";
// import { listAccountSummaries } from "../db";
// import { useDb } from "../db/DatabaseProvider";
// import { formatCents } from "../lib/money";
// import { Button } from "../ui/Button";
// import { MoneyInput } from "../ui/MoneyInput";
// import { colors, radius, spacing, text } from "../ui/theme";

// export default function Index() {
//   const db = useDb();
//   const [accounts, setAccounts] = useState<number | null>(null);
//   const [cents, setCents] = useState(0);

//   useEffect(() => {
//     listAccountSummaries(db).then((list) => setAccounts(list.length));
//   }, [db]);

//   return (
//     <SafeAreaView style={styles.screen}>
//       <View style={styles.content}>
//         <Text style={text.title}>Conta Aí</Text>
//         <Text style={text.caption}>
//           Banco pronto · contas salvas: {accounts === null ? "..." : accounts}
//         </Text>

//         <View style={styles.card}>
//           <Text style={text.body}>Teste do campo de valor</Text>
//           <MoneyInput
//             value={cents}
//             onChangeCents={setCents}
//             accessibilityLabel="Valor de teste"
//           />
//           <Text style={text.heading}>{formatCents(cents)}</Text>
//           <Button
//             title="Zerar"
//             variant="secondary"
//             onPress={() => setCents(0)}
//           />
//         </View>
//       </View>
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   screen: { flex: 1, backgroundColor: colors.background },
//   content: { flex: 1, padding: spacing.lg, gap: spacing.sm },
//   card: {
//     marginTop: spacing.lg,
//     padding: spacing.md,
//     gap: spacing.md,
//     backgroundColor: colors.surface,
//     borderRadius: radius.lg,
//   },
// });
