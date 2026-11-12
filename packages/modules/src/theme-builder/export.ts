/**
 * Asset pack export, generated in the browser (canvas + fflate). Good for design
 * reviews and small teams; for production you may want this server-side for
 * consistent image encoding.
 */
import { strToU8, zipSync, type Zippable } from "fflate";
import type { AppBuild, ColourOverrides, SeasonalTheme } from "@gitwork/data";
import { iconRelease, seasonalCss, slugify } from "./logic";

export type PackPlatform = "web" | "ios" | "android";

export interface PackFile {
  path: string;
  description: string;
  /** Present when the file can be generated from the current theme. */
  ready: boolean;
}

export interface PackContext {
  theme: SeasonalTheme;
  clientTheme: string;
  productName: string;
  /** Brand logos from admin.config.ts (used when the theme has no icon). */
  logo?: { full: string; mark?: string };
  accent: string;
  background: string;
  builds: AppBuild[];
}

const has = (v: unknown) => Boolean(v);

/** What each pack will contain, for the export panel checklist. */
export function packManifest(platform: PackPlatform, ctx: PackContext): PackFile[] {
  const a = ctx.theme.assets;
  const icon = has(a.appIcon.enabled && a.appIcon.icon) || has(ctx.logo?.mark);
  const splash = a.splash.enabled;
  const bg = a.background.enabled;
  if (platform === "web") {
    return [
      { path: "logo.svg", description: "Brand logo", ready: has(ctx.logo?.full) },
      { path: "background-desktop.webp", description: "Desktop background", ready: bg && has(a.background.desktop) },
      { path: "background-mobile.webp", description: "Mobile web background", ready: bg && has(a.background.mobile) },
      { path: "splash.json", description: "Lottie splash", ready: splash && has(a.splash.lottie) },
      { path: "favicon-16.png, favicon-32.png, favicon-48.png", description: "Favicon set", ready: icon },
      { path: "apple-touch-icon.png", description: "180×180 home screen icon", ready: icon },
      { path: "icon-192.png, icon-512.png, icon-maskable-512.png", description: "PWA icons", ready: icon },
      { path: "og-image.png", description: "1200×630 social share image", ready: has(a.background.desktop) || icon },
      { path: "theme.css, theme.json", description: "Colour overrides and metadata", ready: true },
      { path: "manifest.webmanifest", description: "PWA manifest snippet", ready: icon },
    ];
  }
  if (platform === "ios") {
    return [
      { path: "AppIcon/*.png", description: "Alternate icon, 1024 plus 180/120/87/80/60/58/40", ready: has(a.appIcon.enabled && a.appIcon.icon) },
      { path: "AlternateIcon.plist", description: "CFBundleAlternateIcons entry", ready: has(a.appIcon.nativeIconKey) },
      { path: "splash.json, splash-fallback.png", description: "Splash animation and still", ready: splash && (has(a.splash.lottie) || has(a.splash.fallback)) },
      { path: "background.png", description: "Mobile background", ready: bg && has(a.background.mobile) },
      { path: "colours.json", description: "Colour overrides", ready: true },
      { path: "README.txt", description: "Release status for the alternate icon", ready: true },
    ];
  }
  return [
    { path: "res/mipmap-*/ic_launcher_<key>.png", description: "Launcher icon, mdpi to xxxhdpi", ready: has(a.appIcon.enabled && a.appIcon.icon) },
    { path: "res/drawable/ic_launcher_<key>_foreground.png", description: "Adaptive icon foreground, 432×432", ready: has(a.appIcon.enabled && a.appIcon.icon) },
    { path: "splash.json, splash-fallback.png", description: "Splash animation and still", ready: splash && (has(a.splash.lottie) || has(a.splash.fallback)) },
    { path: "background.png", description: "Mobile background", ready: bg && has(a.background.mobile) },
    { path: "res/values/colors.xml", description: "Colour overrides", ready: true },
    { path: "README.txt", description: "activity-alias snippet and release status", ready: true },
  ];
}

/* ------------------------------ image helpers ------------------------------ */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Couldn't load image ${src.slice(0, 60)}`));
    img.src = src;
  });
}

async function render(
  src: string,
  width: number,
  height: number,
  { fit = "cover", type = "image/png", background, padding = 0 }: { fit?: "cover" | "contain"; type?: string; background?: string; padding?: number } = {},
): Promise<Uint8Array> {
  const img = await loadImage(src);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  if (background) {
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
  }
  const iw = img.naturalWidth || width;
  const ih = img.naturalHeight || height;
  const box = { w: width - padding * 2, h: height - padding * 2 };
  const scale = fit === "cover" ? Math.max(box.w / iw, box.h / ih) : Math.min(box.w / iw, box.h / ih);
  const w = iw * scale;
  const h = ih * scale;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Image export failed"))), type, 0.88));
  return new Uint8Array(await blob.arrayBuffer());
}

