# Gitwork admin foundation

One repo for every client admin portal. A new client is a theme file, a config file and some data adapters. Layout and components are never rebuilt.

```bash
pnpm i
pnpm dev            # admin-starter :3000, admin-wedge :3001, admin-fellas :3002 (all on mock data)
pnpm storybook      # every component, the shell and every module page, in every theme :6006
pnpm create-client acme --accent "#C8102E"
```

Sign in with any of the role buttons on the login screen (mock auth). Use the account menu to switch role and see permissions change.

## Contents

- [Repo map](#repo-map)
- [Architecture](#architecture)
- [Theming](#theming)
- [Adding a client](#adding-a-client)
- [Adding or changing a theme](#adding-or-changing-a-theme)
- [Importing tokens from Figma](#importing-tokens-from-figma)
- [Adding a module](#adding-a-module)
- [Adding an adapter (connecting a real API)](#adding-an-adapter-connecting-a-real-api)
- [Permissions](#permissions)
- [Theme builder and asset packs](#theme-builder-and-asset-packs)
- [Design rules](#design-rules)
- [Testing and CI](#testing-and-ci)
- [Preview on Cloudflare](#preview-on-cloudflare)
- [Decisions and known limits](#decisions-and-known-limits)

## Repo map

```
apps/
  admin-starter/      template app every client copies (neutral "gitwork" theme)
  admin-wedge/        example client: light, green, golf data
  admin-fellas/       example client: dark, red, streaming data, theme builder
  storybook/          Storybook for all packages
packages/
  tokens/             theme JSON → CSS variables, Tailwind theme, contrast check, Figma import
  ui/                 token-driven components (Radix/shadcn style), charts, DataTable, form kit, icons
  admin-shell/        layout, top bar, page header, auth guard, RBAC, typed config, module router
  data/               adapter interfaces + offline mock adapters
  modules/            dashboard, users, rbac, reports, coupons, content, notifications, theme builder
  config/             tsconfig bases, ESLint config and the design-rule lint plugin
scripts/
  create-client.ts    pnpm create-client <name>
```

| Tool | Version | Note |
| --- | --- | --- |
| Next.js | 16.4 | App Router, Turbopack |
| React | 19.3 | |
| Tailwind CSS | 4.3 | CSS-first `@theme`, default palette removed |
| TypeScript | 6.0 | Not 7.0 yet: typescript-eslint doesn't support it |
| ESLint | 9.39 | Not 10 yet: jsx-a11y doesn't support it |
| TanStack Table / Query | 9.3 / 5.107 | |
| Storybook | 10.6 | Next.js Vite framework |
| pnpm / Turborepo | 12.18 / 2.11 | |

## Architecture

```
            ┌───────────────────── apps/admin-<client> ─────────────────────┐
            │ admin.config.ts   brand · nav · roles · modules · adapters    │
            │ app/              4 tiny files, identical in every client     │
            └───────┬──────────────────────┬────────────────────┬───────────┘
                    │                      │                    │
          @gitwork/modules        @gitwork/admin-shell     @gitwork/data
          feature pages           layout, RBAC, router     adapter interfaces + mocks
                    │                      │
                    └──────────┬───────────┘
                          @gitwork/ui           components, charts, tables, forms
                               │
                        @gitwork/tokens         themes/<client>.json → CSS variables
```

How a page renders:

1. The root layout reads `config.brand.theme` and sets `<html data-theme="fellas" data-mode="dark">`, loads the theme's fonts and applies a saved light/dark choice before paint.
2. `app/(admin)/layout.tsx` wraps everything in `<AdminApp config>`: providers (TanStack Query, icons, tooltips, toasts), session, auth guard and the AppShell.
3. `app/(admin)/[[...slug]]/page.tsx` renders `<ModuleRouter />`, which matches the URL against the enabled modules' routes, checks permissions and renders the page.
4. Pages read data only through `useAdapter("reports")`. Never `fetch()` directly.

Every client app has the same four `app/` files. Everything client-specific lives in `admin.config.ts`, the theme JSON and adapters.

## Theming

Components only use semantic tokens. Raw colours don't exist:

```tsx
<div className="bg-surface border border-border rounded-lg shadow-sm">
  <p className="text-text-muted">Revenue</p>
  <button className="h-control bg-accent text-text-on-accent">Save</button>
</div>
```

Tailwind's default palette is removed (`--color-*: initial`), so `bg-red-500` simply doesn't compile, and lint rejects `bg-[#fff]`.

**Token names:** `bg`, `bg-elevated`, `surface`, `surface-raised`, `border`, `border-strong`, `text`, `text-muted`, `text-on-accent`, `accent`, `accent-pressed`, `accent-subtle`, `accent-text`, `secondary`, `success|warning|danger|info` (each with `-subtle`), `focus-ring`, `overlay`, `chart-1…6`, plus `radius-*`, `space-*`, `size-*` (`control` = 44px), `shadow-*`, `font-display|body|mono`. The full list is in `packages/tokens/src/schema.ts`.

**How it works:** `pnpm tokens:build` (runs automatically before `dev` and `build`) turns `packages/tokens/themes/*.json` into:

- `dist/css/<id>.css`: `[data-theme="<id>"] { --gw-color-accent: … }`, plus `[data-mode="dark"]` overrides
- `dist/tailwind.css`: maps `--gw-*` variables to Tailwind utilities
- `dist/themes.json`: resolved values for runtime (theme builder, Storybook)
- `dist/native/<id>/<mode>/`: `ThemeColors.swift` and `colors.xml`

Themes switch at runtime by changing `data-theme` / `data-mode` on any element. The theme builder preview uses this to show a seasonal theme inside the page.

**Outside Tailwind** (SVG attributes, inline styles, chart libraries) use `tokenVar("chart-1")` → `var(--gw-color-chart-1)`. Tailwind's own `var(--color-*)` doesn't exist at runtime, and lint will tell you so.

## Adding a client

```bash
pnpm create-client acme --accent "#C8102E"
```

Options: `--from <theme>` (start from another theme, default `gitwork`), `--flavour streaming|golf|generic` (mock data), `--dark` (dark by default), `--keep-theme` (use a theme file you already made, for example from a Figma import).

It takes about 2 seconds and:

1. copies `apps/admin-starter` to `apps/admin-acme` on the next free port
2. creates `packages/tokens/themes/acme.json`; with `--accent` it derives pressed, subtle, text, focus and chart shades for light and dark
3. creates a Figma mapping stub at `packages/tokens/mappings/acme.figma.json`
4. writes placeholder logos, links the workspace, builds tokens and runs the contrast check
5. prints next steps

Then edit `apps/admin-acme/admin.config.ts`:

```ts
export default defineAdminConfig({
  brand: { productName: "Acme Admin", theme: "acme", logo: { full: "/brand/logo.svg", mark: "/brand/mark.svg" }, icons: "lucide" },
  modules: [dashboard(), reports(), users({ title: "Customers", basePath: "/customers" })],
  nav: [ /* optional: generated from modules if you leave it out */ ],
  roles: [{ id: "owner", label: "Owner", permissions: ["*"] }, /* … */],
  adapters: { ...createMockAdapters({ roleIds: ["owner"] }), reports: acmeReports },
  features: { betaExports: true },
});
```

Hover any field for docs. Mistakes (a module whose adapter is missing, a duplicate module) show up as a readable error screen in development.

**Icons:** `brand.icons` is `"lucide"` (default) or `"heroicons"` (Fellas uses this). `brand.iconOverrides` swaps individual icons for brand ones. Components always use semantic names (`<Icon name="users" />`), so a set swap touches nothing else. To add an icon, add one line to `packages/ui/src/icons/registry.ts` with its Lucide and Heroicons names.

## Adding or changing a theme

One file per client: `packages/tokens/themes/<id>.json`. Editors validate it against `schema/theme.schema.json`.

```jsonc
{
  "$schema": "../schema/theme.schema.json",
  "id": "acme",
  "name": "Acme",
  "modes": { "default": "light", "supported": ["light", "dark"] },
  "fonts": {
    "display": { "family": "Clash Display", "source": "fontshare", "weights": [600, 700] },
    "body": { "family": "Inter", "source": "google" }
  },
  "tokens": {
    "palette": { "brand": { "500": "#C8102E" } },          // private: never becomes a CSS variable
    "color": {
      "accent": { "light": "{palette.brand.500}", "dark": "#FF5A6E" },
      "surface": "#FFFFFF"                                  // same in every mode
      // … every semantic name is required
    },
    "radius": { "sm": "6px", "md": "10px", "lg": "14px", "xl": "20px", "pill": "999px" }
  }
}
```

- Values are a CSS string, `{ "light", "dark" }`, or DTCG `{ "$value": … }`.
- `{group.name}` references work anywhere.
- `"extends": "gitwork"` inherits a whole theme and overrides only what you list.
- Fonts: `google` and `fontshare` load a stylesheet; `local` uses files in the app's `public/fonts`; `system` loads nothing.

Swapping a theme file re-skins the whole app. No component changes are needed: point `brand.theme` at another id and restart.

Check it: `pnpm tokens:check acme --verbose` lists every contrast pair and ratio. The build fails CI if any pair misses WCAG AA. The pairs live in `packages/tokens/src/contrast.ts`.

## Importing tokens from Figma

Designers can update tokens without touching code.

1. In Figma, export the variables collection. Either use **Export modes** (one JSON per mode, e.g. `Light.tokens.json`, `Dark.tokens.json`) or save the REST API response of `GET /v1/files/:key/variables/local`.
2. Run:

   ```bash
   pnpm tokens:import ./Light.tokens.json ./Dark.tokens.json --client acme --dry-run
   pnpm tokens:import ./Light.tokens.json ./Dark.tokens.json --client acme
   ```

3. The importer resolves aliases, maps names, writes `themes/acme.json`, runs the contrast check and prints what was mapped, skipped and left alone.

Name mapping lives in `packages/tokens/mappings/<client>.figma.json`:

```json
{
  "modes": { "Light": "light", "Dark": "dark" },
  "collections": ["Semantic"],
  "tokens": { "Brand/Red": "color.accent", "Background/Card": "color.surface" },
  "ignore": ["Legacy/Old blue"]
}
```

You rarely need many entries: a variable whose last segment already matches a token (`Colour/Surface Raised`, `Text/Muted`, `Radius/md`) maps automatically, and `Primitives/…` variables are skipped because semantic variables alias them. Tokens missing from the export keep their current values.

## Adding a module

A module is a factory that returns routes, permissions and required adapters. Put it in `packages/modules/src/<name>/` with a server-safe `index.tsx` (the factory) and a `"use client"` `page.tsx` (the UI):

```tsx
// index.tsx
import type { AdminModule } from "@gitwork/admin-shell";
import { BookingsPage, BookingDetail } from "./page";

export function bookings(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "bookings",
    title: options.title ?? "Bookings",
    icon: "calendar",
    basePath: options.basePath ?? "/bookings",
    permission: "bookings.read",
    permissions: [
      { id: "bookings.read", label: "View bookings" },
      { id: "bookings.manage", label: "Change bookings", ownable: true },
    ],
    adapters: ["bookings"],
    routes: [{ path: "", component: BookingsPage }, { path: ":id", component: BookingDetail }],
  };
}
```

In `page.tsx`, build with `PageHeader` (sets the top bar title and lays out filters and actions), `useAdapter`, TanStack Query and `@gitwork/ui`. Use `DataState`, `DataTable` and `ChartCard`, which all have loading, empty and error states. Export it from `packages/modules/src/index.ts`, add a page story to `pages.stories.tsx`, then enable it in a client's `modules` array. Its permissions appear in the roles matrix automatically.

## Adding an adapter (connecting a real API)

1. If it's a new kind of data, add the interface to `packages/data/src/types.ts` and its key to `Adapters`, then add a mock to `packages/data/src/mock/index.ts` so every app keeps working offline.
2. Implement it for the client, usually in `apps/admin-<client>/adapters/`:

   ```ts
   import type { ReportsAdapter } from "@gitwork/data";

   export function createReportsAdapter(api: ApiClient): ReportsAdapter {
     return {
       async getRevenue(range) {
         const res = await api.get("/admin/revenue", { params: range });
         return toRevenueReport(res); // map their shape to ours
       },
     };
   }
   ```

3. Swap it in: `adapters: { ...mock, reports: createReportsAdapter(api) }`.

Adapters return our types, so modules never change. Keep numbers reconciled in the adapter: `assertReconciles("revenue by platform", total, parts)` from `@gitwork/ui/format` throws in development if they don't add up.

**Reviewing states on mock data:** add `?mock-fail=reports`, `?mock-empty=coupons` or `?mock-latency=0` to any URL.

## Permissions

Grants on roles: `"users.read"`, `"content.*"`, `"*"`, and own scope `"content.manage:own"`.

```ts
can(user, "content.manage");                              // granted at any scope?
can(user, "content.manage", { ownerId: group.ownerId });  // own scope checked
scopeOf(user, "content.manage");                          // "all" | "own" | "none", for filtering lists
```

In components use `useCan(...)`, `useScope(...)` or `<Can permission="…">`. Nav items and module routes check permissions too. Wedge's creators and Fellas's hosts show own scope in practice: sign in as one and open Groups or Series.

Session permissions come from `config.roles`. The roles page edits roles through the `rbac` adapter. When a client stores roles server-side, load them in the auth adapter's session so both agree.

## Theme builder and asset packs

`themeBuilder()` (enabled in Fellas and the starter) manages seasonal looks.

- **List:** live, scheduled, draft and ended themes.
- **Editor:** name, schedule, audience and platforms, plus four asset slots, each with an on/off toggle:
  - **Splash:** Lottie JSON (validated: structure, length, orientation, embedded images) and a fallback still.
  - **App icon:** 1024×1024 artwork and the native icon key. Shows honestly where that icon ships: "In iOS 4.12.0", "In iOS 4.13.0 (in review)" or "Requires release".
  - **Background:** mobile and desktop/web, with size and orientation checks.
  - **Colour tokens:** import a Gitwork theme file, a Figma Variables export or a flat `{ "accent": "#C8102E" }` map. Overrides are checked for contrast against the client theme.
- **Live preview:** app, web and splash views rendered with real tokens under `data-theme`.
- **Publish:** blocked with plain reasons until the theme is complete.

**Export assets** builds a zip per platform in the browser:

| Pack | Contents |
| --- | --- |
| Web | `logo.svg`, `background-desktop.webp`, `background-mobile.webp`, `splash.json`, `splash-fallback.webp`, `favicon-16/32/48.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `og-image.png` (1200×630), `manifest.webmanifest`, `theme.css`, `theme.json` |
| iOS | alternate icon at 1024/180/120/87/80/60/58/40, `AlternateIcon.plist` entry, splash files, background, `colours.json`, `README.txt` |
| Android | `res/mipmap-*` launcher icons, adaptive foreground, splash files, background, `values` and `values-night/colors.xml`, `README.txt` with the `activity-alias` snippet |

`theme.css` applies when the web app sets `<html data-season="<slug>">`.

**Native icons need an app release.** iOS and Android alternate icons are compiled into the app binary and can't be pushed remotely. The editor and each pack's README say which build carries the icon. Splash, background and colours can be delivered remotely by your theme API.

## Design rules

Enforced in components, lint or tests where possible:

| Rule | How it's enforced |
| --- | --- |
| No raw colours | Tailwind palette removed; lint `gitwork/no-raw-colours`; `gitwork/no-theme-vars` for inline styles |
| No thick one-sided border on a rounded box (crescent) | lint `gitwork/no-crescent-border`; use `<IndicatorBar />` or square that side |
| One control height in the top bar and toolbars | `h-control` (44px token) on every button, input, chip and pill |
| Numbers reconcile | `toShares()` always sums to 100; `assertReconciles()`; mock data and CSV totals are tested |
| en-GB formatting | `formatNumber`, `formatCurrency` (£), `formatDelta` (real minus sign), `formatDate` |
| One headline, then detail | `StatCard emphasis` + `KpiStrip` + one chart; tables for lists |
| Empty, loading and error states | Built into `DataTable`, `ChartCard`, `DataState` |
| Accessible by default | Radix primitives, token focus rings, skip link, `aria-sort`, screen-reader tables behind charts, jsx-a11y lint, Storybook a11y addon, WCAG AA contrast check on every theme |

## Testing and CI

```bash
pnpm test              # Vitest across packages (tokens, ui, shell, data, modules)
pnpm lint              # ESLint incl. design rules
pnpm typecheck
pnpm tokens:check      # theme validation + contrast
pnpm build && pnpm e2e # Playwright smoke test per app (signs in, visits every module)
```

If Playwright's own browser isn't installed, point it at another Chromium with `PLAYWRIGHT_CHROMIUM=/path/to/chrome`.

CI (`.github/workflows/ci.yml`) runs all of the above. Version packages with Changesets: `pnpm changeset`.

## Preview on Cloudflare

Each app can be exported as plain files (`STATIC_EXPORT=1`) and served by Cloudflare Workers static assets, so clients can review the admin on mock data without a server.

```bash
npx wrangler login     # or set CLOUDFLARE_API_TOKEN
pnpm preview:deploy    # builds static exports + Storybook, deploys each with wrangler
```

Each app's `wrangler.jsonc` names the Worker (`gitwork-admin-<client>`) and uses single-page-app fallback, so deep links like `/themes/thm_0002` work. Mock data lives in the browser, so changes reset on a full reload. For a real API, deploy the normal Next.js build instead (for example with OpenNext on Workers).

## Decisions and known limits

- **TypeScript 6 and ESLint 9:** the latest majors (TS 7, ESLint 10) aren't supported by typescript-eslint and jsx-a11y yet. Upgrade when they are.
- **SF Pro** can't be self-hosted on the web under Apple's licence. Wedge uses the system stack, which renders SF on Apple devices.
- **Clash Display** loads from Fontshare's CDN. Self-host it via `source: "local"` if a client needs no third-party requests.
- **Fellas red** (`#EA140D`) is 4.46:1 on the Fellas background, just under AA for text. Links and active labels use `accent-text` (`#FF5E57`). `border-strong` was raised to `#A85C62` to pass 3:1 for input edges. Brand red also sits close to the `danger` colour, so destructive actions rely on labels and icons as well as colour.
- **Asset packs are built in the browser.** Fine for reviews and small teams. For production, consider moving `buildPack` server-side for consistent image encoding.
- **Lottie isn't played in the preview** (the fallback still is shown) to avoid shipping a Lottie player. Add `lottie-web` to the preview if designers want motion there.
- **Mock auth** stores the session in `localStorage`. Real auth goes in the `auth` adapter.
- **Shared mock data:** the starter and Fellas use the same seed, so their numbers match.
