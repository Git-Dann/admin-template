import type { AdminModule } from "@gitwork/admin-shell";
import { CouponsPage } from "./page";
export { couponValue } from "./page";

/** Promo codes as ticket cards, plus a staff codes table. */
export function coupons(options: { basePath?: string; title?: string } = {}): AdminModule {
  return {
    id: "coupons",
    title: options.title ?? "Coupons",
    icon: "coupons",
    basePath: options.basePath ?? "/coupons",
    permission: "coupons.read",
    permissions: [
      { id: "coupons.read", label: "View promo and staff codes" },
      { id: "coupons.manage", label: "Create and change codes" },
    ],
    adapters: ["coupons"],
    routes: [{ path: "", component: CouponsPage }],
    badge: async (a) => {
      const live = await a.coupons.listCoupons({ status: ["live"] });
      return live.length || undefined;
    },
  };
}
