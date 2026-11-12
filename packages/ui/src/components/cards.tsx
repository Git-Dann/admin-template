import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { renderIcon, type IconLike } from "../icons";
import { CodeChip, StatusPill } from "./badges";
import { Card } from "./card";

/**
 * Promo-code style ticket. The perforation is drawn with two notches cut from the
 * card edge (masked circles), not a one-sided border, so it stays crisp at any radius.
 */
export function TicketCard({
  title,
  value,
  code,
  status,
  meta,
  footer,
  actions,
  className,
}: {
  title: ReactNode;
  /** The headline offer: "20% off", "£5 credit", "1 month free". */
  value: ReactNode;
  code?: string;
  status?: string;
  meta?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("relative flex overflow-hidden", className)}>
      <div className="flex w-32 shrink-0 flex-col items-center justify-center gap-1 bg-accent-subtle px-3 py-5 text-center">
        <span className="font-display text-2xl font-bold leading-tight text-accent-text">{value}</span>
      </div>
      <div aria-hidden className="relative w-0 border-l-2 border-dashed border-border">
        <span className="absolute -top-2 -left-2 size-4 rounded-pill bg-bg" />
        <span className="absolute -bottom-2 -left-2 size-4 rounded-pill bg-bg" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate font-semibold text-text">{title}</p>
          {status && <StatusPill status={status} size="sm" />}
        </div>
        {meta && <div className="text-sm text-text-muted">{meta}</div>}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          {code && <CodeChip code={code} />}
          {actions}
        </div>
        {footer && <div className="border-t border-border pt-2 text-xs text-text-muted">{footer}</div>}
      </div>
    </Card>
  );
}

/** Alias: the same component reads better as AssetCard for downloadable promo assets. */
export const AssetCard = TicketCard;

/** Artwork + meta + action. Used for series, episodes, seasonal themes. */
export function MediaCard({
  image,
  imageAlt = "",
  aspect = "video",
  title,
  subtitle,
  meta,
  status,
  badge,
  action,
  onClick,
  className,
}: {
  image?: string;
  imageAlt?: string;
  aspect?: "video" | "square" | "poster";
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  status?: string;
  badge?: ReactNode;
  action?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const ratio = { video: "aspect-video", square: "aspect-square", poster: "aspect-[2/3]" }[aspect];
  const Title = onClick ? "button" : "p";
  return (
    <Card className={cn("group flex flex-col overflow-hidden", onClick && "transition-shadow hover:shadow-md", className)}>
      <div className={cn("relative overflow-hidden bg-surface-raised", ratio)}>
        {image ? (
          <img src={image} alt={imageAlt} className="size-full object-cover transition-transform group-hover:scale-[1.02]" loading="lazy" />
        ) : (
          <div className="flex size-full items-center justify-center text-text-muted">{renderIcon("image", { size: "lg" })}</div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          {status && <StatusPill status={status} size="sm" />}
          {badge}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <Title
          {...(onClick ? { type: "button" as const, onClick } : {})}
          className={cn("truncate text-left font-semibold text-text", onClick && "focus-ring rounded-sm after:absolute after:inset-0 relative")}
        >
          {title}
        </Title>
        {subtitle && <p className="truncate text-sm text-text-muted">{subtitle}</p>}
        {(meta || action) && (
          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <div className="text-xs text-text-muted">{meta}</div>
            {action && <div className="relative z-10">{action}</div>}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Small icon + label tile, e.g. platform badges in export panels. */
export function IconTile({ icon, tone = "neutral", className }: { icon: IconLike; tone?: "neutral" | "accent"; className?: string }) {
  return (
    <span className={cn("flex size-10 items-center justify-center rounded-md", tone === "accent" ? "bg-accent-subtle text-accent-text" : "bg-surface-raised text-text-muted", className)}>
      {renderIcon(icon)}
    </span>
  );
}
