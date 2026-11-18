import { z } from "zod";

/**
 * The semantic token contract. Components may only use these names.
 * Adding a name here makes it required in every theme (after `extends` is applied).
 */
export const SEMANTIC_COLORS = [
  "bg",
  "bg-elevated",
  "surface",
  "surface-raised",
  "border",
  "border-strong",
  "text",
  "text-muted",
  "text-on-accent",
  "accent",
  "accent-pressed",
  "accent-subtle",
  "accent-text",
  "secondary",
  "success",
  "success-subtle",
  "warning",
  "warning-subtle",
  "danger",
  "danger-subtle",
  "info",
  "info-subtle",
  "focus-ring",
  "overlay",
  "sidebar",
  "sidebar-text",
  "sidebar-text-muted",
  "sidebar-active",
  "sidebar-active-text",
  "sidebar-border",
  "sidebar-indicator",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
] as const;

export const SEMANTIC_RADII = ["sm", "md", "lg", "xl", "pill"] as const;
export const SEMANTIC_SPACE = ["1", "2", "3", "4", "5", "6", "8", "10", "12"] as const;
export const SEMANTIC_SIZES = ["control", "control-sm", "sidebar", "sidebar-collapsed", "topbar"] as const;
export const SEMANTIC_SHADOWS = ["sm", "md", "lg"] as const;

export const MODES = ["light", "dark"] as const;
export type Mode = (typeof MODES)[number];
export type SemanticColor = (typeof SEMANTIC_COLORS)[number];

/** A raw value: a CSS string, a `{group.name}` reference, or one value per mode. */
const modeValue = z.union([
  z.string().min(1),
  z
    .object({ light: z.string().min(1).optional(), dark: z.string().min(1).optional() })
    .strict()
    .refine((v) => v.light || v.dark, "Give at least one of light / dark"),
]);

/** A token: DTCG `{ "$value": ... }` or the shorthand bare value. */
const token = z.union([
  modeValue,
  z
    .object({
      $value: modeValue,
      $type: z.string().optional(),
      $description: z.string().optional(),
    })
    .strict(),
]);

const tokenGroup = z.record(z.string(), token);

const font = z
  .object({
    family: z.string().min(1).describe("Font family name, e.g. Barlow"),
    source: z
      .enum(["google", "fontshare", "local", "system"])
      .describe("google / fontshare load a stylesheet; local expects files under the app's public/fonts; system loads nothing"),
    weights: z.array(z.number().int().min(100).max(900)).optional(),
    fallback: z.string().optional().describe("CSS fallback stack appended after the family"),
    files: z.array(z.object({ src: z.string(), weight: z.number(), style: z.string().optional() })).optional(),
  })
  .strict();

export const themeFileSchema = z
  .object({
    $schema: z.string().optional(),
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, "Use lower-case letters, numbers and dashes"),
    name: z.string().min(1),
    extends: z.string().optional().describe("Inherit everything from another theme id, then override"),
    modes: z
      .object({
        default: z.enum(MODES),
        supported: z.array(z.enum(MODES)).min(1),
      })
      .strict()
      .optional(),
    brand: z
      .object({
        logo: z
          .object({ full: z.string(), mark: z.string().optional(), onDark: z.string().optional() })
          .strict()
          .optional(),
        favicon: z.string().optional(),
      })
      .strict()
      .optional(),
    fonts: z
      .object({ display: font.optional(), body: font.optional(), mono: font.optional() })
      .strict()
      .optional(),
    tokens: z
      .object({
        palette: z.record(z.string(), z.union([token, tokenGroup])).optional(),
        color: z.record(z.string(), token).optional(),
        radius: z.record(z.string(), token).optional(),
        space: z.record(z.string(), token).optional(),
        size: z.record(z.string(), token).optional(),
        shadow: z.record(z.string(), token).optional(),
      })
      .strict()
      .optional(),
    variants: z
      .record(
        z.string().regex(/^[a-z][a-z0-9-]*$/, "Use lower-case letters, numbers and dashes"),
        z.object({ color: z.record(z.string(), token) }).strict(),
      )
      .optional()
      .describe('Named colour overrides applied with data-variant="<name>", e.g. a premium look for some roles'),
  })
  .strict();

export type ThemeFile = z.infer<typeof themeFileSchema>;
export type FontSpec = z.infer<typeof font>;
export type TokenValue = z.infer<typeof token>;

/** Required keys per group, checked after `extends` is merged. */
export const REQUIRED: Record<"color" | "radius" | "space" | "size" | "shadow", readonly string[]> = {
  color: SEMANTIC_COLORS,
  radius: SEMANTIC_RADII,
  space: SEMANTIC_SPACE,
  size: SEMANTIC_SIZES,
  shadow: SEMANTIC_SHADOWS,
};
