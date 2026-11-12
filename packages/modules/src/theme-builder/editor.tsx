"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import themesJson from "@gitwork/tokens/themes.json";
import type { ResolvedTheme } from "@gitwork/tokens";
import { PLATFORM_LABELS, PLATFORMS, type AppBuild, type AssetRef, type Platform, type SeasonalTheme } from "@gitwork/data";
import { moduleHref, PageHeader, useAdapter, useAdminConfig, useCan, type ModuleRouteProps } from "@gitwork/admin-shell";
import {
  Button,
  Callout,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  ErrorState,
  Field,
  FileDropzone,
  Icon,
  Input,
  Select,
  Skeleton,
  StatusPill,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
  ToggleRow,
  type FileStatus,
  type FileValidator,
  type UploadedFile,
} from "@gitwork/ui";
import { buildPack, packManifest, type PackContext, type PackPlatform } from "./export";
import { applyOverrides, checkImageSize, iconRelease, IMAGE_RULES, importColourTokens, publishBlockers, seasonalContrast, slugify, validateLottie, type ImageRule } from "./logic";
import { ThemePreview } from "./preview";
import { downloadBlob } from "../shared";

const allThemes = themesJson as ResolvedTheme[];
const orBlack = (v: string | undefined) => v ?? "#000000";

const blank = (): SeasonalTheme => ({
  id: "",
  name: "",
  status: "draft",
  audienceId: "all",
  platforms: ["ios", "android", "web"],
  assets: {
    splash: { enabled: false },
    appIcon: { enabled: false },
    background: { enabled: false },
    colours: { enabled: false },
  },
  updatedAt: new Date().toISOString(),
});

/* -------------------------------- validators -------------------------------- */

function imageValidator(rule: ImageRule): FileValidator {
  return (file) =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve(checkImageSize(img.naturalWidth, img.naturalHeight, rule));
        URL.revokeObjectURL(url);
      };
      img.onerror = () => resolve({ error: "That image couldn't be read." });
      img.src = url;
    });
}

const lottieValidator: FileValidator = async (file) => {
  try {
    return validateLottie(JSON.parse(await file.text()));
  } catch {
    return { error: "That file isn't valid JSON." };
  }
};

/* ------------------------------- asset slots ------------------------------- */

function AssetSlot({
  label,
  hint,
  value,
  onChange,
  accept,
  validate,
  maxSize,
  disabled,
}: {
  label: string;
  hint: string;
  value?: AssetRef;
  onChange: (asset: AssetRef | undefined) => void;
  accept: string;
  validate?: FileValidator;
  maxSize?: number;
  disabled?: boolean;
}) {
  const adapter = useAdapter("themes");
  const [uploading, setUploading] = useState(false);
  const handle = async (file: UploadedFile | null, status: FileStatus) => {
    if (!file) return onChange(undefined);
    if (status.state !== "valid" || !file.file) return;
    setUploading(true);
    try {
      const ref = await adapter.uploadAsset(file.file);
      onChange({ ...ref, meta: file.meta });
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setUploading(false);
    }
  };
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-text">{label}</p>
      <FileDropzone value={value ?? null} onChange={(f, s) => void handle(f, s)} accept={accept} validate={validate} maxSize={maxSize} hint={hint} disabled={disabled || uploading} />
    </div>
  );
}

function ReleaseStatus({ platform, keyName, builds }: { platform: "ios" | "android"; keyName?: string; builds: AppBuild[] }) {
  const status = iconRelease(keyName, platform, builds);
  const name = PLATFORM_LABELS[platform];
  if (status.state === "shipped") return <li className="flex items-center gap-2"><StatusPill status="live" label={`In ${name} ${status.build.version}`} /> <span className="text-text-muted">Can switch now</span></li>;
  if (status.state === "in-review") return <li className="flex items-center gap-2"><StatusPill status="pending" label={`In ${name} ${status.build.version}`} /> <span className="text-text-muted">Works once that build is out ({status.build.status})</span></li>;
  return <li className="flex items-center gap-2"><StatusPill status="requires release" label="Requires release" /> <span className="text-text-muted">Not in any {name} build yet</span></li>;
}

/* --------------------------------- export --------------------------------- */

