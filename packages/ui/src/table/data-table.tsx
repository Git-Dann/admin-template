"use client";

import {
  columnVisibilityFeature,
  createColumnHelper,
  createPaginatedRowModel,
  createSortedRowModel,
  FlexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type PaginationState,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
} from "@tanstack/react-table";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useIsMobile } from "../lib/use-media";
import { formatNumber } from "../lib/format";
import { Icon, type IconLike } from "../icons";
import { Button } from "../components/button";
import { Checkbox, Select } from "../components/controls";
import { EmptyState, ErrorState, Skeleton } from "../components/feedback";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/overlays";

/** Per-column options, set via `meta` on a column definition. */
export interface DataTableColumnMeta {
  /** Right-align numbers and money. */
  align?: "left" | "right" | "center";
  /** Name shown in the column visibility menu when the header isn't a string. */
  label?: string;
  /** Extra classes for header and cells. */
  className?: string;
}

export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime, basic: sortFn_basic },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
  columnVisibilityFeature,
  rowSelectionFeature,
  columnMeta: {} as DataTableColumnMeta,
});

export type DataTableFeatures = typeof dataTableFeatures;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- column value types vary per column
export type DataTableColumn<T extends RowData> = ColumnDef<DataTableFeatures, T, any>;
export type DataTableRow<T extends RowData> = Row<DataTableFeatures, T>;

/**
 * Typed column helper for DataTable.
 *
 *   const col = createColumns<User>();
 *   const columns = col.columns([col.accessor("name", { header: "Name" })]);
 */
export function createColumns<T extends RowData>() {
  return createColumnHelper<DataTableFeatures, T>();
}

export interface RowAction<T> {
  label: string;
  icon?: IconLike;
  tone?: "danger";
  onSelect: (row: T) => void;
  hidden?: (row: T) => boolean;
}

export interface DataTableProps<T extends RowData> {
  data: T[] | undefined;
  /** Keep columns stable (module scope or useMemo). */
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  /** Accessible name for the table. */
  label: string;

  loading?: boolean;
  error?: unknown;
  onRetry?: () => void;
  empty?: { title: string; description?: string; action?: ReactNode; icon?: IconLike };

  /** Show checkboxes. Selected IDs are reported to `onSelectionChange`. */
  selectable?: boolean;
  onSelectionChange?: (ids: string[]) => void;
  /** Rendered above the table when rows are selected. */
  bulkActions?: (ids: string[], clear: () => void) => ReactNode;

  rowActions?: RowAction<T>[];
  onRowClick?: (row: T) => void;

  pageSize?: number;
  pageSizeOptions?: number[];
  initialSorting?: SortingState;
  initialHidden?: string[];

  /** Server-side mode: pass the current page of rows plus totals. */
  server?: {
    rowCount: number;
    pagination: PaginationState;
    onPaginationChange: (p: PaginationState) => void;
    sorting?: SortingState;
    onSortingChange?: (s: SortingState) => void;
  };

  /** Left side of the table toolbar (filters, search). */
  toolbar?: ReactNode;
  /** Show the column visibility menu. */
  columnToggle?: boolean;
  /** Fix the body height and keep the header in view while scrolling. */
  maxHeight?: number | string;
  className?: string;
}

const EMPTY: never[] = [];

