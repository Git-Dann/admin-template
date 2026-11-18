export type Tone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

/** Text on its own subtle background (contrast-checked pairs in @gitwork/tokens). */
export const toneSoft: Record<Tone, string> = {
  neutral: "bg-surface-raised text-text-muted",
  accent: "bg-accent-subtle text-accent-text",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
};

export const toneDot: Record<Tone, string> = {
  neutral: "bg-text-muted",
  accent: "bg-accent",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};
