import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CodeChip, StatusPill } from "./badges";
import { StatCard } from "./stat";
import { FileDropzone } from "../form/dropzone";
import { ShareBars } from "../charts/charts";
import { Icon, IconProvider } from "../icons";

describe("components", () => {
  it("StatusPill maps known statuses to tones and capitalises", () => {
    render(<StatusPill status="scheduled" />);
    expect(screen.getByText("Scheduled").className).toContain("text-info");
  });

  it("CodeChip copies to the clipboard and announces it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    render(<CodeChip code="FELLAS20" />);
    await userEvent.click(screen.getByRole("button", { name: "Copy FELLAS20" }));
    expect(writeText).toHaveBeenCalledWith("FELLAS20");
    expect(screen.getByRole("status")).toHaveTextContent("Copied");
  });

  it("StatCard treats a rise in churn as bad when upIsGood is false", () => {
    render(<StatCard label="Churn" value="3.2%" delta={{ value: 0.4, upIsGood: false }} />);
    expect(screen.getByText("+0.4%").className).toContain("text-danger");
  });

  it("ShareBars percentages sum to 100 and group the tail into Other", () => {
    render(<ShareBars max={3} items={[{ label: "A", value: 1 }, { label: "B", value: 1 }, { label: "C", value: 1 }, { label: "D", value: 1 }]} />);
    const pct = screen.getAllByText(/%$/).map((n) => Number(n.textContent!.replace("%", "")));
    expect(pct.reduce((a, b) => a + b, 0)).toBe(100);
    expect(screen.getByText("Other")).toBeInTheDocument();
  });

  it("FileDropzone rejects the wrong type and runs custom validation", async () => {
    const onChange = vi.fn();
    const { container } = render(<FileDropzone value={null} onChange={onChange} accept=".json" validate={async () => ({ error: "Not Lottie" })} />);
    const input = container.querySelector("input[type=file]") as HTMLInputElement;
    await act(() => userEvent.upload(input, new File(["x"], "a.png", { type: "image/png" }), { applyAccept: false }));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: "a.png" }), expect.objectContaining({ state: "invalid" }));
    await act(() => userEvent.upload(input, new File(["{}"], "a.json", { type: "application/json" })));
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ name: "a.json" }), { state: "invalid", message: "Not Lottie" });
  });

  it("Icon defaults to Heroicons, swaps sets through IconProvider and hides decorative icons", () => {
    const { container, rerender } = render(<Icon name="users" />);
    const heroicons = container.innerHTML;
    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true");
    rerender(
      <IconProvider set="lucide">
        <Icon name="users" />
      </IconProvider>,
    );
    expect(container.innerHTML).not.toBe(heroicons);
  });
});
