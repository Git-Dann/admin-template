import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { z } from "zod";
import { Button } from "../components/button";
import { Card, CardBody } from "../components/card";
import { DateField, RadioCards, RadioCardsField, SelectField, TextField, ToggleField, ToggleRow, useZodForm } from "./fields";
import { FileChip, FileDropzone, type UploadedFile } from "./dropzone";

const meta = { title: "Forms/Form kit" } satisfies Meta;
export default meta;
type Story = StoryObj;

const schema = z.object({
  title: z.string().min(3, "Give the notification a title of at least 3 characters"),
  body: z.string().max(140, "Keep it under 140 characters").optional(),
  audience: z.enum(["all", "subscribers", "lapsed"]),
  platform: z.string().min(1, "Pick a platform"),
  date: z.string().min(1, "Choose a send date"),
  time: z.string().min(1, "Choose a time"),
  sound: z.boolean(),
});

export const ValidatedForm: Story = {
  render: function Render() {
    const form = useZodForm(schema, { title: "", body: "", audience: "all", platform: "", date: "", time: "", sound: true });
    const [sent, setSent] = useState<string | null>(null);
    return (
      <Card className="max-w-xl">
        <CardBody>
          <form className="grid gap-5" onSubmit={form.handleSubmit((v) => setSent(JSON.stringify(v, null, 2)))} noValidate>
            <TextField control={form.control} name="title" label="Title" required placeholder="New episode out now" />
            <TextField control={form.control} name="body" label="Message" multiline optional description="Shown under the title on the lock screen." />
            <RadioCardsField
              control={form.control}
              name="audience"
              label="Audience"
              columns={3}
              options={[
                { value: "all", title: "Everyone", icon: "users" },
                { value: "subscribers", title: "Subscribers", icon: "star" },
                { value: "lapsed", title: "Lapsed", icon: "clock" },
              ]}
            />
            <SelectField control={form.control} name="platform" label="Platform" options={[{ value: "all", label: "All platforms" }, { value: "ios", label: "iOS" }, { value: "android", label: "Android" }]} />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField control={form.control} name="date" label="Send date" />
              <DateField control={form.control} name="time" label="Time" kind="time" />
            </div>
            <ToggleField control={form.control} name="sound" label="Play sound" description="Uses the default notification sound." icon="notifications" />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => form.reset()}>Reset</Button>
              <Button type="submit">Schedule</Button>
            </div>
            {sent && <pre className="rounded-md bg-surface-raised p-3 text-xs">{sent}</pre>}
          </form>
        </CardBody>
      </Card>
    );
  },
};

export const Toggles: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    const [choice, setChoice] = useState("ios");
    return (
      <div className="grid max-w-xl gap-4">
        <ToggleRow title="Splash animation" description="Lottie JSON with a fallback image" icon="sparkles" checked={on} onCheckedChange={setOn}>
          <p className="text-sm text-text-muted">Upload slot goes here.</p>
        </ToggleRow>
        <RadioCards label="Platform" value={choice} onValueChange={setChoice} options={[{ value: "ios", title: "iOS", description: "In build 4.12", icon: "phone" }, { value: "web", title: "Web", description: "Live immediately", icon: "globe" }]} />
      </div>
    );
  },
};

export const Uploads: Story = {
  render: function Render() {
    const [file, setFile] = useState<UploadedFile | null>(null);
    return (
      <div className="grid max-w-xl gap-4">
        <FileDropzone
          value={file}
          onChange={(f) => setFile(f)}
          accept=".json,application/json"
          maxSize={2 * 1024 * 1024}
          hint="Lottie JSON, up to 2 MB"
          validate={async (f) => {
            try {
              const json = JSON.parse(await f.text());
              if (!Array.isArray(json.layers)) return { error: 'Not a Lottie file: missing "layers".' };
              return { meta: `Lottie · ${json.w}×${json.h}` };
            } catch {
              return { error: "That file isn't valid JSON." };
            }
          }}
        />
        <FileChip file={{ name: "app-icon-halloween.png", size: 182_000, type: "image/png", meta: "1024×1024 · PNG" }} status={{ state: "valid", message: "Meets App Store requirements" }} onReplace={() => {}} onRemove={() => {}} />
        <FileChip file={{ name: "splash.json", size: 3_400_000, type: "application/json" }} status={{ state: "invalid", message: "File is 3.2 MB. The limit is 2 MB." }} onReplace={() => {}} onRemove={() => {}} />
      </div>
    );
  },
};
