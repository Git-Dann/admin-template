/**
 * Server-safe helpers for the Next.js root layout. No client hooks in here.
 *
 *   export const metadata = adminMetadata(config.brand);
 *   export default function RootLayout({ children }) {
 *     return <AdminRootLayout brand={config.brand}>{children}</AdminRootLayout>;
 *   }
 */
import type { ReactNode } from "react";
import { fontStylesheets, localFontFaces, type ResolvedTheme } from "@gitwork/tokens";
import themes from "@gitwork/tokens/themes.json";
import type { AdminConfig } from "./config";
import { modeScript } from "./theme-mode";

type Brand = AdminConfig["brand"];

function themeFor(id: string): ResolvedTheme {
  const theme = (themes as ResolvedTheme[]).find((t) => t.id === id);
  if (!theme) {
    const ids = (themes as ResolvedTheme[]).map((t) => t.id).join(", ");
    throw new Error(`Theme "${id}" not found. Add packages/tokens/themes/${id}.json or use one of: ${ids}.`);
  }
  return theme;
}

export function adminMetadata(brand: Brand) {
  const theme = themeFor(brand.theme);
  return {
    title: { default: brand.productName, template: `%s · ${brand.productName}` },
    applicationName: brand.productName,
    icons: { icon: theme.brand.favicon ?? brand.logo?.mark ?? "/favicon.ico" },
    robots: { index: false, follow: false },
  };
}

export function AdminRootLayout({ brand, children }: { brand: Brand; children: ReactNode }) {
  const theme = themeFor(brand.theme);
  const faces = localFontFaces(theme.fonts);
  return (
    <html lang="en-GB" data-theme={theme.id} data-mode={theme.modes.default} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: modeScript(theme.modes.supported) }} />
        {fontStylesheets(theme.fonts).map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
        {faces && <style dangerouslySetInnerHTML={{ __html: faces }} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
