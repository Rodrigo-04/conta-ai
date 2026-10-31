import { Pressable, StyleSheet, Text } from "react-native";
import { colors, radius, spacing } from "./theme";

//definindo variações
type Variant = "primary" | "secondary" | "danger";

//definindo propriedades dos botões
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
}

//botão
export function Button({
  title,
  onPress,
  variant = "primary",
  disabled = false,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      android_ripple={{ color: "#00000022" }}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text
        style={[styles.label, variant === "secondary" && styles.labelSecondary]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

//estilo do botão
const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { color: colors.primaryText, fontSize: 16, fontWeight: "600" },
  labelSecondary: { color: colors.text },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.85 },
});

const variantStyles = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: { backgroundColor: colors.danger },
});
