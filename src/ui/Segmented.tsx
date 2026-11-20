import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "./theme";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface SegmentedProps<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}

//escolha de opções entre poucas, em botões lado a lado
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View style={styles.row}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityLabel={option.label}
            style={[styles.option, selected && styles.optionOn]}
          >
            <Text
              style={[styles.label, selected && styles.labelOn]}
              numberOfLines={2}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing.sm },
  option: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  optionOn: {
    borderColor: colors.primary,
    backgroundColor: colors.successSoft,
  },
  label: { fontSize: 14, textAlign: "center", color: colors.textMuted },
  labelOn: { color: colors.primary, fontWeight: "600" },
});