export function DataTable<T extends RowData>({
  data,
  columns,
  getRowId,
  label,
  loading,
  error,
  onRetry,
  empty = { title: "No results", description: "Try changing your filters or search." },
  selectable,
  onSelectionChange,
  bulkActions,
  rowActions,
  onRowClick,
  pageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  initialSorting = [],
  initialHidden = [],
  server,
  toolbar,
  columnToggle = true,
  maxHeight,
  className,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(initialHidden.map((id) => [id, false])),
  );

  const allColumns = useMemo(() => {
    const cols: DataTableColumn<T>[] = [];
    if (selectable) {
      cols.push({
        id: "__select",
        enableSorting: false,
        enableHiding: false,
        meta: { className: "w-12" },
        header: ({ table }) => (
          <Checkbox
            aria-label="Select all rows on this page"
            checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
            onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            onClick={(e) => {
              e.stopPropagation();
              row.getToggleSelectedHandler()(e);
            }}
          />
        ),
      });
    }
    cols.push(...columns);
    if (rowActions?.length) {
      cols.push({
        id: "__actions",
        enableSorting: false,
        enableHiding: false,
        meta: { align: "right", className: "w-14" },
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => <RowActionsMenu row={row.original} actions={rowActions} />,
      });
    }
    return cols;
  }, [columns, selectable, rowActions]);

  const effectivePagination = server?.pagination ?? pagination;
  const effectiveSorting = server?.sorting ?? sorting;

  const table = useTable({
    features: dataTableFeatures,
    columns: allColumns,
    data: data ?? EMPTY,
    getRowId,
    state: { sorting: effectiveSorting, pagination: effectivePagination, rowSelection, columnVisibility },
    onSortingChange: (u) => {
      const next = typeof u === "function" ? u(effectiveSorting) : u;
      if (server?.onSortingChange) server.onSortingChange(next);
      else setSorting(next);
    },
    onPaginationChange: (u) => {
      const next = typeof u === "function" ? u(effectivePagination) : u;
      if (server) server.onPaginationChange(next);
      else setPagination(next);
    },
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    manualPagination: !!server,
    manualSorting: !!server?.onSortingChange,
    rowCount: server?.rowCount,
    autoResetPageIndex: !server,
  });

  const selectedIds = useMemo(() => Object.keys(rowSelection).filter((id) => rowSelection[id]), [rowSelection]);
  useEffect(() => onSelectionChange?.(selectedIds), [selectedIds, onSelectionChange]);

  const total = server?.rowCount ?? data?.length ?? 0;
  const { pageIndex, pageSize: size } = effectivePagination;
  const from = total === 0 ? 0 : pageIndex * size + 1;
  const to = Math.min(total, (pageIndex + 1) * size);
  const rows = table.getRowModel().rows;
  const visibleColumns = table.getVisibleLeafColumns();
  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());
  // Phones get a card per row instead of a table that scrolls sideways.
  const isMobile = useIsMobile();

  let body: ReactNode;
  if (error) {
    body = (
      <tr>
        <td colSpan={visibleColumns.length}>
          <ErrorState compact error={error} onRetry={onRetry} />
        </td>
      </tr>
    );
  } else if (loading || data === undefined) {
    body = Array.from({ length: Math.min(size, 6) }, (_, i) => (
      <tr key={i} className="border-b border-border last:border-0">
        {visibleColumns.map((c) => (
          <td key={c.id} className="px-4 py-3.5">
            <Skeleton className="h-4 w-full max-w-40" />
          </td>
        ))}
      </tr>
    ));
  } else if (rows.length === 0) {
    body = (
      <tr>
        <td colSpan={visibleColumns.length}>
          <EmptyState compact icon={empty.icon ?? "inbox"} title={empty.title} description={empty.description} action={empty.action} />
        </td>
      </tr>
    );
  } else {
    body = rows.map((row) => (
      <tr
        key={row.id}
        data-state={row.getIsSelected() ? "selected" : undefined}
        onClick={onRowClick ? () => onRowClick(row.original) : undefined}
        onKeyDown={onRowClick ? (e) => e.key === "Enter" && e.target === e.currentTarget && onRowClick(row.original) : undefined}
        tabIndex={onRowClick ? 0 : undefined}
        className={cn(
          "border-b border-border last:border-0 transition-colors data-[state=selected]:bg-accent-subtle/60",
          onRowClick && "cursor-pointer hover:bg-surface-raised focus-ring",
        )}
      >
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta;
          return (
            <td
              key={cell.id}
              className={cn(
                "px-4 py-3 align-middle text-sm text-text",
                meta?.align === "right" && "text-right numeric",
                meta?.align === "center" && "text-center",
                meta?.className,
              )}
            >
              <FlexRender cell={cell} />
            </td>
          );
        })}
      </tr>
    ));
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {(toolbar || (columnToggle && hideable.length > 0 && !isMobile)) && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">{toolbar}</div>
          {columnToggle && hideable.length > 0 && !isMobile && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" icon="columns">Columns</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Show columns</DropdownMenuLabel>
                {hideable.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(v) => column.toggleVisibility(!!v)}
                  >
                    {column.columnDef.meta?.label ?? (typeof column.columnDef.header === "string" ? column.columnDef.header : column.id)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="flex h-control items-center gap-3 rounded-md bg-accent-subtle px-4 text-sm" role="region" aria-label="Bulk actions">
          <span className="font-medium text-accent-text numeric">{formatNumber(selectedIds.length)} selected</span>
          <div className="flex flex-1 items-center gap-2">{bulkActions(selectedIds, () => setRowSelection({}))}</div>
          <Button variant="ghost" size="sm" onClick={() => setRowSelection({})}>Clear</Button>
        </div>
      )}

      {isMobile ? (
        <MobileCards
          table={table}
          label={label}
          loading={loading || data === undefined}
          error={error}
          onRetry={onRetry}
          empty={empty}
          selectable={selectable}
          onRowClick={onRowClick}
          sorting={effectiveSorting}
          skeletons={Math.min(size, 4)}
        />
      ) : (
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <div className="overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
          <table className="w-full border-collapse" aria-label={label} aria-busy={loading || undefined}>
            <thead className="sticky top-0 z-10 bg-surface-raised">
              {table.getHeaderGroups().map((group) => (
                <tr key={group.id} className="border-b border-border">
                  {group.headers.map((header) => {
                    const meta = header.column.columnDef.meta;
                    const sortable = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : sortable ? "none" : undefined}
                        className={cn(
                          "h-11 whitespace-nowrap px-4 text-left text-xs font-semibold uppercase tracking-wide text-text-muted",
                          meta?.align === "right" && "text-right",
                          meta?.align === "center" && "text-center",
                          meta?.className,
                        )}
                      >
                        {header.isPlaceholder ? null : sortable ? (
                          <button
                            type="button"
                            onClick={header.column.getToggleSortingHandler()}
                            className={cn("hit-area inline-flex items-center gap-1 rounded-sm uppercase hover:text-text focus-ring", meta?.align === "right" && "flex-row-reverse")}
                          >
                            <FlexRender header={header} />
                            <Icon name={sorted === "asc" ? "arrow-up" : sorted === "desc" ? "arrow-down" : "sort"} size={14} className={sorted ? "text-accent-text" : "opacity-50"} />
                          </button>
                        ) : (
                          <FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>{body}</tbody>
          </table>
        </div>
      </div>
      )}

      {total > 0 && !error && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-text-muted">
          <p className="numeric" aria-live="polite">
            Showing {formatNumber(from)}–{formatNumber(to)} of {formatNumber(total)}
          </p>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <span aria-hidden className="max-sm:hidden">Rows</span>
              <Select
                size="sm"
                aria-label="Rows per page"
                className="w-20"
                value={String(size)}
                onValueChange={(v) => table.setPageSize(Number(v))}
                options={pageSizeOptions.map((n) => ({ value: String(n), label: String(n) }))}
              />
            </div>
            <Button variant="secondary" size="icon-sm" icon="chevron-left" aria-label="Previous page" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()} />
            <span className="numeric">
              {formatNumber(pageIndex + 1)} / {formatNumber(Math.max(1, table.getPageCount()))}
            </span>
            <Button variant="secondary" size="icon-sm" icon="chevron-right" aria-label="Next page" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ mobile cards ------------------------------ */

function columnLabel<T extends RowData>(column: ReturnType<ReturnType<typeof useTable<DataTableFeatures, T>>["getAllLeafColumns"]>[number]): string {
  const header = column.columnDef.header;
  return column.columnDef.meta?.label ?? (typeof header === "string" ? header : column.id);
}

function MobileCards<T extends RowData>({
  table,
  label,
  loading,
  error,
  onRetry,
  empty,
  selectable,
  onRowClick,
  sorting,
  skeletons,
}: {
  table: ReturnType<typeof useTable<DataTableFeatures, T>>;
  label: string;
  loading: boolean;
  error: unknown;
  onRetry?: () => void;
  empty: NonNullable<DataTableProps<T>["empty"]>;
  selectable?: boolean;
  onRowClick?: (row: T) => void;
  sorting: SortingState;
  skeletons: number;
}) {
  const columns = table.getVisibleLeafColumns().filter((c) => !c.id.startsWith("__"));
  const [titleColumn, ...detailColumns] = columns;
  const sortable = table.getAllLeafColumns().filter((c) => c.getCanSort() && !c.id.startsWith("__"));
  const current = sorting[0];
  const rows = table.getRowModel().rows;

  const sortControl = sortable.length > 0 && (
    <Select
      aria-label="Sort by"
      size="sm"
      className="w-auto min-w-0 flex-1"
      placeholder="Sort by…"
      value={current ? `${current.id}:${current.desc ? "desc" : "asc"}` : undefined}
      onValueChange={(v) => {
        const [id, dir] = v.split(":");
        table.setSorting([{ id: id!, desc: dir === "desc" }]);
      }}
      options={sortable.flatMap((c) => [
        { value: `${c.id}:asc`, label: `${columnLabel(c)} ↑` },
        { value: `${c.id}:desc`, label: `${columnLabel(c)} ↓` },
      ])}
    />
  );

  let body: ReactNode;
  if (error) body = <ErrorState compact error={error} onRetry={onRetry} />;
  else if (loading) {
    body = (
      <ul className="space-y-3" aria-busy>
        {Array.from({ length: skeletons }, (_, i) => (
          <li key={i} className="rounded-lg border border-border bg-surface p-4">
            <Skeleton className="h-5 w-2/3" />
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          </li>
        ))}
      </ul>
    );
  } else if (rows.length === 0) {
    body = <EmptyState compact icon={empty.icon ?? "inbox"} title={empty.title} description={empty.description} action={empty.action} />;
  } else {
    body = (
      <ul className="space-y-3" aria-label={label}>
        {rows.map((row) => {
          const cells = new Map(row.getVisibleCells().map((c) => [c.column.id, c]));
          const select = cells.get("__select");
          const actions = cells.get("__actions");
          const title = titleColumn && cells.get(titleColumn.id);
          return (
            <li
              key={row.id}
              data-state={row.getIsSelected() ? "selected" : undefined}
              className="rounded-lg border border-border bg-surface p-4 shadow-sm data-[state=selected]:border-accent data-[state=selected]:bg-accent-subtle/40"
            >
              <div className="flex items-start gap-3">
                {select && (
                  <div className="pt-0.5">
                    <FlexRender cell={select} />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm text-text">
                  {title &&
                    (onRowClick ? (
                      <button type="button" onClick={() => onRowClick(row.original)} className="block w-full min-w-0 rounded-sm text-left focus-ring">
                        <FlexRender cell={title} />
                      </button>
                    ) : (
                      <FlexRender cell={title} />
                    ))}
                </div>
                {actions && (
                  <div className="-mr-2 -mt-2 shrink-0">
                    <FlexRender cell={actions} />
                  </div>
                )}
              </div>
              {detailColumns.length > 0 && (
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3 text-sm">
                  {detailColumns.map((column) => {
                    const cell = cells.get(column.id);
                    return (
                      <div key={column.id} className="min-w-0">
                        <dt className="text-xs font-medium text-text-muted">{columnLabel(column)}</dt>
                        <dd className="mt-0.5 min-w-0 text-text numeric [overflow-wrap:anywhere]">{cell && <FlexRender cell={cell} />}</dd>
                      </div>
                    );
                  })}
                </dl>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {(selectable || sortControl) && !error && (
        <div className="flex items-center gap-3">
          {selectable && rows.length > 0 && (
            <label className="flex shrink-0 items-center gap-2 text-sm text-text-muted">
              <Checkbox
                aria-label="Select all rows on this page"
                checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
                onCheckedChange={(v) => table.toggleAllPageRowsSelected(!!v)}
              />
              All
            </label>
          )}
          {sortControl}
        </div>
      )}
      {body}
    </div>
  );
}

function RowActionsMenu<T>({ row, actions }: { row: T; actions: RowAction<T>[] }) {
  const visible = actions.filter((a) => !a.hidden?.(row));
  if (!visible.length) return null;
  const danger = visible.filter((a) => a.tone === "danger");
  const normal = visible.filter((a) => a.tone !== "danger");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" icon="more" aria-label="Row actions" onClick={(e) => e.stopPropagation()} />
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={(e) => e.stopPropagation()}>
        {normal.map((a) => (
          <DropdownMenuItem key={a.label} icon={a.icon} onSelect={() => a.onSelect(row)}>
            {a.label}
          </DropdownMenuItem>
        ))}
        {danger.length > 0 && normal.length > 0 && <DropdownMenuSeparator />}
        {danger.map((a) => (
          <DropdownMenuItem key={a.label} icon={a.icon} tone="danger" onSelect={() => a.onSelect(row)}>
            {a.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
