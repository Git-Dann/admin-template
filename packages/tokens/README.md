# @gitwork/tokens

One JSON file per client theme → CSS variables, a Tailwind v4 theme, and native colour files.

```
themes/<id>.json        the only file you edit (or import from Figma)
mappings/<id>.figma.json Figma variable name → semantic token
dist/css/<id>.css       [data-theme="<id>"] { --gw-color-accent: … }   (generated)
dist/tailwind.css       @theme mapping → bg-surface, text-text-muted, h-control … (generated)
dist/themes.json        resolved values for runtime (theme builder, Storybook) (generated)
dist/native/<id>/<mode> ThemeColors.swift + colors.xml for app asset packs (generated)
```

## Commands (run from the repo root)

| Command | What it does |
| --- | --- |
| `pnpm tokens:build` | Build everything in `dist/`. Runs automatically before `pnpm dev`. |
| `pnpm tokens:check [id] [--verbose]` | Validate themes and check WCAG AA contrast. Fails CI on any miss. |
| `pnpm tokens:import <files…> --client <id> [--dry-run]` | Import Figma Variables into `themes/<id>.json`. |

## Theme file

- Values are a CSS string, a `{ "light": …, "dark": … }` pair, or DTCG `{ "$value": … }`.
- `{palette.red.500}` references work anywhere. `palette` is private: it never becomes a CSS variable, so components can't use it.
- `extends: "<id>"` inherits another theme and overrides only what you list. Seasonal themes use this.
- Every name in `src/schema.ts` (`SEMANTIC_COLORS` etc.) is required. Missing ones are listed in one error.
- Editors autocomplete and validate against `schema/theme.schema.json`.

## Using tokens in components

Tailwind's default palette is removed, so only semantic classes exist:

```tsx
<div className="bg-surface border border-border rounded-lg text-text shadow-sm">
  <p className="text-text-muted">Revenue</p>
  <button className="h-control bg-accent text-text-on-accent rounded-md">Save</button>
</div>
```

`bg-red-500` or `bg-[#fff]` won't compile or will fail lint (`gitwork/no-raw-colours`).

## Contrast rules

`src/contrast.ts` lists every pair we promise is readable (text on surfaces 4.5:1, icons/borders/charts 3:1, status pill text on its subtle background 4.5:1 …). Add a pair there when a new component combines tokens in a new way.
