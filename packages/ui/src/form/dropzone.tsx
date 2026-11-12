"use client";

import { useCallback, useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatBytes } from "../lib/format";
import { Icon, renderIcon, type IconLike } from "../icons";
import { Button } from "../components/button";

export interface UploadedFile {
  name: string;
  size: number;
  type?: string;
  /** Preview or download URL. */
  url?: string;
  /** Extra detail, e.g. "1024×1024 · PNG" or "Lottie · 3.2s · 60fps". */
  meta?: string;
  /** The original File when picked in this session. */
  file?: File;
}

export type FileStatus = { state: "idle" } | { state: "checking" } | { state: "valid"; message?: string; warning?: string } | { state: "invalid"; message: string };

/** Result of a validator: an error message, or null/undefined if ok. Optionally adds meta. */
export type FileValidator = (
  file: File,
) => Promise<{ error?: string; warning?: string; meta?: string } | void> | { error?: string; warning?: string; meta?: string } | void;

/** Uploaded-file chip: name, meta, replace/remove, validation state. */
export function FileChip({
  file,
  status = { state: "idle" },
  onReplace,
  onRemove,
  icon,
  className,
}: {
  file: UploadedFile;
  status?: FileStatus;
  onReplace?: () => void;
  onRemove?: () => void;
  icon?: IconLike;
  className?: string;
}) {
  const isImage = file.type?.startsWith("image/") && file.url;
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-md border bg-surface p-3",
        status.state === "invalid" ? "border-danger" : status.state === "valid" && status.warning ? "border-warning" : status.state === "valid" ? "border-success/60" : "border-border",
        className,
      )}
    >
      <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-raised text-text-muted">
        {isImage ? <img src={file.url} alt="" className="size-full object-cover" /> : renderIcon(icon ?? (file.type?.includes("json") ? "file-json" : "file"))}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text">{file.name}</p>
        <p className="truncate text-xs text-text-muted">
          {[formatBytes(file.size), file.meta].filter(Boolean).join(" · ")}
        </p>
        {status.state === "invalid" && <p role="alert" className="mt-0.5 text-xs font-medium text-danger">{status.message}</p>}
        {status.state === "valid" && status.warning && <p className="mt-0.5 text-xs font-medium text-warning">{status.warning}</p>}
        {status.state === "valid" && !status.warning && status.message && <p className="mt-0.5 text-xs text-success">{status.message}</p>}
      </div>
      {status.state === "checking" && <Icon name="spinner" size="sm" className="animate-spin text-text-muted" label="Checking file" />}
      {status.state === "valid" && (status.warning ? <Icon name="warning" size="sm" className="text-warning" label="Check this" /> : <Icon name="success" size="sm" className="text-success" label="Valid" />)}
      {status.state === "invalid" && <Icon name="error" size="sm" className="text-danger" label="Invalid" />}
      <div className="flex shrink-0 items-center gap-1">
        {onReplace && <Button variant="ghost" size="icon-sm" icon="upload" aria-label={`Replace ${file.name}`} title="Replace" onClick={onReplace} />}
        {onRemove && <Button variant="ghost" size="icon-sm" icon="trash" aria-label={`Remove ${file.name}`} title="Remove" onClick={onRemove} />}
      </div>
    </div>
  );
}

/**
 * Drag-and-drop file slot with validation. Shows the dropzone when empty and a FileChip once filled.
 */
export function FileDropzone({
  value,
  onChange,
  accept,
  maxSize,
  validate,
  label = "Drop a file here or browse",
  hint,
  icon = "upload",
  disabled,
  className,
}: {
  value: UploadedFile | null;
  onChange: (file: UploadedFile | null, status: FileStatus) => void;
  /** e.g. ".json,application/json" or "image/png,image/webp" */
  accept?: string;
  /** Bytes. */
  maxSize?: number;
  validate?: FileValidator;
  label?: ReactNode;
  hint?: ReactNode;
  icon?: IconLike;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<FileStatus>({ state: value ? "valid" : "idle" } as FileStatus);
  const id = useId();

  const accepts = useCallback(
    (file: File) => {
      if (!accept) return true;
      return accept.split(",").some((rule) => {
        const r = rule.trim().toLowerCase();
        if (r.startsWith(".")) return file.name.toLowerCase().endsWith(r);
        if (r.endsWith("/*")) return file.type.startsWith(r.slice(0, -1));
        return file.type === r;
      });
    },
    [accept],
  );

  const handle = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const uploaded: UploadedFile = { name: file.name, size: file.size, type: file.type, file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined };
      let next: FileStatus;
      if (!accepts(file)) next = { state: "invalid", message: `That file type isn't accepted. Use ${accept}.` };
      else if (maxSize && file.size > maxSize) next = { state: "invalid", message: `File is ${formatBytes(file.size)}. The limit is ${formatBytes(maxSize)}.` };
      else if (validate) {
        setStatus({ state: "checking" });
        onChange(uploaded, { state: "checking" });
        try {
          const result = (await validate(file)) ?? {};
          if (result.meta) uploaded.meta = result.meta;
          next = result.error ? { state: "invalid", message: result.error } : { state: "valid", warning: result.warning };
        } catch (error) {
          next = { state: "invalid", message: (error as Error).message };
        }
      } else next = { state: "valid" };
      setStatus(next);
      onChange(uploaded, next);
    },
    [accept, accepts, maxSize, onChange, validate],
  );

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) void handle(e.dataTransfer.files[0]);
  };

  const picker = (
    <input
      ref={inputRef}
      id={id}
      type="file"
      accept={accept}
      className="sr-only"
      disabled={disabled}
      onChange={(e) => {
        void handle(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (value) {
    return (
      <div className={className}>
        {picker}
        <FileChip
          file={value}
          status={status}
          onReplace={disabled ? undefined : () => inputRef.current?.click()}
          onRemove={
            disabled
              ? undefined
              : () => {
                  setStatus({ state: "idle" });
                  onChange(null, { state: "idle" });
                }
          }
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
        dragging ? "border-accent bg-accent-subtle/50" : "border-border-strong/50 bg-surface hover:border-border-strong",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {picker}
      <span className="flex size-10 items-center justify-center rounded-md bg-surface-raised text-text-muted">{renderIcon(icon)}</span>
      <label htmlFor={id} className="cursor-pointer text-sm font-medium text-text after:absolute after:inset-0 focus-within:underline">
        {label}
      </label>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}
