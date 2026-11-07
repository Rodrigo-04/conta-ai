//cria o header para completar a criação de conta
import { StyleSheet, Text, View } from "react-native";
import { WIZARD_STEPS, WizardStepName } from "./steps";
import { colors, radius, spacing, text } from "./theme";

//exibe a etapa
export function StepHeader({ step }: { step: WizardStepName }) {
  const index = WIZARD_STEPS.indexOf(step);
  return (
    <View style={styles.wrap}>
      <Text style={text.caption}>
        Passo {index + 1} de {WIZARD_STEPS.length} - {step}
      </Text>
      <View style={styles.segment}>
        {WIZARD_STEPS.map((name, i) => (
          <View
            key={name}
            style={[styles.segment, i <= index && styles.segmentDone]}
          />
        ))}
      </View>
    </View>
  );
}

//estilos
const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  bar: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
  },
  segmentDone: {
    backgroundColor: colors.primary,
  },
});
