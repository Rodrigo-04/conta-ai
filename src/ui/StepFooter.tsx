//cria o footer para a criação de conta
import { StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { colors, spacing } from "./theme";

//interface com propriedades do footer
interface StepFooterProps {
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
}

//barra com botão para próxima etapa
export function StepFooter({
  onNext,
  nextLabel = "Próximo",
  nextDisabled = false,
}: StepFooterProps) {
  return (
    <View style={styles.bar}>
      <Button
        title={nextLabel}
        onPress={onNext ?? (() => undefined)}
        disabled={nextDisabled || !onNext}
      />
    </View>
  );
}

//estilo
const styles = StyleSheet.create({
  bar: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