function ExportPanel({ ctx }: { ctx: PackContext }) {
  const [busy, setBusy] = useState<PackPlatform | null>(null);
  const download = async (platform: PackPlatform) => {
    setBusy(platform);
    try {
      downloadBlob(await buildPack(platform, ctx), `${slugify(ctx.theme.name) || "theme"}-${platform}.zip`);
      toast.success(`${platform === "ios" ? "iOS" : platform === "android" ? "Android" : "Web"} pack downloaded`);
    } catch (error) {
      toast.error(`Export failed: ${(error as Error).message}`);
    } finally {
      setBusy(null);
    }
  };
  const platforms: PackPlatform[] = ["web", "ios", "android"];
  return (
    <Card>
      <CardHeader title="Export assets" description="Download a ready-to-ship pack per platform." />
      <CardBody>
        <Tabs defaultValue="web">
          <TabsList className="mb-4 w-full">
            {platforms.map((p) => (
              <TabsTrigger key={p} value={p} className="flex-1">{p === "web" ? "Web" : PLATFORM_LABELS[p]}</TabsTrigger>
            ))}
          </TabsList>
          {platforms.map((p) => {
            const files = packManifest(p, ctx);
            return (
              <TabsContent key={p} value={p} className="space-y-4">
                <ul className="space-y-2 text-sm">
                  {files.map((f) => (
                    <li key={f.path} className="flex items-start gap-2">
                      <Icon name={f.ready ? "success" : "minus"} size="sm" className={f.ready ? "mt-0.5 text-success" : "mt-0.5 text-text-muted"} />
                      <span className="min-w-0">
                        <code className="block truncate text-xs text-text">{f.path}</code>
                        <span className="text-xs text-text-muted">{f.description}{f.ready ? "" : " · not set"}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {p !== "web" && ctx.theme.assets.appIcon.enabled && (
                  <ul className="space-y-1 text-xs"><ReleaseStatus platform={p} keyName={ctx.theme.assets.appIcon.nativeIconKey} builds={ctx.builds} /></ul>
                )}
                <Button block variant="secondary" icon="download" loading={busy === p} onClick={() => void download(p)}>
                  Download {p === "web" ? "Web" : PLATFORM_LABELS[p]} pack (.zip)
                </Button>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardBody>
    </Card>
  );
}

/* --------------------------------- editor --------------------------------- */

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <CardBody className="grid gap-4">{children}</CardBody>
    </Card>
  );
}

const toLocalInput = (iso?: string) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : undefined);

function Editor({ initial, builds, basePath }: { initial: SeasonalTheme; builds: AppBuild[]; basePath: string }) {
  const adapter = useAdapter("themes");
  const notifications = useAdapter("notifications");
  const config = useAdminConfig();
  const router = useRouter();
  const client = useQueryClient();
  const canManage = useCan("themes.manage");
  const canPublish = useCan("themes.publish");
  const [draft, setDraft] = useState<SeasonalTheme>(initial);
  const [publishOpen, setPublishOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [colourNotes, setColourNotes] = useState<string[]>([]);
  const audiences = useQuery({ queryKey: ["notifications", "audiences"], queryFn: () => notifications.audiences() });

  const base = allThemes.find((t) => t.id === config.brand.theme) ?? allThemes[0]!;
  const assets = draft.assets;
  const set = (patch: Partial<SeasonalTheme>) => setDraft((d) => ({ ...d, ...patch }));
  const setAsset = <K extends keyof SeasonalTheme["assets"]>(key: K, patch: Partial<SeasonalTheme["assets"][K]>) =>
    setDraft((d) => ({ ...d, assets: { ...d.assets, [key]: { ...d.assets[key], ...patch } } }));

  const blockers = publishBlockers(draft);
  const contrast = useMemo(() => (assets.colours.enabled ? seasonalContrast(base, assets.colours.tokens) : []), [base, assets.colours]);
  const knownKeys = [...new Set(builds.flatMap((b) => b.alternateIcons))];
  const merged = applyOverrides(base, assets.colours.enabled ? assets.colours.tokens : undefined).values[base.modes.default] ?? {};
  const ctx: PackContext = {
    theme: draft,
    clientTheme: base.id,
    productName: config.brand.productName,
    logo: config.brand.logo,
    accent: orBlack(merged["color.accent"]),
    background: orBlack(merged["color.bg"]),
    builds,
  };

  const save = useMutation({
    mutationFn: (status?: SeasonalTheme["status"]) => adapter.save({ ...draft, id: draft.id || undefined, status }),
    onSuccess: (saved) => {
      void client.invalidateQueries({ queryKey: ["themes"] });
      setDraft(saved);
      toast.success("Theme saved");
      if (!initial.id) router.replace(moduleHref({ basePath }, ":id", { id: saved.id }));
    },
  });
  const publish = useMutation({
    mutationFn: async () => adapter.publish((await adapter.save({ ...draft, id: draft.id || undefined })).id),
    onSuccess: (t) => {
      void client.invalidateQueries({ queryKey: ["themes"] });
      setDraft(t);
      setPublishOpen(false);
      toast.success(t.status === "live" ? `${t.name} is live` : `${t.name} is scheduled`);
    },
  });
  const remove = useMutation({
    mutationFn: () => adapter.remove(draft.id),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["themes"] });
      toast.success("Theme deleted");
      router.push(basePath);
    },
  });

  const readOnly = !canManage;
  return (
    <>
      <PageHeader
        title={draft.name || "New theme"}
        subtitle={draft.id ? `Seasonal theme · ${draft.status}` : "Seasonal theme"}
        back={{ href: basePath, label: "All themes" }}
        actions={
          canManage && (
            <>
              {draft.id && (
                <ConfirmDialog
                  open={deleteOpen}
                  onOpenChange={setDeleteOpen}
                  tone="danger"
                  title={`Delete ${draft.name}?`}
                  description="The theme and its uploaded assets are removed. This can't be undone."
                  confirmLabel="Delete theme"
                  loading={remove.isPending}
                  onConfirm={() => remove.mutate()}
                  trigger={<Button variant="ghost" icon="trash">Delete</Button>}
                />
              )}
              <Button variant="secondary" loading={save.isPending} onClick={() => save.mutate(undefined)}>Save draft</Button>
              {canPublish && (
                <ConfirmDialog
                  open={publishOpen}
                  onOpenChange={setPublishOpen}
                  title={blockers.length ? "Not ready to publish" : `Publish ${draft.name}?`}
                  description={
                    blockers.length ? (
                      <ul className="list-disc space-y-1 pl-5">{blockers.map((b) => <li key={b}>{b}</li>)}</ul>
                    ) : draft.startsAt && new Date(draft.startsAt) > new Date() ? (
                      "It will go live automatically on its start date."
                    ) : (
                      "It goes live for the chosen audience straight away."
                    )
                  }
                  confirmLabel={blockers.length ? "OK" : "Publish"}
                  loading={publish.isPending}
                  onConfirm={() => (blockers.length ? setPublishOpen(false) : publish.mutate())}
                  trigger={<Button icon="sparkles">Publish</Button>}
                />
              )}
            </>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <Section title="Details">
            <Field label="Name" required>
              {(a11y) => <Input {...a11y} value={draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="Christmas 2026" disabled={readOnly} />}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts">{(a11y) => <Input {...a11y} type="datetime-local" value={toLocalInput(draft.startsAt)} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) })} disabled={readOnly} />}</Field>
              <Field label="Ends" error={draft.startsAt && draft.endsAt && draft.endsAt <= draft.startsAt ? "Must be after the start" : undefined}>
                {(a11y) => <Input {...a11y} type="datetime-local" value={toLocalInput(draft.endsAt)} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })} disabled={readOnly} />}
              </Field>
            </div>
            <Field label="Audience">
              {(a11y) => (
                <Select id={a11y.id} value={draft.audienceId} onValueChange={(v) => set({ audienceId: v })} disabled={readOnly} options={(audiences.data ?? [{ id: "all", label: "Everyone", size: 0 }]).map((a) => ({ value: a.id, label: a.label }))} />
              )}
            </Field>
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-text">Platforms</legend>
              <div className="flex flex-wrap gap-6">
                {PLATFORMS.map((p: Platform) => (
                  <label key={p} className="flex items-center gap-2 text-sm text-text">
                    <Checkbox disabled={readOnly} checked={draft.platforms.includes(p)} onCheckedChange={(on) => set({ platforms: on ? [...draft.platforms, p] : draft.platforms.filter((x) => x !== p) })} />
                    {PLATFORM_LABELS[p]}
                  </label>
                ))}
              </div>
            </fieldset>
          </Section>

          <section className="space-y-3" aria-labelledby="slots">
            <h2 id="slots" className="text-lg font-semibold text-text">Assets</h2>
            <ToggleRow icon="sparkles" title="Splash" description="Lottie animation with a still fallback for older devices" checked={assets.splash.enabled} disabled={readOnly} onCheckedChange={(enabled) => setAsset("splash", { enabled })}>
              <div className="grid gap-4 md:grid-cols-2">
                <AssetSlot label="Animation (Lottie JSON)" hint="Up to 2 MB, 5 seconds or less" accept=".json,application/json" maxSize={2 * 1024 * 1024} validate={lottieValidator} value={assets.splash.lottie} onChange={(lottie) => setAsset("splash", { lottie })} disabled={readOnly} />
                <AssetSlot label="Fallback image" hint={IMAGE_RULES.splashFallback.label} accept="image/png,image/webp,image/jpeg,image/svg+xml" validate={imageValidator(IMAGE_RULES.splashFallback)} value={assets.splash.fallback} onChange={(fallback) => setAsset("splash", { fallback })} disabled={readOnly} />
              </div>
            </ToggleRow>

            <ToggleRow icon="app" title="App icon" description="Alternate icon for iOS and Android, favicon and PWA icons for web" checked={assets.appIcon.enabled} disabled={readOnly} onCheckedChange={(enabled) => setAsset("appIcon", { enabled })}>
              <div className="grid gap-4 md:grid-cols-2">
                <AssetSlot label="Icon artwork" hint={IMAGE_RULES.appIcon.label} accept="image/png,image/svg+xml" validate={imageValidator(IMAGE_RULES.appIcon)} value={assets.appIcon.icon} onChange={(icon) => setAsset("appIcon", { icon })} disabled={readOnly} />
                <div className="space-y-3">
                  <Field label="Native icon key" description={knownKeys.length ? `Keys in app builds: ${knownKeys.join(", ")}` : undefined}>
                    {(a11y) => <Input {...a11y} value={assets.appIcon.nativeIconKey ?? ""} placeholder={slugify(draft.name) || "christmas"} onChange={(e) => setAsset("appIcon", { nativeIconKey: e.target.value.trim() || undefined })} disabled={readOnly} />}
                  </Field>
                  <ul className="space-y-2 text-xs">
                    {(["ios", "android"] as const).filter((p) => draft.platforms.includes(p)).map((p) => <ReleaseStatus key={p} platform={p} keyName={assets.appIcon.nativeIconKey} builds={builds} />)}
                  </ul>
                </div>
              </div>
              <Callout className="mt-4" tone={(["ios", "android"] as const).some((p) => draft.platforms.includes(p) && iconRelease(assets.appIcon.nativeIconKey, p, builds).state === "requires-release") ? "warning" : "info"}>
                Native alternate icons must be compiled into the app, so a new icon needs an app release before the theme starts. Web icons update immediately.
              </Callout>
            </ToggleRow>

            <ToggleRow icon="image" title="Background" description="Home screen background for mobile and desktop or web" checked={assets.background.enabled} disabled={readOnly} onCheckedChange={(enabled) => setAsset("background", { enabled })}>
              <div className="grid gap-4 md:grid-cols-2">
                <AssetSlot label="Mobile" hint={IMAGE_RULES.backgroundMobile.label} accept="image/png,image/webp,image/jpeg,image/svg+xml" validate={imageValidator(IMAGE_RULES.backgroundMobile)} value={assets.background.mobile} onChange={(mobile) => setAsset("background", { mobile })} disabled={readOnly} />
                <AssetSlot label="Desktop and web" hint={IMAGE_RULES.backgroundDesktop.label} accept="image/png,image/webp,image/jpeg,image/svg+xml" validate={imageValidator(IMAGE_RULES.backgroundDesktop)} value={assets.background.desktop} onChange={(desktop) => setAsset("background", { desktop })} disabled={readOnly} />
              </div>
            </ToggleRow>

            <ToggleRow icon="theme" title="Colour tokens" description="Override brand colours for the season. Import a tokens or Figma Variables JSON." checked={assets.colours.enabled} disabled={readOnly} onCheckedChange={(enabled) => setAsset("colours", { enabled })}>
              <div className="space-y-4">
                <FileDropzone
                  value={null}
                  accept=".json,application/json"
                  hint="Gitwork theme file, Figma Variables export, or { accent: '#C8102E' }"
                  label="Import tokens JSON"
                  disabled={readOnly}
                  validate={async (file) => {
                    try {
                      const result = importColourTokens(JSON.parse(await file.text()));
                      if (!Object.keys(result.tokens).length) return { error: "No semantic colour tokens found in that file." };
                      setAsset("colours", { tokens: { ...assets.colours.tokens, ...result.tokens } });
                      setColourNotes(result.ignored);
                      toast.success(`Imported ${Object.keys(result.tokens).length} colours (${result.source})`);
                    } catch (error) {
                      return { error: (error as Error).message };
                    }
                  }}
                  onChange={() => {}}
                />
                {colourNotes.length > 0 && <Callout tone="info" title="Some entries were skipped">{colourNotes.slice(0, 8).join(", ")}{colourNotes.length > 8 ? ` and ${colourNotes.length - 8} more` : ""}</Callout>}
                {Object.keys(assets.colours.tokens ?? {}).length > 0 && (
                  <div className="overflow-hidden rounded-md border border-border">
                    <table className="w-full text-sm">
                      <caption className="sr-only">Colour overrides</caption>
                      <thead className="bg-surface-raised text-xs uppercase tracking-wide text-text-muted">
                        <tr><th scope="col" className="px-3 py-2 text-left">Token</th>{base.modes.supported.map((m) => <th key={m} scope="col" className="px-3 py-2 text-left">{m}</th>)}<th className="w-10"><span className="sr-only">Remove</span></th></tr>
                      </thead>
                      <tbody>
                        {Object.entries(assets.colours.tokens ?? {}).map(([name, v]) => (
                          <tr key={name} className="border-t border-border">
                            <td className="px-3 py-2 font-mono text-xs">{name}</td>
                            {base.modes.supported.map((m) => {
                              const value = typeof v === "string" ? v : v[m];
                              return (
                                <td key={m} className="px-3 py-2">
                                  {value ? <span className="flex items-center gap-2 font-mono text-xs"><span className="size-5 rounded-sm border border-border" style={{ background: value }} />{value}</span> : <span className="text-xs text-text-muted">base</span>}
                                </td>
                              );
                            })}
                            <td className="px-1">
                              {!readOnly && <Button variant="ghost" size="icon-sm" icon="close" aria-label={`Remove ${name}`} onClick={() => { const { [name]: _drop, ...rest } = assets.colours.tokens ?? {}; setAsset("colours", { tokens: rest }); }} />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {contrast.length > 0 ? (
                  <Callout tone="warning" title={`${contrast.length} contrast issue${contrast.length > 1 ? "s" : ""}`}>
                    <ul className="mt-1 space-y-0.5">{contrast.slice(0, 6).map((r) => <li key={`${r.mode}${r.fg}${r.bg}`}>[{r.mode}] {r.fg} on {r.bg}: {r.ratio.toFixed(2)}:1, needs {r.min}:1 ({r.why})</li>)}</ul>
                  </Callout>
                ) : Object.keys(assets.colours.tokens ?? {}).length > 0 ? (
                  <Callout tone="success">All colour pairs meet WCAG AA.</Callout>
                ) : null}
              </div>
            </ToggleRow>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-24 xl:self-start">
          <Card>
            <CardHeader title="Live preview" />
            <CardBody>
              <ThemePreview theme={draft} clientTheme={base.id} modes={base.modes.supported} productName={config.brand.productName} logo={config.brand.logo} />
            </CardBody>
          </Card>
          <ExportPanel ctx={ctx} />
        </aside>
      </div>
    </>
  );
}

export function ThemeEditor({ params, basePath }: ModuleRouteProps & { basePath: string }) {
  const adapter = useAdapter("themes");
  const isNew = !params.id;
  const theme = useQuery({ queryKey: ["themes", "detail", params.id], queryFn: () => adapter.get(params.id!), enabled: !isNew });
  const builds = useQuery({ queryKey: ["themes", "builds"], queryFn: () => adapter.listBuilds() });
  const back = { href: basePath, label: "All themes" };

  if (theme.isError || builds.isError) {
    return (
      <>
        <PageHeader title="Theme" back={back} />
        <ErrorState error={theme.error ?? builds.error} onRetry={() => { void theme.refetch(); void builds.refetch(); }} />
      </>
    );
  }
  if ((!isNew && !theme.data) || !builds.data) {
    return (
      <>
        <PageHeader title="Loading…" back={back} />
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]"><Skeleton className="h-[600px]" /><Skeleton className="h-[600px]" /></div>
      </>
    );
  }
  return <Editor key={theme.data?.id ?? "new"} initial={theme.data ?? blank()} builds={builds.data} basePath={basePath} />;
}
