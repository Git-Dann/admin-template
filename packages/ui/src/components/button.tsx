import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { renderIcon, type IconLike } from "../icons";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-colors focus-ring disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary: "bg-accent text-text-on-accent hover:bg-accent-pressed active:bg-accent-pressed",
        secondary: "bg-surface text-text border border-border-strong/40 hover:bg-surface-raised",
        ghost: "text-text hover:bg-surface-raised",
        subtle: "bg-accent-subtle text-accent-text hover:bg-accent-subtle/70",
        danger: "bg-danger-subtle text-danger border border-danger/30 hover:border-danger",
        link: "text-accent-text underline-offset-4 hover:underline h-auto px-0",
      },
      size: {
        md: "h-control px-4 text-sm rounded-md",
        sm: "h-control-sm px-3 text-sm rounded-sm",
        icon: "size-control rounded-md",
        "icon-sm": "size-control-sm rounded-sm",
      },
      block: { true: "w-full" },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  icon?: IconLike;
  iconRight?: IconLike;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, block, asChild, icon, iconRight, loading, children, disabled, type = "button", ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  const iconSize = size === "sm" || size === "icon-sm" ? "sm" : "md";
  return (
    <Comp
      ref={ref}
      type={asChild ? undefined : type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? renderIcon("spinner", { size: iconSize, className: "animate-spin" }) : renderIcon(icon, { size: iconSize })}
          {children}
          {renderIcon(iconRight, { size: iconSize })}
        </>
      )}
    </Comp>
  );
});

/** Icon-only button. `label` is required so it is never silent to screen readers. */
export const IconButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, "children" | "iconRight"> & { label: string; icon: IconLike }>(
  function IconButton({ label, icon, size = "icon", variant = "ghost", ...props }, ref) {
    return <Button ref={ref} size={size} variant={variant} icon={icon} aria-label={label} title={label} {...props} />;
  },
);
