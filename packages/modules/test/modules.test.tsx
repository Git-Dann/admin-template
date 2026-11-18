import { describe, expect, it } from "vitest";
import { createMockAdapters } from "@gitwork/data/mock";
import { couponValue } from "../src/coupons";
import { reportToCsv } from "../src/reports";
import { dashboard, users, rbac, reports, coupons, content, notifications, themeBuilder } from "../src";
import { validateConfig, type AdminConfig } from "@gitwork/admin-shell";

describe("reports CSV", () => {
  it("has a totals row that reconciles", async () => {
    const mock = createMockAdapters({ today: new Date("2026-11-12"), behaviour: { latency: [0, 0] } });
    const report = await mock.reports.getRevenue({ from: "2026-06-01", to: "2026-11-30" });
    const lines = reportToCsv(report).split("\r\n");
    expect(lines[0]).toBe("Month,iOS,Android,Web,Refunds,Revenue");
    expect(lines).toHaveLength(report.months.length + 2);
    const totals = lines.at(-1)!.split(",").map(Number);
    expect(totals[1]! + totals[2]! + totals[3]!).toBe(report.total);
    expect(totals[5]).toBe(report.total);
  });
});

describe("coupons", () => {
  it("labels offers in plain English", () => {
    expect(couponValue({ kind: "percent", amount: 40 })).toBe("40% off");
    expect(couponValue({ kind: "fixed", amount: 5 })).toBe("£5 off");
    expect(couponValue({ kind: "trial", amount: 30 })).toBe("1 month free");
    expect(couponValue({ kind: "trial", amount: 14 })).toBe("14 days free");
  });
});

describe("module registry", () => {
  it("every module validates against a full mock config with unique permissions", () => {
    const modules = [dashboard(), users(), rbac(), reports(), coupons(), content(), notifications(), themeBuilder()];
    const config = { brand: { productName: "T", theme: "gitwork" }, modules, roles: [{ id: "owner", label: "Owner", permissions: ["*"] }], adapters: createMockAdapters() } as AdminConfig;
    expect(validateConfig(config)).toEqual([]);
    const ids = modules.flatMap((m) => (m.permissions ?? []).map((p) => p.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(modules.map((m) => m.basePath)).size).toBe(modules.length);
  });
});
