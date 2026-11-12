"use client";

import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from "radix-ui";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "../lib/cn";
import { Icon, renderIcon, type IconLike } from "../icons";
import { Button } from "./button";

const overlay = "fixed inset-0 z-50 bg-overlay data-[state=open]:animate-in data-[state=open]:fade-in";
const panel = "bg-bg-elevated text-text border border-border shadow-lg";

/* --------------------------------- Dialog --------------------------------- */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  footer,
  className,
  size = "md",
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <D.Portal>
      <D.Overlay className={overlay} />
      <D.Content
        className={cn(
          panel,
          "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl p-6 focus:outline-none",
          { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-3xl" }[size],
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <D.Title className="text-lg font-semibold">{title}</D.Title>
            {description ? <D.Description className="mt-1 text-sm text-text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
          </div>
          <D.Close asChild>
            <Button variant="ghost" size="icon-sm" icon="close" aria-label="Close" />
          </D.Close>
        </div>
        {children && <div className="mt-5">{children}</div>}
        {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
      </D.Content>
    </D.Portal>
  );
}

/* ---------------------------- Drawer (side sheet) ---------------------------- */

export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  width = "md",
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  side?: "right" | "left";
  width?: "sm" | "md" | "lg";
  trigger?: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <D.Trigger asChild>{trigger}</D.Trigger>}
      <D.Portal>
        <D.Overlay className={overlay} />
        <D.Content
          className={cn(
            panel,
            "fixed inset-y-0 z-50 flex w-full flex-col focus:outline-none",
            side === "right" ? "right-0 border-r-0" : "left-0 border-l-0",
            { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[width],
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div className="min-w-0">
              <D.Title className="truncate text-lg font-semibold">{title}</D.Title>
              {description ? <D.Description className="mt-0.5 text-sm text-text-muted">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" icon="close" aria-label="Close" />
            </D.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && <div className="flex justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

/* ------------------------------ Confirm dialog ------------------------------ */

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onConfirm,
  loading,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
  trigger?: ReactNode;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      {trigger && <D.Trigger asChild>{trigger}</D.Trigger>}
      <DialogContent
        size="sm"
        title={title}
        description={description}
        footer={
          <>
            <D.Close asChild>
              <Button variant="secondary">{cancelLabel}</Button>
            </D.Close>
            <Button variant={tone === "danger" ? "danger" : "primary"} loading={loading} onClick={() => void onConfirm()}>
              {confirmLabel}
            </Button>
          </>
        }
      />
    </D.Root>
  );
}

/* ------------------------------- Dropdown menu ------------------------------- */

export const DropdownMenu = DM.Root;
export const DropdownMenuTrigger = DM.Trigger;

export function DropdownMenuContent({ className, align = "end", ...props }: ComponentPropsWithoutRef<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={6}
        className={cn(panel, "z-50 min-w-48 rounded-md p-1", className)}
        {...props}
      />
    </DM.Portal>
  );
}

export function DropdownMenuItem({
  icon,
  tone,
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof DM.Item> & { icon?: IconLike; tone?: "danger" }) {
  return (
    <DM.Item
      className={cn(
        "flex h-control-sm cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 text-sm outline-none data-[highlighted]:bg-surface-raised data-[disabled]:opacity-50",
        tone === "danger" ? "text-danger" : "text-text",
        className,
      )}
      {...props}
    >
      {renderIcon(icon, { size: "sm" })}
      {children}
    </DM.Item>
  );
}

export function DropdownMenuCheckboxItem({ className, children, ...props }: ComponentPropsWithoutRef<typeof DM.CheckboxItem>) {
  return (
    <DM.CheckboxItem
      className={cn("flex h-control-sm cursor-pointer select-none items-center gap-2 rounded-sm px-2.5 text-sm outline-none data-[highlighted]:bg-surface-raised", className)}
      {...props}
    >
      <span className="flex size-4 items-center justify-center rounded-sm border border-border-strong data-[state=checked]:bg-accent">
        <DM.ItemIndicator>
          <Icon name="check" size={12} />
        </DM.ItemIndicator>
      </span>
      {children}
    </DM.CheckboxItem>
  );
}

export function DropdownMenuLabel({ className, ...props }: ComponentPropsWithoutRef<typeof DM.Label>) {
  return <DM.Label className={cn("px-2.5 py-1.5 text-xs font-medium text-text-muted", className)} {...props} />;
}

export function DropdownMenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-border" />;
}

/* --------------------------------- Popover --------------------------------- */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({ className, align = "start", ...props }: ComponentPropsWithoutRef<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content align={align} sideOffset={6} className={cn(panel, "z-50 rounded-md p-3 focus:outline-none", className)} {...props} />
    </P.Portal>
  );
}

/* --------------------------------- Tooltip --------------------------------- */

export const TooltipProvider = T.Provider;

export function Tooltip({ content, children, side = "top" }: { content: ReactNode; children: ReactNode; side?: "top" | "right" | "bottom" | "left" }) {
  return (
    <T.Root delayDuration={200}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={side} sideOffset={6} className="z-50 rounded-sm bg-text px-2 py-1 text-xs text-bg shadow-md">
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
