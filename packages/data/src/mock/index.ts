/**
 * Offline mock adapters with realistic, reconciled seed data.
 *
 *   import { createMockAdapters } from "@gitwork/data/mock";
 *   const mock = createMockAdapters({ flavour: "streaming", roleIds: ["owner", "admin", "editor", "viewer"] });
 *   adapters: { ...mock, reports: myRealReportsAdapter }
 *
 * Review states from the URL: ?mock-fail=reports  ?mock-empty=coupons  ?mock-latency=0
 */
import type {
  Adapters,
  AdminUser,
  AppBuild,
  AssetRef,
  Audience,
  Collection,
  CollectionDetail,
  ContentItem,
  Coupon,
  InboxItem,
  MonthRevenue,
  Platform,
  PushNotification,
  RevenueReport,
  RoleDefinition,
  SeasonalTheme,
  Session,
  StaffCode,
  UserRecord,
} from "../types";
import { COUNTRIES, FIRST, flavourOf, LAST, type Flavour } from "./seed";
import { addDays, addMonths, allocate, artwork, id, isoMonth, makeRunner, query, reconcile, rng, urlBehaviour, type MockBehaviour } from "./util";

export interface MockOptions {
  flavour?: Flavour;
  /** Role IDs from admin.config.ts, most powerful first. Users are spread across them. */
  roleIds?: string[];
  /** Role ID whose users own content (for "own scope" demos), e.g. "creator". */
  ownerRoleId?: string;
  /** Default roles for the RBAC adapter. Usually the same as config.roles. */
  roles?: RoleDefinition[];
  seed?: number;
  behaviour?: Partial<MockBehaviour>;
  /** "Today" for the seed data. Defaults to now. */
  today?: Date;
}

