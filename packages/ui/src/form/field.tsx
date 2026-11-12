"use client";

import { useId, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface FieldRenderProps {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}

/**
 * Label + control + help text + error, wired for screen readers.
 * Works with or without React Hook Form.
 */
export function Field({
  label,
  description,
  error,
  required,
  optional,
  className,
  children,
}: {
  label: ReactNode;
  description?: ReactNode;
  error?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
  children: (props: FieldRenderProps) => ReactNode;
}) {
  const id = useId();
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="flex items-baseline gap-1 text-sm font-medium text-text">
        {label}
        {required && <span aria-hidden className="text-danger">*</span>}
        {optional && <span className="text-xs font-normal text-text-muted">(optional)</span>}
      </label>
      {children({ id, "aria-describedby": [descId, errId].filter(Boolean).join(" ") || undefined, "aria-invalid": error ? true : undefined })}
      {description && !error && <p id={descId} className="text-xs text-text-muted">{description}</p>}
      {error && (
        <p id={errId} role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
