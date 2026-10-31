//configuração de estilos base do App
import type { TextStyle } from "react-native";

//definindo cores
export const colors = {
  background: "#FFFFFF",
  surface: "#F4F5F7",
  text: "#111827",
  textMuted: "#6B7280",
  border: "#E2E4E9",
  primary: "#0E7C66",
  primaryText: "#FFFFFF",
  danger: "#B42318",
  dangerSoft: "#FDECEA",
  success: "#067647",
  successSoft: "#E6F4EC",
  warning: "#B54708",
  warningSoft: "#FEF3E2",
} as const;

//definindo espaçamento
export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;

//definindo arredondamento
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

//definindo texto
export const text: Record<"title" | "heading" | "body" | "caption", TextStyle> =
  {
    title: { fontSize: 28, fontWeight: "700", color: colors.text },
    heading: { fontSize: 20, fontWeight: "600", color: colors.text },
    body: { fontSize: 16, color: colors.text },
    caption: { fontSize: 13, color: colors.textMuted },
  };