export function createMockAdapters(options: MockOptions = {}): Adapters {
  const flavour = flavourOf(options.flavour ?? "streaming");
  const roleIds = options.roleIds ?? ["owner", "admin", "editor", "viewer"];
  const ownerRoleId = options.ownerRoleId ?? roleIds[2] ?? roleIds.at(-1)!;
  const r = rng(options.seed ?? 42);
  const now = options.today ?? new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const baseBehaviour: MockBehaviour = { latency: [120, 420], fail: [], empty: [], ...options.behaviour };
  const behaviour = () => urlBehaviour(baseBehaviour);
  const runner = (key: keyof Adapters) => makeRunner(key, behaviour);

  /* ------------------------------- users ------------------------------- */

  const platforms: Platform[] = ["ios", "android", "web"];
  const users: UserRecord[] = Array.from({ length: 240 }, (_, i) => {
    const first = r.pick(FIRST);
    const last = r.pick(LAST);
    const roleWeights = roleIds.map((rid, idx) => [rid, idx === 0 ? 1 : idx === roleIds.length - 1 ? 40 : 6] as const);
    const roleId = i === 0 ? roleIds[0]! : r.weighted(roleWeights);
    const created = addDays(today, -r.int(1, 720));
    return {
      id: id("usr", i + 1),
      name: `${first} ${last}`,
      email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + `${i > 30 ? i : ""}@example.com`,
      roleId,
      status: r.weighted([["active", 86], ["invited", 8], ["suspended", 6]] as const),
      createdAt: created.toISOString(),
      lastActiveAt: addDays(today, -r.int(0, 60)).toISOString(),
      platform: r.weighted([["ios", 52], ["android", 31], ["web", 17]] as const),
      country: r.weighted(COUNTRIES.map((c) => [c.code, c.weight] as const)),
      plan: r.pick(flavour.plans),
      spend: Math.round(r.next() * 420 * 100) / 100,
      owns: [],
    };
  });
  const owners = users.filter((u) => u.roleId === ownerRoleId);

  /* ------------------------------- content ------------------------------- */

  const collections: CollectionDetail[] = flavour.collections.map((title, i) => {
    const itemCount = r.int(4, 14);
    const items: ContentItem[] = Array.from({ length: itemCount }, (_, n) => {
      const published = addDays(today, -r.int(3, 400));
      return {
        id: id(`itm${i}`, n + 1),
        number: n + 1,
        title: `${flavour.itemNoun} ${n + 1}`,
        durationSeconds: r.int(14, 58) * 60,
        plays: Math.round(r.int(2000, 90000) * (1 - n * 0.04)),
        completionRate: Math.round((0.45 + r.next() * 0.45) * 100) / 100,
        status: n === itemCount - 1 && r.chance(0.3) ? "scheduled" : "published",
        publishedAt: published.toISOString(),
      };
    });
    const plays = items.reduce((s, it) => s + it.plays, 0);
    const monthWeights = Array.from({ length: 12 }, (_, m) => 0.6 + m * 0.08 + r.next() * 0.3);
    const monthPlays = allocate(plays, monthWeights);
    const owner = owners.length ? owners[i % owners.length]! : undefined;
    const collId = id("col", i + 1);
    owner?.owns?.push(collId);
    return {
      id: collId,
      title,
      kind: flavour.collectionKind,
      status: i === 10 ? "draft" : i === 11 ? "archived" : i === 9 ? "scheduled" : "published",
      itemCount,
      plays,
      artwork: artwork(i + 3, title),
      tags: [r.pick(flavour.tags), r.pick(flavour.tags)].filter((t, k, a) => a.indexOf(t) === k),
      ownerId: owner?.id,
      updatedAt: addDays(today, -r.int(0, 50)).toISOString(),
      description: `${title} is one of our most popular ${flavour.collectionKind.toLowerCase()}s.`,
      items,
      playsByMonth: monthPlays.map((p, m) => ({ month: isoMonth(addMonths(today, m - 11)), plays: p })),
    };
  });
  for (const c of collections) reconcile(`plays for ${c.title}`, c.plays, c.playsByMonth.map((m) => m.plays));

  /* ------------------------------- revenue ------------------------------- */

  const months: Array<MonthRevenue & { byCountry: number[] }> = Array.from({ length: 24 }, (_, m) => {
    const date = addMonths(today, m - 23);
    const seasonal = [0.92, 0.88, 0.95, 0.97, 1, 1.02, 1.04, 1.12, 1.03, 1.05, 1.18, 1.32][date.getUTCMonth()]!;
    const revenue = Math.round(flavour.revenueBase * (1 + m * 0.035) * seasonal * (0.95 + r.next() * 0.1));
    const [ios, android, web] = allocate(revenue, [52 + r.next() * 4, 31 + r.next() * 3, 17]);
    return {
      month: isoMonth(date),
      revenue,
      byPlatform: { ios: ios!, android: android!, web: web! },
      refunds: Math.round(revenue * (0.01 + r.next() * 0.015)),
      newSubscribers: Math.round(revenue / 9 + r.int(-60, 60)),
      byCountry: allocate(revenue, COUNTRIES.map((c) => c.weight * (0.9 + r.next() * 0.2))),
    };
  });

  function revenueFor(from: string, to: string): RevenueReport {
    const inRange = months.filter((m) => m.month >= from.slice(0, 7) && m.month <= to.slice(0, 7));
    const total = inRange.reduce((s, m) => s + m.revenue, 0);
    const span = inRange.length;
    const firstIdx = months.indexOf(inRange[0]!);
    const previous = months.slice(Math.max(0, firstIdx - span), firstIdx);
    const byPlatform = platforms.map((p) => ({ platform: p, revenue: inRange.reduce((s, m) => s + m.byPlatform[p], 0) }));
    const byCountry = COUNTRIES.map((c, i) => ({ code: c.code, country: c.country, revenue: inRange.reduce((s, m) => s + m.byCountry[i]!, 0) }));
    reconcile("revenue by month", total, inRange.map((m) => m.revenue));
    reconcile("revenue by platform", total, byPlatform.map((p) => p.revenue));
    reconcile("revenue by country", total, byCountry.map((c) => c.revenue));
    return {
      currency: "GBP",
      range: { from, to },
      total,
      previousTotal: previous.reduce((s, m) => s + m.revenue, 0),
      months: inRange.map(({ byCountry: _c, ...m }) => m),
      byPlatform,
      byCountry: byCountry.sort((a, b) => b.revenue - a.revenue),
    };
  }

  /* ------------------------------- coupons ------------------------------- */

  const couponSeeds: Array<[string, Coupon["kind"], number, Coupon["status"], number, number, number | undefined]> = [
    ["Black Friday", "percent", 40, "live", -6, 20, 5000],
    ["Creator referral", "trial", 30, "live", -90, 120, 1000],
    ["Christmas gift", "fixed", 10, "scheduled", 19, 45, 2000],
    ["Win-back", "percent", 50, "paused", -30, 60, undefined],
    ["Student", "percent", 25, "live", -200, 200, undefined],
    ["Spring launch", "percent", 20, "ended", -240, -200, 3000],
    ["Influencer: JayTee", "trial", 14, "draft", 10, 40, 500],
  ];
  const coupons: Coupon[] = couponSeeds.map(([title, kind, amount, status, s, e, limit], i) => ({
    id: id("cpn", i + 1),
    title,
    code: title.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8) + (kind === "percent" ? amount : ""),
    kind,
    amount,
    status,
    startsAt: addDays(today, s).toISOString(),
    endsAt: addDays(today, e).toISOString(),
    redemptions: status === "scheduled" || status === "draft" ? 0 : Math.min(limit ?? 99999, r.int(40, 2400)),
    limit,
    audience: r.pick(["Everyone", "New subscribers", "Lapsed subscribers"]),
    platforms: status === "draft" ? ["ios"] : ["ios", "android", "web"],
  }));
  let couponSeq = coupons.length;

  const staffCodes: StaffCode[] = users
    .filter((u) => u.roleId !== roleIds.at(-1))
    .slice(0, 34)
    .map((u, i) => ({
      id: id("stf", i + 1),
      code: `STAFF-${u.name.split(" ")[0]!.toUpperCase().slice(0, 5)}${r.int(10, 99)}`,
      staffName: u.name,
      email: u.email,
      uses: r.int(0, 60),
      status: r.chance(0.85) ? "active" : "inactive",
      createdAt: addDays(today, -r.int(5, 400)).toISOString(),
    }));

  /* ---------------------------- notifications ---------------------------- */

  const audiences: Audience[] = [
    { id: "all", label: "Everyone", description: "All users with notifications on", size: 48210 },
    { id: "subscribers", label: `Paying ${flavour.metricNoun}`, description: "Active paid plans", size: 18342 },
    { id: "trial", label: "On a trial", description: "Trial started in the last 30 days", size: 2410 },
    { id: "lapsed", label: "Lapsed", description: "Cancelled in the last 90 days", size: 3906 },
  ];
  const pushTitles = ["New episode out now", "Live tonight at 8pm", "Your weekly highlights", "Last chance: 40% off", "We miss you", "Season finale tonight", "Tee times released", "Leaderboard update"];
  const notifications: PushNotification[] = Array.from({ length: 28 }, (_, i) => {
    const status: PushNotification["status"] = i < 2 ? "scheduled" : i === 2 ? "draft" : i === 7 ? "failed" : "sent";
    const when = status === "scheduled" ? addDays(today, i + 1) : addDays(today, -i * 3);
    const audience = r.pick(audiences);
    const delivered = status === "sent" ? Math.round(audience.size * (0.88 + r.next() * 0.1)) : undefined;
    return {
      id: id("ntf", i + 1),
      title: r.pick(pushTitles),
      body: "Tap to see what's new in the app.",
      audienceId: audience.id,
      platforms: r.chance(0.8) ? ["ios", "android"] : ["ios"],
      status,
      scheduledFor: when.toISOString(),
      sentAt: status === "sent" ? when.toISOString() : undefined,
      delivered,
      opened: delivered ? Math.round(delivered * (0.04 + r.next() * 0.12)) : undefined,
      createdBy: r.pick(users.slice(0, 12)).name,
    };
  });

  /* ----------------------------- theme builder ----------------------------- */

  const lottie = (w: number, h: number) =>
    `data:application/json;utf8,${encodeURIComponent(JSON.stringify({ v: "5.12.1", fr: 60, ip: 0, op: 180, w, h, nm: "splash", layers: [] }))}`;
  const asset = (name: string, type: string, url: string, size: number, meta?: string): AssetRef => ({ name, type, url, size, meta });
  const themes: SeasonalTheme[] = flavour.themes.map((t, i) => ({
    id: id("thm", i + 1),
    name: t.name,
    status: t.status,
    startsAt: addDays(today, t.start).toISOString(),
    endsAt: addDays(today, t.end).toISOString(),
    audienceId: "all",
    platforms: t.status === "draft" ? ["ios", "web"] : ["ios", "android", "web"],
    assets: {
      splash: { enabled: t.status !== "draft", lottie: asset(`splash-${t.key}.json`, "application/json", lottie(1080, 1920), 48_200, "Lottie · 1080×1920 · 3s"), fallback: asset(`splash-${t.key}.png`, "image/svg+xml", artwork(i + 20, "", [9, 16]), 210_000, "1080×1920") },
      appIcon: { enabled: t.status !== "ended" || i % 2 === 0, icon: asset(`icon-${t.key}.png`, "image/svg+xml", artwork(i + 40, "", [1, 1]), 96_000, "1024×1024"), nativeIconKey: t.key },
      background: { enabled: true, mobile: asset(`bg-${t.key}-mobile.png`, "image/svg+xml", artwork(i + 60, "", [9, 16]), 320_000, "1170×2532"), desktop: asset(`bg-${t.key}-desktop.png`, "image/svg+xml", artwork(i + 60, "", [16, 9]), 540_000, "2560×1440") },
      colours: { enabled: i % 2 === 0, tokens: i % 2 === 0 ? { accent: { light: `hsl(${(i * 70) % 360} 70% 38%)`, dark: `hsl(${(i * 70) % 360} 75% 60%)` } } : undefined },
    },
    updatedAt: addDays(today, -i * 4).toISOString(),
    updatedBy: users[i % 5]!.name,
  }));
  const builds: AppBuild[] = [
    { platform: "ios", version: "4.12.0", status: "live", alternateIcons: flavour.themes.filter((t) => t.status !== "draft").map((t) => t.key), releasedAt: addDays(today, -21).toISOString() },
    { platform: "ios", version: "4.13.0", status: "in review", alternateIcons: flavour.themes.map((t) => t.key) },
    { platform: "android", version: "4.12.1", status: "live", alternateIcons: flavour.themes.filter((t) => t.status === "live" || t.status === "ended").map((t) => t.key), releasedAt: addDays(today, -14).toISOString() },
  ];
  let themeSeq = themes.length;

  /* --------------------------------- auth --------------------------------- */

  const SESSION_KEY = "gw-mock-session";
  let memorySession: Session | null = null;
  const loadSession = (): Session | null => {
    if (typeof window === "undefined") return memorySession;
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return memorySession;
    }
  };
  const saveSession = (s: Session | null) => {
    memorySession = s;
    if (typeof window === "undefined") return;
    try {
      if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      /* storage blocked */
    }
  };
  const asAdmin = (u: UserRecord, roleId = u.roleId): AdminUser => ({ id: u.id, name: u.name, email: u.email, roleId });

  /* -------------------------------- inbox -------------------------------- */

  const inbox: InboxItem[] = [
    { id: "inb_1", title: `${themes[0]?.name ?? "Seasonal theme"} is live`, body: "Published to iOS, Android and Web.", href: "/themes", createdAt: addDays(today, -1).toISOString(), read: false, tone: "success" },
    { id: "inb_2", title: "Push notification failed", body: "“Live tonight at 8pm” didn't send to Android.", href: "/notifications", createdAt: addDays(today, -2).toISOString(), read: false, tone: "danger" },
    { id: "inb_3", title: "3 new admin invites accepted", href: "/users", createdAt: addDays(today, -4).toISOString(), read: true },
    { id: "inb_4", title: "October revenue report is ready", href: "/reports", createdAt: addDays(today, -11).toISOString(), read: true, tone: "info" },
  ];

  let roles = options.roles ? structuredClone(options.roles) : [];

  /* ------------------------------- adapters ------------------------------- */

  const run = {
    auth: runner("auth"),
    dashboard: runner("dashboard"),
    users: runner("users"),
    rbac: runner("rbac"),
    reports: runner("reports"),
    coupons: runner("coupons"),
    content: runner("content"),
    notifications: runner("notifications"),
    themes: runner("themes"),
    inbox: runner("inbox"),
  };

  const facet = <K extends keyof UserRecord>(field: K) => {
    const counts = new Map<string, number>();
    for (const u of users) counts.set(String(u[field]), (counts.get(String(u[field])) ?? 0) + 1);
    return [...counts].map(([value, count]) => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1), count }));
  };

  const findUser = (userId: string) => {
    const u = users.find((x) => x.id === userId);
    if (!u) throw new Error(`No user ${userId}`);
    return u;
  };

  return {
    auth: {
      getSession: () => run.auth(() => loadSession()),
      signIn: ({ email }) =>
        run.auth(() => {
          if (!email.includes("@")) throw new Error("Enter the email address you use for the admin.");
          const prefix = email.split("@")[0]!;
          const roleId = roleIds.includes(prefix) ? prefix : roleIds[0]!;
          const base = users.find((u) => u.roleId === roleId) ?? users[0]!;
          const session = { user: asAdmin(base, roleId) };
          saveSession(session);
          return session;
        }),
      signOut: () => run.auth(() => saveSession(null)),
      switchRole: (roleId) =>
        run.auth(() => {
          // Become a seeded user with that role, so "own scope" has real data to show.
          const base = users.find((u) => u.roleId === roleId) ?? users[0]!;
          const session = { user: asAdmin(base, roleId) };
          saveSession(session);
          return session;
        }),
    },

    dashboard: {
      getSummary: () =>
        run.dashboard(() => {
          const current = months.at(-1)!;
          const prior = months.at(-2)!;
          const lastYear = months.slice(-12);
          const active = users.filter((u) => u.status === "active").length * 76;
          const pct = (a: number, b: number) => Math.round(((a - b) / b) * 1000) / 10;
          const thisMonth = revenueFor(current.month, current.month);
          return {
            headline: { label: "Revenue this month", value: current.revenue, format: "currency", delta: pct(current.revenue, prior.revenue), caption: "vs last month" },
            kpis: [
              { label: `Active ${flavour.metricNoun}`, value: active, format: "number", delta: 3.4 },
              { label: `New ${flavour.metricNoun}`, value: current.newSubscribers, format: "number", delta: pct(current.newSubscribers, prior.newSubscribers) },
              { label: "Refunds", value: current.refunds, format: "currency", delta: pct(current.refunds, prior.refunds), upIsGood: false },
              { label: "Avg revenue per user", value: Math.round((current.revenue / active) * 100) / 100, format: "currency" },
            ],
            trend: {
              title: "Revenue, last 12 months",
              format: "currency",
              xKey: "month",
              series: [{ key: "revenue", label: "Revenue" }],
              points: lastYear.map((m) => ({ month: m.month, revenue: m.revenue })),
            },
            breakdown: {
              title: "This month by platform",
              format: "currency",
              items: thisMonth.byPlatform.map((p) => ({ label: { ios: "iOS", android: "Android", web: "Web" }[p.platform], value: p.revenue })),
            },
          };
        }),
    },

    users: {
      list: (params) => run.users(() => query(users, params, ["name", "email"]), () => ({ items: [], total: 0 })),
      get: (userId) => run.users(() => findUser(userId)),
      updateRole: (userId, roleId) =>
        run.users(() => {
          const u = findUser(userId);
          u.roleId = roleId;
          return u;
        }),
      setStatus: (userId, status) =>
        run.users(() => {
          const u = findUser(userId);
          u.status = status;
          return u;
        }),
      facets: () => run.users(() => ({ status: facet("status"), roleId: facet("roleId") })),
    },

    rbac: {
      listRoles: () => run.rbac(() => roles),
      saveRole: (role) =>
        run.rbac(() => {
          roles = roles.some((x) => x.id === role.id) ? roles.map((x) => (x.id === role.id ? role : x)) : [...roles, role];
          return role;
        }),
    },

    reports: {
      getRevenue: ({ from, to }) =>
        run.reports(
          () => revenueFor(from, to),
          () => ({ currency: "GBP" as const, range: { from, to }, total: 0, previousTotal: 0, months: [], byPlatform: [], byCountry: [] }),
        ),
    },

    coupons: {
      listCoupons: (filters) => run.coupons(() => (filters?.status?.length ? coupons.filter((c) => filters.status!.includes(c.status)) : coupons), () => []),
      createCoupon: (input) =>
        run.coupons(() => {
          const coupon: Coupon = { ...input, id: id("cpn", ++couponSeq), redemptions: 0, status: input.status ?? "draft" };
          coupons.unshift(coupon);
          return coupon;
        }),
      setCouponStatus: (couponId, status) =>
        run.coupons(() => {
          const c = coupons.find((x) => x.id === couponId);
          if (!c) throw new Error("Coupon not found");
          c.status = status;
          return c;
        }),
      listStaffCodes: (params) => run.coupons(() => query(staffCodes, params, ["code", "staffName", "email"]), () => ({ items: [], total: 0 })),
      createStaffCode: ({ staffName, email }) =>
        run.coupons(() => {
          const code: StaffCode = {
            id: id("stf", staffCodes.length + 1),
            code: `STAFF-${staffName.split(" ")[0]!.toUpperCase().slice(0, 5)}${Math.floor(Math.random() * 90 + 10)}`,
            staffName,
            email,
            uses: 0,
            status: "active",
            createdAt: new Date().toISOString(),
          };
          staffCodes.unshift(code);
          return code;
        }),
    },

    content: {
      listCollections: (params) =>
        run.content(
          () => {
            const page = query<CollectionDetail>(collections, params, ["title"]);
            return { total: page.total, items: page.items.map(({ items: _i, playsByMonth: _p, description: _d, ...c }) => c as Collection) };
          },
          () => ({ items: [], total: 0 }),
        ),
      getCollection: (collectionId) =>
        run.content(() => {
          const c = collections.find((x) => x.id === collectionId);
          if (!c) throw new Error("We couldn't find that collection.");
          return c;
        }),
    },

    notifications: {
      list: (params) => run.notifications(() => query(notifications, params, ["title", "body"]), () => ({ items: [], total: 0 })),
      audiences: () => run.notifications(() => audiences),
      create: ({ sendNow, ...input }) =>
        run.notifications(() => {
          const n: PushNotification = {
            ...input,
            id: id("ntf", notifications.length + 100),
            status: sendNow ? "sent" : input.scheduledFor ? "scheduled" : "draft",
            sentAt: sendNow ? new Date().toISOString() : undefined,
            delivered: sendNow ? audiences.find((a) => a.id === input.audienceId)?.size : undefined,
            opened: sendNow ? 0 : undefined,
          };
          notifications.unshift(n);
          return n;
        }),
      cancel: (notificationId) =>
        run.notifications(() => {
          const n = notifications.find((x) => x.id === notificationId);
          if (!n) throw new Error("Notification not found");
          n.status = "draft";
          return n;
        }),
    },

    themes: {
      list: () => run.themes(() => themes, () => []),
      get: (themeId) =>
        run.themes(() => {
          const t = themes.find((x) => x.id === themeId);
          if (!t) throw new Error("We couldn't find that theme.");
          return t;
        }),
      save: (input) =>
        run.themes(() => {
          const existing = input.id ? themes.find((t) => t.id === input.id) : undefined;
          const saved: SeasonalTheme = {
            ...input,
            id: existing?.id ?? id("thm", ++themeSeq),
            status: input.status ?? existing?.status ?? "draft",
            updatedAt: new Date().toISOString(),
          };
          if (existing) themes.splice(themes.indexOf(existing), 1, saved);
          else themes.unshift(saved);
          return saved;
        }),
      publish: (themeId) =>
        run.themes(() => {
          const t = themes.find((x) => x.id === themeId);
          if (!t) throw new Error("Theme not found");
          t.status = t.startsAt && new Date(t.startsAt) > new Date() ? "scheduled" : "live";
          t.updatedAt = new Date().toISOString();
          return t;
        }),
      remove: (themeId) =>
        run.themes(() => {
          const i = themes.findIndex((x) => x.id === themeId);
          if (i >= 0) themes.splice(i, 1);
        }),
      listBuilds: () => run.themes(() => builds),
      uploadAsset: async (file) => {
        const url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
        return run.themes(() => ({ name: file.name, size: file.size, type: file.type, url }));
      },
    },

    inbox: {
      list: () => run.inbox(() => inbox, () => []),
      markAllRead: () =>
        run.inbox(() => {
          for (const item of inbox) item.read = true;
        }),
    },
  };
}

export { allocate, artwork, rng } from "./util";
export type { MockBehaviour } from "./util";
export type { Flavour } from "./seed";
