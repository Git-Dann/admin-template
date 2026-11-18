import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { ConfirmDialog, Dialog, DialogContent, DialogTrigger, Drawer, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, Popover, PopoverContent, PopoverTrigger, Tooltip } from "./overlays";
import { Toaster, toast } from "./feedback";
import { StatusPill } from "./badges";

const meta = { title: "Overlays/Dialogs, drawers and menus" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const All: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="secondary">Dialog</Button>
        </DialogTrigger>
        <DialogContent title="Edit code" description="Changes apply to new redemptions only." footer={<Button>Save</Button>}>
          <p className="text-sm">Dialog body</p>
        </DialogContent>
      </Dialog>
      <Drawer title="Priya Kaur" description="priya@example.com" trigger={<Button variant="secondary">Drawer</Button>} footer={<Button>Save</Button>}>
        <div className="space-y-3 text-sm">
          <StatusPill status="active" />
          <p>Detail drawer content.</p>
        </div>
      </Drawer>
      <ConfirmDialog
        tone="danger"
        title="Delete this theme?"
        description="Halloween 2026 will be removed. This can't be undone."
        confirmLabel="Delete theme"
        onConfirm={() => { toast.success("Theme deleted"); }}
        trigger={<Button variant="danger">Confirm dialog</Button>}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" iconRight="chevron-down">Menu</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem icon="edit">Edit</DropdownMenuItem>
          <DropdownMenuItem icon="copy">Duplicate</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem icon="trash" tone="danger">Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="secondary">Popover</Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 text-sm">Popover content</PopoverContent>
      </Popover>
      <Tooltip content="Copies the code">
        <Button variant="ghost">Tooltip</Button>
      </Tooltip>
      <Button variant="secondary" onClick={() => toast.success("Saved", { description: "Your changes are live." })}>Toast</Button>
      <Toaster />
    </div>
  ),
};
