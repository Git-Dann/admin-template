"use client";

import { useState } from "react";
import type { Mode } from "@gitwork/tokens";
import type { SeasonalTheme } from "@gitwork/data";
import { Button, cn, Icon, Tabs, TabsList, TabsTrigger } from "@gitwork/ui";
import { overrideStyle } from "./logic";

/**
 * Live preview: the client theme with this season's colours, background, icon and splash,
 * rendered with real components under data-theme so it matches the app.
 */
export function ThemePreview({ theme, clientTheme, modes, productName, logo }: { theme: SeasonalTheme; clientTheme: string; modes: Mode[]; productName: string; logo?: { full: string; mark?: string } }) {
  const [device, setDevice] = useState<"phone" | "web" | "splash">("phone");
  const [mode, setMode] = useState<Mode>(modes[0] ?? "light");
  const a = theme.assets;
  const colours = a.colours.enabled ? a.colours.tokens : undefined;
  const icon = (a.appIcon.enabled && a.appIcon.icon?.url) || logo?.mark;
  const mobileBg = a.background.enabled ? a.background.mobile?.url : undefined;
  const desktopBg = a.background.enabled ? (a.background.desktop?.url ?? a.background.mobile?.url) : undefined;
  const name = productName.replace(/ Admin$/, "");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={device} onValueChange={(v) => setDevice(v as typeof device)}>
          <TabsList>
            <TabsTrigger value="phone"><Icon name="phone" size="sm" />App</TabsTrigger>
            <TabsTrigger value="web"><Icon name="desktop" size="sm" />Web</TabsTrigger>
            <TabsTrigger value="splash"><Icon name="sparkles" size="sm" />Splash</TabsTrigger>
          </TabsList>
        </Tabs>
        {modes.length > 1 && (
          <Button variant="ghost" size="icon" icon={mode === "dark" ? "sun" : "moon"} aria-label={`Preview in ${mode === "dark" ? "light" : "dark"} mode`} onClick={() => setMode(mode === "dark" ? "light" : "dark")} />
        )}
      </div>

      <div data-theme={clientTheme} data-mode={mode} style={overrideStyle(colours, mode)} className="flex justify-center rounded-lg border border-border bg-bg p-4 text-text">
        {device === "web" ? (
          <div className="w-full overflow-hidden rounded-md border border-border bg-bg shadow-md">
            <div className="flex h-7 items-center gap-1.5 border-b border-border bg-surface-raised px-3">
              {[0, 1, 2].map((i) => <span key={i} className="size-2 rounded-pill bg-border-strong/50" />)}
            </div>
            <div className="relative aspect-video bg-cover bg-center" style={desktopBg ? { backgroundImage: `url("${desktopBg}")` } : undefined}>
              <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
              <div className="relative flex items-center gap-2 p-3">
                {icon && <img src={icon} alt="" className="size-6 rounded-sm" />}
                <span className="font-display text-sm font-semibold">{name}</span>
                <span className="flex-1" />
                <span className="rounded-pill bg-accent px-3 py-1 text-[10px] font-semibold text-text-on-accent">Subscribe</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="rounded-sm border border-border bg-surface/90 p-2">
                    <div className="mb-1.5 h-8 rounded-[3px] bg-surface-raised" />
                    <div className="h-1.5 w-3/4 rounded-pill bg-text/70" />
                    <div className="mt-1 h-1.5 w-1/2 rounded-pill bg-accent" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative aspect-[9/19] w-56 overflow-hidden rounded-[2rem] border-[6px] border-text bg-bg shadow-lg">
            {device === "splash" ? (
              <div className="flex size-full flex-col items-center justify-center gap-3 bg-cover bg-center" style={a.splash.enabled && a.splash.fallback ? { backgroundImage: `url("${a.splash.fallback.url}")` } : undefined}>
                {!(a.splash.enabled && a.splash.fallback) && icon && <img src={icon} alt="" className="size-16 rounded-xl" />}
                <span className="rounded-pill bg-bg/80 px-2 py-0.5 text-[10px] text-text-muted">
                  {a.splash.enabled && a.splash.lottie ? "Lottie plays here on device" : "Default splash"}
                </span>
              </div>
            ) : (
              <div className="flex size-full flex-col bg-cover bg-center" style={mobileBg ? { backgroundImage: `url("${mobileBg}")` } : undefined}>
                <div className="flex items-center gap-2 bg-bg/70 px-3 pb-2 pt-6 backdrop-blur">
                  {icon && <img src={icon} alt="" className="size-6 rounded-md" />}
                  <span className="font-display text-sm font-semibold">{name}</span>
                </div>
                <div className="flex-1 space-y-2 p-3">
                  <div className="rounded-md border border-border bg-surface/90 p-3 shadow-sm">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-accent-text">{theme.name || "Seasonal theme"}</p>
                    <p className="mt-1 text-xs font-semibold">Something new this season</p>
                    <span className="mt-2 inline-flex rounded-pill bg-accent px-3 py-1 text-[10px] font-semibold text-text-on-accent">Watch now</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[0, 1].map((i) => (
                      <div key={i} className="rounded-md border border-border bg-surface/90 p-2">
                        <div className="mb-1.5 aspect-video rounded-[3px] bg-surface-raised" />
                        <div className="h-1.5 w-3/4 rounded-pill bg-text/60" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-around border-t border-border bg-bg-elevated/95 py-2">
                  {(["dashboard", "search", "content", "users"] as const).map((n, i) => (
                    <Icon key={n} name={n} size="sm" className={cn(i === 0 ? "text-accent" : "text-text-muted")} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