async function fetchBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't fetch ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

async function ogImage(ctx: PackContext, iconSrc?: string): Promise<Uint8Array> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const c = canvas.getContext("2d")!;
  c.fillStyle = ctx.background;
  c.fillRect(0, 0, 1200, 630);
  const bg = ctx.theme.assets.background.desktop?.url;
  if (bg) {
    const img = await loadImage(bg);
    const s = Math.max(1200 / img.naturalWidth, 630 / img.naturalHeight);
    c.drawImage(img, (1200 - img.naturalWidth * s) / 2, (630 - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
  }
  const grad = c.createLinearGradient(0, 630, 0, 200);
  grad.addColorStop(0, "rgba(0,0,0,0.7)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = grad;
  c.fillRect(0, 0, 1200, 630);
  if (iconSrc) {
    const icon = await loadImage(iconSrc);
    c.drawImage(icon, 64, 630 - 64 - 120, 120, 120);
  }
  c.fillStyle = "#FFFFFF";
  c.font = "700 56px system-ui, sans-serif";
  c.fillText(ctx.theme.name, iconSrc ? 216 : 64, 630 - 96);
  c.font = "500 28px system-ui, sans-serif";
  c.fillText(ctx.productName, iconSrc ? 216 : 64, 630 - 56);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}

/* ------------------------------- text files ------------------------------- */

function themeJson(ctx: PackContext, files: string[]) {
  const t = ctx.theme;
  return JSON.stringify(
    {
      id: slugify(t.name),
      name: t.name,
      clientTheme: ctx.clientTheme,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      platforms: t.platforms,
      audienceId: t.audienceId,
      colours: t.assets.colours.enabled ? t.assets.colours.tokens : undefined,
      nativeIconKey: t.assets.appIcon.enabled ? t.assets.appIcon.nativeIconKey : undefined,
      files,
    },
    null,
    2,
  );
}

function releaseReadme(ctx: PackContext, platform: "ios" | "android"): string {
  const key = ctx.theme.assets.appIcon.nativeIconKey;
  const status = iconRelease(key, platform, ctx.builds);
  const name = platform === "ios" ? "iOS" : "Android";
  const statusLine =
    status.state === "shipped"
      ? `Icon "${key}" ships in ${name} ${status.build.version} (live). The app can switch to it now.`
      : status.state === "in-review"
        ? `Icon "${key}" is in ${name} ${status.build.version} (${status.build.status}). It works once that build is released.`
        : `Icon "${key ?? "(no key)"}" is not in any ${name} build. Add these files to the app and ship a release before the theme starts.`;
  const snippet =
    platform === "ios"
      ? `Add AppIcon/*.png to the asset catalogue as an alternate icon set named "${key}", merge AlternateIcon.plist into Info.plist, then call:\n  UIApplication.shared.setAlternateIconName("${key}")`
      : `Copy res/ into app/src/main/res, then add an activity-alias:\n  <activity-alias android:name=".Icon_${key}" android:enabled="false"\n      android:icon="@mipmap/ic_launcher_${key}" android:targetActivity=".MainActivity">\n    <intent-filter> <action android:name="android.intent.action.MAIN"/> <category android:name="android.intent.category.LAUNCHER"/> </intent-filter>\n  </activity-alias>`;
  return `${ctx.theme.name} · ${name} asset pack\n\n${statusLine}\n\nNative alternate icons must be compiled into the app. They can't be pushed remotely.\nSplash, background and colours can be delivered remotely by your theme API.\n\n${snippet}\n`;
}

function colorsXml(overrides: ColourOverrides | undefined, mode: "light" | "dark") {
  const rows = Object.entries(overrides ?? {})
    .map(([name, v]) => [name, typeof v === "string" ? v : (v[mode] ?? v.light ?? v.dark)] as const)
    .filter(([, value]) => value && /^#/.test(value))
    .map(([name, value]) => `  <color name="season_${name.replace(/-/g, "_")}">${value}</color>`);
  return `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n${rows.join("\n")}\n</resources>\n`;
}

/* --------------------------------- builders --------------------------------- */

export async function buildPack(platform: PackPlatform, ctx: PackContext): Promise<Blob> {
  const files: Zippable = {};
  const a = ctx.theme.assets;
  const iconSrc = (a.appIcon.enabled && a.appIcon.icon?.url) || ctx.logo?.mark;
  const slug = slugify(ctx.theme.name);
  const key = a.appIcon.nativeIconKey || slug;

  if (platform === "web") {
    if (ctx.logo?.full) files["logo.svg"] = await fetchBytes(ctx.logo.full);
    if (a.background.enabled && a.background.desktop) files["background-desktop.webp"] = await render(a.background.desktop.url, 2560, 1440, { type: "image/webp" });
    if (a.background.enabled && a.background.mobile) files["background-mobile.webp"] = await render(a.background.mobile.url, 1170, 2532, { type: "image/webp" });
    if (a.splash.enabled && a.splash.lottie) files["splash.json"] = await fetchBytes(a.splash.lottie.url);
    if (a.splash.enabled && a.splash.fallback) files["splash-fallback.webp"] = await render(a.splash.fallback.url, 1080, 1920, { type: "image/webp" });
    if (iconSrc) {
      for (const size of [16, 32, 48]) files[`favicon-${size}.png`] = await render(iconSrc, size, size, { fit: "contain" });
      files["apple-touch-icon.png"] = await render(iconSrc, 180, 180, { fit: "contain", background: ctx.background });
      files["icon-192.png"] = await render(iconSrc, 192, 192, { fit: "contain" });
      files["icon-512.png"] = await render(iconSrc, 512, 512, { fit: "contain" });
      files["icon-maskable-512.png"] = await render(iconSrc, 512, 512, { fit: "contain", background: ctx.accent, padding: 80 });
      files["manifest.webmanifest"] = strToU8(
        JSON.stringify(
          {
            name: ctx.productName,
            theme_color: ctx.accent,
            background_color: ctx.background,
            icons: [
              { src: "icon-192.png", sizes: "192x192", type: "image/png" },
              { src: "icon-512.png", sizes: "512x512", type: "image/png" },
              { src: "icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
            ],
          },
          null,
          2,
        ),
      );
    }
    files["og-image.png"] = await ogImage(ctx, iconSrc);
    files["theme.css"] = strToU8(seasonalCss(ctx.clientTheme, slug, a.colours.enabled ? a.colours.tokens : undefined));
    files["theme.json"] = strToU8(themeJson(ctx, Object.keys(files)));
  }

  if (platform === "ios") {
    if (a.appIcon.enabled && a.appIcon.icon) {
      for (const size of [1024, 180, 120, 87, 80, 60, 58, 40]) files[`AppIcon/${key}-${size}.png`] = await render(a.appIcon.icon.url, size, size, { background: ctx.background });
    }
    files["AlternateIcon.plist"] = strToU8(
      `<key>CFBundleAlternateIcons</key>\n<dict>\n  <key>${key}</key>\n  <dict>\n    <key>CFBundleIconFiles</key>\n    <array><string>${key}</string></array>\n    <key>UIPrerenderedIcon</key>\n    <false/>\n  </dict>\n</dict>\n`,
    );
    if (a.splash.enabled && a.splash.lottie) files["splash.json"] = await fetchBytes(a.splash.lottie.url);
    if (a.splash.enabled && a.splash.fallback) files["splash-fallback.png"] = await render(a.splash.fallback.url, 1290, 2796);
    if (a.background.enabled && a.background.mobile) files["background.png"] = await render(a.background.mobile.url, 1290, 2796);
    files["colours.json"] = strToU8(JSON.stringify(a.colours.enabled ? (a.colours.tokens ?? {}) : {}, null, 2));
    files["README.txt"] = strToU8(releaseReadme(ctx, "ios"));
  }

  if (platform === "android") {
    if (a.appIcon.enabled && a.appIcon.icon) {
      const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
      for (const [density, size] of Object.entries(densities)) files[`res/mipmap-${density}/ic_launcher_${key}.png`] = await render(a.appIcon.icon.url, size, size, { background: ctx.background });
      files[`res/drawable/ic_launcher_${key}_foreground.png`] = await render(a.appIcon.icon.url, 432, 432, { fit: "contain", padding: 72 });
    }
    if (a.splash.enabled && a.splash.lottie) files["splash.json"] = await fetchBytes(a.splash.lottie.url);
    if (a.splash.enabled && a.splash.fallback) files["splash-fallback.png"] = await render(a.splash.fallback.url, 1080, 2400);
    if (a.background.enabled && a.background.mobile) files["background.png"] = await render(a.background.mobile.url, 1080, 2400);
    files["res/values/colors.xml"] = strToU8(colorsXml(a.colours.enabled ? a.colours.tokens : undefined, "light"));
    files["res/values-night/colors.xml"] = strToU8(colorsXml(a.colours.enabled ? a.colours.tokens : undefined, "dark"));
    files["README.txt"] = strToU8(releaseReadme(ctx, "android"));
  }

  const zipped = zipSync({ [`${slug}-${platform}`]: files }, { level: 6 });
  return new Blob([zipped.buffer as ArrayBuffer], { type: "application/zip" });
}
