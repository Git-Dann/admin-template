"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { cn, Icon } from "@gitwork/ui";

interface PageMeta {
  title: string;
  subtitle?: string;
}

const PageMetaContext = createContext<{ meta: PageMeta; setMeta: (m: PageMeta) => void } | null>(null);

export function PageMetaProvider({ children, fallback }: { children: ReactNode; fallback: string }) {
  const [meta, setMeta] = useState<PageMeta>({ title: fallback });
  return <PageMetaContext.Provider value={{ meta, setMeta }}>{children}</PageMetaContext.Provider>;
}

export function usePageMeta(): PageMeta {
  return useContext(PageMetaContext)?.meta ?? { title: "" };
}

/**
 * Sets the page title shown in the top bar, and renders the page's toolbar row:
 * filters on the left, primary/secondary actions on the right. Every control in the
 * row is h-control so they line up.
 */
export function PageHeader({
  title,
  subtitle,
  back,
  actions,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  /** Show a back link above the toolbar (detail pages). */
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** Filters, chips, search. */
  children?: ReactNode;
  className?: string;
}) {
  const ctx = useContext(PageMetaContext);
  const setMeta = ctx?.setMeta;
  useEffect(() => {
    setMeta?.({ title, subtitle });
    if (typeof document !== "undefined") {
      const product = document.querySelector('meta[name="application-name"]')?.getAttribute("content");
      document.title = product ? `${title} · ${product}` : title;
    }
  }, [setMeta, title, subtitle]);

  if (!back && !actions && !children) return null;
  return (
    <div className={cn("mb-6 flex flex-col gap-4", className)}>
      {back && (
        <Link href={back.href} className="inline-flex w-fit items-center gap-1 rounded-sm text-sm text-text-muted hover:text-text focus-ring">
          <Icon name="chevron-left" size="sm" />
          {back.label}
        </Link>
      )}
      {(actions || children) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{children}</div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
    </div>
  );
}
