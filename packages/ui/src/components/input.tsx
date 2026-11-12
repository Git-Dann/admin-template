import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes, type LabelHTMLAttributes } from "react";
import { cn } from "../lib/cn";
import { renderIcon, type IconLike } from "../icons";

const field =
  "w-full bg-surface text-text placeholder:text-text-muted border border-border-strong rounded-md px-3 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-offset-0 disabled:opacity-50 aria-[invalid=true]:border-danger";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  icon?: IconLike;
  size?: "md" | "sm";
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, icon, size = "md", ...props }, ref) {
  const input = <input ref={ref} className={cn(field, size === "md" ? "h-control" : "h-control-sm", icon && "pl-10", className)} {...props} />;
  if (!icon) return input;
  return (
    <div className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-text-muted">
        {renderIcon(icon, { size: "sm" })}
      </span>
      {input}
    </div>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, rows = 4, ...props },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={cn(field, "py-2.5 min-h-control leading-relaxed", className)} {...props} />;
});

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  // eslint-disable-next-line jsx-a11y/label-has-associated-control -- htmlFor is passed by callers
  return <label className={cn("text-sm font-medium text-text", className)} {...props} />;
}
