"use client";

import { Avatar as A, Checkbox as C, Collapsible, RadioGroup as R, Select as S, Switch as Sw, Tabs as Tb } from "radix-ui";
import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";
import { Icon, renderIcon, type IconLike } from "../icons";

/* -------------------------------- Checkbox -------------------------------- */

export const Checkbox = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof C.Root>>(function Checkbox({ className, ...props }, ref) {
  return (
    <C.Root
      ref={ref}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-border-strong bg-surface focus-ring data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=indeterminate]:bg-accent data-[state=indeterminate]:border-accent text-text-on-accent disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <C.Indicator>
        <Icon name={props.checked === "indeterminate" ? "minus" : "check"} size={14} strokeWidth={3} />
      </C.Indicator>
    </C.Root>
  );
});

/* --------------------------------- Switch --------------------------------- */

export const Switch = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof Sw.Root>>(function Switch({ className, ...props }, ref) {
  return (
    <Sw.Root
      ref={ref}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-pill border border-border-strong bg-surface-raised transition-colors focus-ring data-[state=checked]:border-accent data-[state=checked]:bg-accent disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Sw.Thumb className="block size-4.5 translate-x-0.5 rounded-pill bg-text-muted shadow-sm transition-transform data-[state=checked]:translate-x-[22px] data-[state=checked]:bg-text-on-accent" />
    </Sw.Root>
  );
});

/* ------------------------------- Radio group ------------------------------- */

export const RadioGroup = R.Root;

export const Radio = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<typeof R.Item>>(function Radio({ className, ...props }, ref) {
  return (
    <R.Item
      ref={ref}
      className={cn("flex size-5 shrink-0 items-center justify-center rounded-pill border border-border-strong bg-surface focus-ring data-[state=checked]:border-accent", className)}
      {...props}
    >
      <R.Indicator className="size-2.5 rounded-pill bg-accent" />
    </R.Item>
  );
});

/* --------------------------------- Select --------------------------------- */

export interface SelectOption {
  value: string;
  label: ReactNode;
  icon?: IconLike;
  disabled?: boolean;
}

export interface SelectProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: "md" | "sm";
  disabled?: boolean;
  id?: string;
  name?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { options, placeholder = "Select…", size = "md", className, ...props },
  ref,
) {
  const { "aria-label": ariaLabel, "aria-invalid": ariaInvalid, id, ...root } = props;
  return (
    <S.Root {...root}>
      <S.Trigger
        ref={ref}
        id={id}
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-md border border-border-strong bg-surface px-3 text-sm text-text focus-ring data-[placeholder]:text-text-muted aria-[invalid=true]:border-danger disabled:opacity-50",
          size === "md" ? "h-control" : "h-control-sm",
          className,
        )}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <Icon name="chevron-down" size="sm" className="text-text-muted" />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content position="popper" sideOffset={6} className="z-50 max-h-80 min-w-(--radix-select-trigger-width) overflow-hidden rounded-md border border-border bg-bg-elevated shadow-lg">
          <S.Viewport className="p-1">
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex h-control-sm cursor-pointer select-none items-center gap-2 rounded-sm pl-2.5 pr-8 text-sm text-text outline-none data-[highlighted]:bg-surface-raised data-[disabled]:opacity-50"
              >
                {renderIcon(o.icon, { size: "sm" })}
                <S.ItemText>{o.label}</S.ItemText>
                <S.ItemIndicator className="absolute right-2">
                  <Icon name="check" size="sm" className="text-accent-text" />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
});

/* ---------------------------------- Tabs ---------------------------------- */

export const Tabs = Tb.Root;
export const TabsContent = Tb.Content;

export function TabsList({ className, ...props }: ComponentPropsWithoutRef<typeof Tb.List>) {
  return <Tb.List className={cn("inline-flex h-control items-center gap-1 rounded-md bg-surface-raised p-1", className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentPropsWithoutRef<typeof Tb.Trigger>) {
  return (
    <Tb.Trigger
      className={cn(
        "inline-flex h-full items-center gap-1.5 rounded-sm px-3 text-sm font-medium text-text-muted focus-ring data-[state=active]:bg-surface data-[state=active]:text-text data-[state=active]:shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

/* --------------------------------- Avatar --------------------------------- */

export function Avatar({ name, src, size = 36, className }: { name: string; src?: string; size?: number; className?: string }) {
  return (
    <A.Root className={cn("inline-flex shrink-0 items-center justify-center overflow-hidden rounded-pill bg-accent-subtle", className)} style={{ width: size, height: size }}>
      {src && <A.Image src={src} alt="" className="size-full object-cover" />}
      <A.Fallback className="text-xs font-semibold text-accent-text" style={{ fontSize: Math.max(11, size * 0.36) }}>
        {initials(name)}
      </A.Fallback>
    </A.Root>
  );
}

/* ------------------------------ Section header ------------------------------ */

/** Collapsible section with a heading row. Content stays mounted for form state. */
export function SectionHeader({
  title,
  description,
  actions,
  collapsible = true,
  defaultOpen = true,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  children?: ReactNode;
  className?: string;
}) {
  const heading = (
    <div className="min-w-0 text-left">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {description && <p className="text-sm text-text-muted">{description}</p>}
    </div>
  );
  if (!collapsible) {
    return (
      <section className={className}>
        <div className="mb-4 flex items-end justify-between gap-4">
          {heading}
          {actions}
        </div>
        {children}
      </section>
    );
  }
  return (
    <Collapsible.Root defaultOpen={defaultOpen} className={cn("group/section", className)} asChild>
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Collapsible.Trigger className="flex min-w-0 items-center gap-2 rounded-sm focus-ring">
            <Icon name="chevron-down" size="sm" className="text-text-muted transition-transform group-data-[state=closed]/section:-rotate-90" />
            {heading}
          </Collapsible.Trigger>
          {actions}
        </div>
        <Collapsible.Content forceMount className="data-[state=closed]:hidden">
          {children}
        </Collapsible.Content>
      </section>
    </Collapsible.Root>
  );
}
