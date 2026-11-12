import type { Decorator, Preview } from "@storybook/nextjs-vite";
import { fontStylesheets, type ResolvedTheme } from "@gitwork/tokens";
import themes from "@gitwork/tokens/themes.json";
import { IconProvider } from "@gitwork/ui/icons";
import { TooltipProvider } from "@gitwork/ui";
import "@gitwork/ui/styles.css";

const all = themes as ResolvedTheme[];

// Load every theme's web fonts once.
for (const href of new Set(all.flatMap((t) => fontStylesheets(t.fonts)))) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = href;
  document.head.appendChild(link);
}

const options = all.flatMap((t) => t.modes.supported.map((m) => ({ value: `${t.id}:${m}`, title: `${t.name} (${m})` })));

function Themed({ value, children, label }: { value: string; children: React.ReactNode; label?: string }) {
  const [theme, mode] = value.split(":");
  return (
    <div data-theme={theme} data-mode={mode} className="bg-bg text-text font-body" style={{ padding: 24, minHeight: "100%" }}>
      {label && <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</p>}
      {children}
    </div>
  );
}

const withTheme: Decorator = (Story, context) => {
  const choice = context.globals.theme as string;
  const fullscreen = context.parameters.layout === "fullscreen";
  const story = (
    <TooltipProvider>
      <IconProvider set={(context.globals.icons as "lucide" | "heroicons") ?? "lucide"}>
        <Story />
      </IconProvider>
    </TooltipProvider>
  );
  if (choice !== "compare") return <Themed value={choice}>{story}</Themed>;
  // Compare: the two client themes next to each other (stacked for full-screen layouts).
  return (
    <div style={{ display: "grid", gridTemplateColumns: fullscreen ? "1fr" : "repeat(auto-fit, minmax(420px, 1fr))", minHeight: "100vh" }}>
      <Themed value="wedge:light" label="Wedge · light">{story}</Themed>
      <Themed value="fellas:dark" label="Fellas · dark">{story}</Themed>
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Client theme",
      toolbar: {
        title: "Theme",
        icon: "paintbrush",
        items: [{ value: "compare", title: "Wedge + Fellas side by side" }, ...options],
        dynamicTitle: true,
      },
    },
    icons: {
      description: "Icon set",
      toolbar: { title: "Icons", icon: "star", items: [{ value: "lucide", title: "Lucide" }, { value: "heroicons", title: "Heroicons" }], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: "compare", icons: "lucide" },
  parameters: {
    nextjs: { appDirectory: true },
    layout: "fullscreen",
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: "error" },
    backgrounds: { disable: true },
  },
};

export default preview;
