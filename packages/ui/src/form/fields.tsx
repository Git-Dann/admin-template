"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ReactNode } from "react";
import {
  Controller,
  useForm,
  type Control,
  type DefaultValues,
  type FieldPath,
  type FieldValues,
  type UseFormProps,
} from "react-hook-form";
import type { z } from "zod";
import { cn } from "../lib/cn";
import { Input, Textarea } from "../components/input";
import { Radio, RadioGroup, Select, Switch, type SelectOption } from "../components/controls";
import { renderIcon, type IconLike } from "../icons";
import { Field } from "./field";

/**
 * React Hook Form + Zod in one call:
 *   const form = useZodForm(schema, { title: "" });
 */
export function useZodForm<S extends z.ZodType<FieldValues, FieldValues>>(
  schema: S,
  defaultValues: DefaultValues<z.input<S>>,
  options: Omit<UseFormProps<z.input<S>, unknown, z.output<S>>, "resolver" | "defaultValues"> = {},
) {
  return useForm<z.input<S>, unknown, z.output<S>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- resolver generics vary across zod versions
    resolver: zodResolver(schema as any) as any,
    defaultValues,
    mode: "onTouched",
    ...options,
  });
}

interface BaseFieldProps<T extends FieldValues> {
  /** form.control. Accepts forms whose submitted type differs from the input type (Zod coercion). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- context/output generics are irrelevant to a field
  control: Control<T, any, any>;
  name: FieldPath<T>;
  label: ReactNode;
  description?: ReactNode;
  required?: boolean;
  optional?: boolean;
  className?: string;
}

export function TextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  optional,
  className,
  multiline,
  ...input
}: BaseFieldProps<T> & { multiline?: boolean; placeholder?: string; type?: string; icon?: IconLike; rows?: number; autoComplete?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} description={description} error={fieldState.error?.message} required={required} optional={optional} className={className}>
          {(a11y) =>
            multiline ? (
              <Textarea {...a11y} {...field} value={field.value ?? ""} placeholder={input.placeholder} rows={input.rows} />
            ) : (
              <Input {...a11y} {...field} value={field.value ?? ""} {...input} />
            )
          }
        </Field>
      )}
    />
  );
}

export function SelectField<T extends FieldValues>({ control, name, label, description, required, optional, className, options, placeholder }: BaseFieldProps<T> & { options: SelectOption[]; placeholder?: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field label={label} description={description} error={fieldState.error?.message} required={required} optional={optional} className={className}>
          {(a11y) => (
            <Select
              id={a11y.id}
              aria-invalid={a11y["aria-invalid"]}
              name={field.name}
              value={field.value ?? ""}
              onValueChange={field.onChange}
              options={options}
              placeholder={placeholder}
            />
          )}
        </Field>
      )}
    />
  );
}

/** Native date / time / datetime-local inputs: accessible, localised and keyboard-friendly by default. */
export function DateField<T extends FieldValues>({ kind = "date", ...props }: BaseFieldProps<T> & { kind?: "date" | "time" | "datetime-local" }) {
  return <TextField {...props} type={kind} />;
}

/** Title + description on the left, switch on the right. Use for settings and asset slot toggles. */
export function ToggleRow({
  title,
  description,
  checked,
  onCheckedChange,
  disabled,
  icon,
  children,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  icon?: IconLike;
  /** Content revealed when on (e.g. upload slot). */
  children?: ReactNode;
  className?: string;
}) {
  const id = `toggle-${String(title).replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div className={cn("rounded-lg border border-border bg-surface", className)}>
      <div className="flex items-center gap-4 p-4">
        {icon && <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-surface-raised text-text-muted">{renderIcon(icon)}</span>}
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="block font-medium text-text">{title}</label>
          {description && <p className="text-sm text-text-muted">{description}</p>}
        </div>
        <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
      </div>
      {checked && children && <div className="border-t border-border p-4">{children}</div>}
    </div>
  );
}

export function ToggleField<T extends FieldValues>({ control, name, label, description, icon, className }: Omit<BaseFieldProps<T>, "required" | "optional"> & { icon?: IconLike }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => <ToggleRow title={label} description={description} icon={icon} checked={!!field.value} onCheckedChange={field.onChange} className={className} />}
    />
  );
}

export interface RadioCardOption {
  value: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: IconLike;
  disabled?: boolean;
}

/** Large selectable cards for a few important choices (audience, platform). */
export function RadioCards({
  value,
  onValueChange,
  options,
  columns = 2,
  label,
  className,
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: RadioCardOption[];
  columns?: 1 | 2 | 3 | 4;
  label: string;
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={onValueChange}
      aria-label={label}
      className={cn("grid gap-3", { 1: "grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns], className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <label
            key={o.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border bg-surface p-4 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-focus-ring",
              active ? "border-accent bg-accent-subtle/50" : "border-border hover:border-border-strong",
              o.disabled && "cursor-not-allowed opacity-50",
            )}
          >
            <Radio value={o.value} disabled={o.disabled} className="mt-0.5" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-medium text-text">
                {renderIcon(o.icon, { size: "sm", className: active ? "text-accent-text" : "text-text-muted" })}
                {o.title}
              </span>
              {o.description && <span className="mt-0.5 block text-sm text-text-muted">{o.description}</span>}
            </span>
          </label>
        );
      })}
    </RadioGroup>
  );
}

export function RadioCardsField<T extends FieldValues>({ control, name, label, options, columns, className }: Omit<BaseFieldProps<T>, "description" | "required" | "optional"> & { options: RadioCardOption[]; columns?: 1 | 2 | 3 | 4; label: string }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <fieldset className={cn("flex flex-col gap-2", className)}>
          <legend className="mb-1.5 text-sm font-medium text-text">{label}</legend>
          <RadioCards value={field.value} onValueChange={field.onChange} options={options} columns={columns} label={label} />
          {fieldState.error && <p role="alert" className="text-xs font-medium text-danger">{fieldState.error.message}</p>}
        </fieldset>
      )}
    />
  );
}
