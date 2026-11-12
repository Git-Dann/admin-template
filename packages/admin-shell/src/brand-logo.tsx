"use client";

import { cn } from "@gitwork/ui";
import { useAdminConfig } from "./context";

/** The client's logo from admin.config.ts, or the product name when there isn't one. */
export function BrandLogo({ collapsed = false, className }: { collapsed?: boolean; className?: string }) {
  const { logo, productName } = useAdminConfig().brand;
  let mark;
  if (logo?.component) {
    const Logo = logo.component;
    mark = <Logo collapsed={collapsed} />;
  } else if (logo?.full || logo?.mark) {
    const src = collapsed ? (logo.mark ?? logo.full) : (logo.full ?? logo.mark);
    mark = <img src={src} alt={logo.alt ?? productName} className={cn("block w-auto", collapsed ? "max-h-8 max-w-11" : "h-8")} />;
  } else {
    mark = <span className="font-display text-lg font-semibold text-sidebar-text">{collapsed ? productName.slice(0, 1) : productName}</span>;
  }
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      {mark}
      {logo?.badge && !collapsed && (
        <span className="inline-flex h-[18px] items-center rounded-pill bg-sidebar-text/15 px-2 text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap text-sidebar-text">
          {logo.badge}
        </span>
      )}
    </span>
  );
}
