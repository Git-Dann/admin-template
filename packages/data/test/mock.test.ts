import { describe, expect, it } from "vitest";
import { createMockAdapters } from "../src/mock";

const today = new Date("2026-11-12T00:00:00Z");
const make = (flavour: "streaming" | "golf" = "streaming") =>
  createMockAdapters({ flavour, today, roleIds: ["owner", "admin", "creator", "viewer"], ownerRoleId: "creator", behaviour: { latency: [0, 0] } });
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("mock adapters", () => {
  it("is deterministic for the same seed", async () => {
    const [a, b] = [make(), make()];
    expect(await a.users.list({ page: 0, pageSize: 5 })).toEqual(await b.users.list({ page: 0, pageSize: 5 }));
  });

  it("revenue reconciles: months, platforms and countries all equal the total", async () => {
    const report = await make().reports.getRevenue({ from: "2025-12-01", to: "2026-11-30" });
    expect(report.months).toHaveLength(12);
    expect(sum(report.months.map((m) => m.revenue))).toBe(report.total);
    expect(sum(report.byPlatform.map((p) => p.revenue))).toBe(report.total);
    expect(sum(report.byCountry.map((c) => c.revenue))).toBe(report.total);
    for (const m of report.months) expect(sum(Object.values(m.byPlatform))).toBe(m.revenue);
    expect(report.previousTotal).toBeGreaterThan(0);
  });

  it("collection plays reconcile with monthly plays and items", async () => {
    const mock = make("golf");
    const list = await mock.content.listCollections({ page: 0, pageSize: 50 });
    expect(list.items[0]!.kind).toBe("Group");
    const detail = await mock.content.getCollection(list.items[0]!.id);
    expect(sum(detail.playsByMonth.map((m) => m.plays))).toBe(detail.plays);
    expect(sum(detail.items.map((i) => i.plays))).toBe(detail.plays);
  });

  it("filters, searches, sorts and paginates users", async () => {
    const users = make().users;
    const page = await users.list({ page: 0, pageSize: 10, filters: { status: ["suspended"] }, sort: { id: "name", desc: false } });
    expect(page.items.every((u) => u.status === "suspended")).toBe(true);
    const names = page.items.map((u) => u.name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    const facets = await users.facets();
    expect(sum(facets.status.map((f) => f.count))).toBe(240);
  });

  it("gives own-scope users real resources to own", async () => {
    const mock = make();
    const session = await mock.auth.switchRole!("creator");
    const me = await mock.users.get(session.user.id);
    expect(me.owns?.length).toBeGreaterThan(0);
  });

  it("models native icons honestly via app builds", async () => {
    const mock = make();
    const [themes, builds] = await Promise.all([mock.themes.list(), mock.themes.listBuilds()]);
    const draft = themes.find((t) => t.status === "draft")!;
    const live = builds.find((b) => b.platform === "ios" && b.status === "live")!;
    expect(live.alternateIcons).not.toContain(draft.assets.appIcon.nativeIconKey);
  });

  it("can simulate failures and empty states", async () => {
    const failing = createMockAdapters({ today, behaviour: { latency: [0, 0], fail: ["reports"], empty: ["coupons"] } });
    await expect(failing.reports.getRevenue({ from: "2026-01-01", to: "2026-02-01" })).rejects.toThrow(/mock failure/);
    expect(await failing.coupons.listCoupons()).toEqual([]);
  });
});
