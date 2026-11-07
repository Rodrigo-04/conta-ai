//campo de texto
import { ComponentRef, Ref } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    View,
    type TextInputProps,
} from "react-native";
import { colors, radius, spacing, text } from "./theme";

//interface para definir propriedades
interface TextFieldProps extends Omit<
  TextInputProps,
  "style" | "placeholderTextColor"
> {
  label: string;
  /** Para focar o campo por código. */
  ref?: Ref<ComponentRef<typeof TextInput>>;
}

//criando componente
export function TextField({ label, ref, ...inputProps }: TextFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={text.caption}>{label}</Text>
      <TextInput
        ref={ref}
        {...inputProps}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
      />
    </View>
  );
}

//estilos
const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xs,
  },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    fontSize: 16,
    color: colors.text,
  },
});
