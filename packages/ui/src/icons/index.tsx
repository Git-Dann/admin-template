"use client";

import { createContext, useContext, type ReactNode, type SVGProps } from "react";
import { cn } from "../lib/cn";
import { heroiconsSet, lucideSet, type IconComponent, type IconName } from "./registry";

export { ICON_NAMES, type IconName, type IconComponent } from "./registry";

/**
 * Icons are referenced by semantic name (`<Icon name="users" />`), never imported
 * from an icon library directly. A client picks its set in admin.config.ts:
 *   brand: { icons: "lucide" | "heroicons" }  or pass a custom partial map.
 */
export const ICON_SETS = { lucide: lucideSet, heroicons: heroiconsSet } as const;
export type IconSetName = keyof typeof ICON_SETS;
export type IconSet = Record<IconName, IconComponent>;

const IconContext = createContext<IconSet>(lucideSet);

export function IconProvider({
  set = "lucide",
  overrides,
  children,
}: {
  set?: IconSetName;
  /** Swap individual icons, e.g. a custom golf-flag SVG for "flag". */
  overrides?: Partial<IconSet>;
  children: ReactNode;
}) {
  return <IconContext.Provider value={{ ...ICON_SETS[set], ...overrides }}>{children}</IconContext.Provider>;
}

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "name"> {
  name: IconName;
  /** Pixel size. Defaults to 20 (16 for `size="sm"`). */
  size?: number | "sm" | "md" | "lg";
  /** Accessible label. Without one the icon is decorative and hidden from screen readers. */
  label?: string;
}

const SIZES = { sm: 16, md: 20, lg: 24 } as const;

export function Icon({ name, size = "md", label, className, ...rest }: IconProps) {
  const set = useContext(IconContext);
  const Component = set[name] ?? lucideSet[name];
  const px = typeof size === "number" ? size : SIZES[size];
  return (
    <Component
      width={px}
      height={px}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? "img" : undefined}
      focusable="false"
      className={cn("shrink-0", className)}
      {...rest}
    />
  );
}

/** Accept either a semantic name or a custom component wherever an icon is configurable. */
export type IconLike = IconName | IconComponent;

export function renderIcon(icon: IconLike | undefined, props: Omit<IconProps, "name"> = {}): ReactNode {
  if (!icon) return null;
  if (typeof icon === "string") return <Icon name={icon} {...props} />;
  const Custom = icon;
  const px = typeof props.size === "number" ? props.size : SIZES[props.size ?? "md"];
  return <Custom width={px} height={px} aria-hidden className={cn("shrink-0", props.className)} />;
}
