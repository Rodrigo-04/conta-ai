//etapas para criação da conta (assistente)

//definir etapas
export const WIZARD_STEPS = [
  "Itens",
  "Pessoas",
  "Atribuição",
  "Taxa",
  "Resultado",
] as const;

//define a etapa
export type WizardStepName = (typeof WIZARD_STEPS)[number];
