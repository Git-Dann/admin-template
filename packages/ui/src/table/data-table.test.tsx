import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createColumns, DataTable } from "./data-table";

type Row = { id: string; name: string; amount: number };
const rows: Row[] = Array.from({ length: 23 }, (_, i) => ({ id: `r${i}`, name: `Name ${String(i).padStart(2, "0")}`, amount: (i * 7) % 50 }));
const col = createColumns<Row>();
const columns = col.columns([col.accessor("name", { header: "Name" }), col.accessor("amount", { header: "Amount", meta: { align: "right" } })]);

const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]!).getAllByRole("row");

describe("DataTable", () => {
  it("paginates and reports the visible range", async () => {
    render(<DataTable label="Rows" data={rows} columns={columns} getRowId={(r) => r.id} />);
    expect(bodyRows()).toHaveLength(10);
    expect(screen.getByText("Showing 1–10 of 23")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("Showing 11–20 of 23")).toBeInTheDocument();
  });

  it("sorts by a column and sets aria-sort", async () => {
    render(<DataTable label="Rows" data={rows} columns={columns} getRowId={(r) => r.id} />);
    const header = screen.getByRole("columnheader", { name: /Amount/ });
    await userEvent.click(within(header).getByRole("button"));
    const sorted = header.getAttribute("aria-sort");
    expect(sorted === "ascending" || sorted === "descending").toBe(true);
  });

  it("selects rows and shows bulk actions", async () => {
    const onSelectionChange = vi.fn();
    render(
      <DataTable
        label="Rows"
        data={rows}
        columns={columns}
        getRowId={(r) => r.id}
        selectable
        onSelectionChange={onSelectionChange}
        bulkActions={(ids) => <span>Bulk {ids.length}</span>}
      />,
    );
    await userEvent.click(screen.getByRole("checkbox", { name: "Select all rows on this page" }));
    expect(screen.getByText("Bulk 10")).toBeInTheDocument();
    expect(onSelectionChange).toHaveBeenLastCalledWith(expect.arrayContaining(["r0", "r9"]));
  });

  it("shows empty, loading and error states", () => {
    const { rerender } = render(<DataTable label="Rows" data={[]} columns={columns} getRowId={(r) => r.id} empty={{ title: "Nothing to see" }} />);
    expect(screen.getByText("Nothing to see")).toBeInTheDocument();
    rerender(<DataTable label="Rows" data={undefined} loading columns={columns} getRowId={(r) => r.id} />);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    rerender(<DataTable label="Rows" data={[]} error={new Error("Boom")} onRetry={() => {}} columns={columns} getRowId={(r) => r.id} />);
    expect(screen.getByText("Boom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try again/ })).toBeInTheDocument();
  });

  it("calls onRowClick from the keyboard", async () => {
    const onRowClick = vi.fn();
    render(<DataTable label="Rows" data={rows.slice(0, 2)} columns={columns} getRowId={(r) => r.id} onRowClick={onRowClick} />);
    bodyRows()[0]!.focus();
    await userEvent.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
