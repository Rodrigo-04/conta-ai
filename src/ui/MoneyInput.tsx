import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import {
  centsToInputText,
  digitsToCents,
  MAX_MONEY_DIGITS,
} from "../lib/money";
import { colors, radius, spacing } from "./theme";

//define propriedades do input de valor
interface MoneyInputProps {
  value: number;
  onChangeCents: (cents: number) => void;
  maxDigits?: number;
  autoFocus?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

//campo de valor em reais (digita o número e avírguna entra sozinha)
export function MoneyInput({
  value,
  onChangeCents,
  maxDigits = MAX_MONEY_DIGITS,
  autoFocus,
  accessibilityLabel,
  style,
}: MoneyInputProps) {
  const text = centsToInputText(value);
  return (
    <View style={[styles.box, style]}>
      <Text style={styles.prefix}>R$</Text>
      <TextInput
        style={styles.input}
        value={text}
        placeholder="0,00"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
        autoFocus={autoFocus}
        accessibilityLabel={accessibilityLabel}
        onChangeText={(next) => onChangeCents(digitsToCents(next, maxDigits))}
        selection={{ start: text.length, end: TextInput.length }} //cursor sempre no fim, o valor que se move
      />
    </View>
  );
}

//estilo do campo
const styles = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  prefix: { fontSize: 16, color: colors.textMuted, marginRight: spacing.sm },
  input: {
    flex: 1,
    fontSize: 18,
    color: colors.text,
    paddingVertical: spacing.sm,
  },
});
