import type { Meta, StoryObj } from "@storybook/react-vite";
import { Button } from "./button";
import { Callout, DataState, EmptyState, ErrorState, Skeleton, Spinner } from "./feedback";

const meta = { title: "Feedback/States and callouts" } satisfies Meta;
export default meta;
type Story = StoryObj;

export const Callouts: Story = {
  render: () => (
    <div className="grid max-w-2xl gap-3">
      <Callout title="Alternate app icons ship with the app">New icons need an app release. This theme's icon is in build 4.12.</Callout>
      <Callout tone="warning" title="Requires release">The selected icon is not in any shipped build yet.</Callout>
      <Callout tone="success">All assets passed validation.</Callout>
      <Callout tone="danger" title="Splash file is invalid" action={<Button size="sm" variant="secondary">Replace</Button>}>Lottie JSON is missing the "layers" array.</Callout>
    </div>
  ),
};

export const States: Story = {
  render: () => (
    <div className="grid gap-6 md:grid-cols-3">
      <EmptyState title="No codes yet" description="Create your first promo code to get started." action={<Button icon="plus">New code</Button>} />
      <ErrorState error={new Error("The reports service didn't respond.")} onRetry={() => {}} />
      <div className="space-y-3">
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-4/5" />
        <Spinner />
      </div>
    </div>
  ),
};

export const DataStateHelper: Story = {
  render: () => (
    <div className="grid gap-6 md:grid-cols-3">
      <DataState query={{ isLoading: true }}>{() => null}</DataState>
      <DataState query={{ data: [] as string[] }}>{() => null}</DataState>
      <DataState query={{ data: ["Ready"] }}>{(d) => <p>{d[0]}</p>}</DataState>
    </div>
  ),
};
