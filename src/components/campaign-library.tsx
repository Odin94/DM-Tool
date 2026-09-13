import { useState } from "react";
import { DeleteControl } from "./delete-control";
import { FileDropInput } from "./file-drop-input";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { type Campaign, type Scene, type Sound, type Character, notebook } from "@/lib/campaign";
import { download, exportBackup, importBackup, importMedia } from "@/lib/storage";

type Props = {
  initialKind?: Kind;
  initialId?: string;
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => Promise<void>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: (promise: Promise<unknown>) => void;
  stop: () => void;
};
export type Kind = "scenes" | "sounds" | "music" | "characters";
type Item = Scene | Sound | Character;
const control = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
export function CampaignLibrary({
  campaign: c,
  update,
  open,
  onOpenChange,
  report,
  stop,
  initialKind = "scenes",
  initialId,
}: Props) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const [draft, setDraft] = useState<Item | null>(
    () => c[initialKind].find((x) => x.id === initialId) ?? null,
  );
  const [busy, setBusy] = useState(false);
  const field = (name: string, value: string | number | boolean | null) =>
    setDraft((d) => (d && d.id === draft?.id ? { ...d, [name]: value } : d));
  const save = async () => {
    if (!draft) return;
    setBusy(true);
    try {
      await update((current) => ({
        ...current,
        [kind]: current[kind].some((x) => x.id === draft.id)
          ? current[kind].map((x) => (x.id === draft.id ? draft : x))
          : [...current[kind], draft],
      }));
      setDraft(null);
    } finally {
      setBusy(false);
    }
  };
  const add = () => {
    const base = { id: crypto.randomUUID(), name: "", sceneId: c.activeSceneId, priority: 0 };
    setDraft(
      kind === "scenes"
        ? {
            id: base.id,
            name: "",
            chapter: "",
            description: "",
            background: "",
            video: false,
            musicId: null,
            lightingId: null,
          }
        : kind === "characters"
          ? { ...base, role: "", hp: "", detail: "", notes: "", tone: "bg-sage" }
          : { ...base, source: "", loop: kind === "music", volume: 100, tone: "bg-sage" },
    );
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Campaign library</DialogTitle>
          <DialogDescription>
            Prepare scenes and assets here. Higher priorities appear first. Imported files are kept
            on this device.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2">
          {(["scenes", "sounds", "music", "characters"] as const).map((k) => (
            <Button
              key={k}
              disabled={busy}
              variant={kind === k ? "soft" : "ghost"}
              onClick={() => {
                setKind(k);
                setDraft(null);
              }}
            >
              {k[0]!.toUpperCase() + k.slice(1)}
            </Button>
          ))}
        </div>
        {!draft ? (
          <>
            <div className="flex justify-end">
              <Button onClick={add}>Add {kind === "music" ? "track" : kind.slice(0, -1)}</Button>
            </div>
            <div className="grid gap-2">
              {c[kind].map((item) => (
                <Button
                  key={item.id}
                  variant="quiet"
                  className="h-auto justify-between whitespace-normal text-left"
                  onClick={() => {
                    setDraft({ ...item });
                  }}
                >
                  {item.name}
                  <span className="text-xs text-muted-foreground">Edit</span>
                </Button>
              ))}
            </div>
          </>
        ) : (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              report(save());
            }}
          >
            <label className="block text-sm">
              Name
              <Input required value={draft.name} onChange={(e) => field("name", e.target.value)} />
            </label>
            {"sceneId" in draft && (
              <>
                <label className="block text-sm">
                  Scope
                  <select
                    className={control}
                    value={draft.sceneId ?? ""}
                    onChange={(e) => field("sceneId", e.target.value || null)}
                  >
                    <option value="">General</option>
                    {c.scenes.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  Priority
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    value={draft.priority}
                    onChange={(e) => field("priority", Number(e.target.value))}
                  />
                </label>
              </>
            )}
            {"description" in draft && (
              <>
                <label className="block text-sm">
                  Chapter
                  <Input value={draft.chapter} onChange={(e) => field("chapter", e.target.value)} />
                </label>
                <label className="block text-sm">
                  Description
                  <Textarea
                    value={draft.description}
                    onChange={(e) => field("description", e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  Suggested music
                  <select
                    className={control}
                    value={draft.musicId ?? ""}
                    onChange={(e) => field("musicId", e.target.value || null)}
                  >
                    <option value="">None</option>
                    {c.music.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            {"notes" in draft && (
              <>
                {(["role", "hp", "detail"] as const).map((k) => (
                  <label key={k} className="block text-sm">
                    {k === "hp"
                      ? "Hit points"
                      : k === "detail"
                        ? "Stats / quick reference"
                        : "Role"}
                    <Input value={draft[k]} onChange={(e) => field(k, e.target.value)} />
                  </label>
                ))}
                <label className="block text-sm">
                  Character sheet / notes
                  <Textarea
                    className="min-h-40"
                    value={draft.notes}
                    onChange={(e) => field("notes", e.target.value)}
                  />
                </label>
              </>
            )}
            {("source" in draft || "background" in draft) && (
              <>
                <label className="block text-sm">
                  {"source" in draft ? "Audio" : "Background"} URL
                  <Input
                    type="url"
                    value={
                      ("source" in draft ? draft.source : draft.background).startsWith("media:")
                        ? ""
                        : "source" in draft
                          ? draft.source
                          : draft.background
                    }
                    onChange={(e) =>
                      field("source" in draft ? "source" : "background", e.target.value)
                    }
                    placeholder={
                      ("source" in draft ? draft.source : draft.background).startsWith("media:")
                        ? "Local file attached · enter URL to replace"
                        : "https://…"
                    }
                  />
                </label>
                <FileDropInput
                  label="Import media"
                  accept={"source" in draft ? "audio/*" : "image/*,video/*"}
                  disabled={busy}
                  onFile={(file) => {
                    setBusy(true);
                    report(
                      importMedia(file)
                        .then((source) => {
                          field("source" in draft ? "source" : "background", source);
                          if ("background" in draft) field("video", file.type.startsWith("video/"));
                        })
                        .finally(() => setBusy(false)),
                    );
                  }}
                />
                {"volume" in draft && (
                  <label className="block text-sm">
                    Volume · {draft.volume}%
                    <Input
                      aria-label="Asset volume"
                      type="range"
                      min="0"
                      max="100"
                      value={draft.volume}
                      onChange={(e) => field("volume", Number(e.target.value))}
                    />
                    <span className="text-xs text-muted-foreground">
                      Relative to the master volume.
                    </span>
                  </label>
                )}
                {"background" in draft && (
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.video}
                      onChange={(e) => field("video", e.target.checked)}
                    />
                    Video background (muted, looped)
                  </label>
                )}
                {"loop" in draft && kind === "sounds" && (
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.loop}
                      onChange={(e) => field("loop", e.target.checked)}
                    />
                    Loop until stopped
                  </label>
                )}
              </>
            )}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                Save
              </Button>
              <Button type="button" variant="ghost" onClick={() => setDraft(null)}>
                Cancel
              </Button>
              {c[kind].some((x) => x.id === draft.id) && (
                <DeleteControl
                  kind={kind}
                  id={draft.id}
                  name={draft.name}
                  update={update}
                  disabled={busy || (kind === "scenes" && c.scenes.length === 1)}
                  onDeleted={() => {
                    stop();
                    setDraft(null);
                    onOpenChange(false);
                  }}
                />
              )}
            </div>
          </form>
        )}
        <details className="border-t pt-4">
          <summary className="cursor-pointer text-sm font-bold">
            Campaign settings & backups
          </summary>
          <div className="mt-3 space-y-3">
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                report(
                  update((current) => ({
                    ...current,
                    name: String(data.get("name")),
                    session: Number(data.get("session")),
                  })),
                );
              }}
            >
              <Input aria-label="Campaign name" name="name" required defaultValue={c.name} />
              <Input
                aria-label="Session number"
                name="session"
                type="number"
                min="1"
                required
                defaultValue={c.session}
              />
              <Button>Save settings</Button>
            </form>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="quiet"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  report(exportBackup(c).finally(() => setBusy(false)));
                }}
              >
                Export full backup
              </Button>
              <Button variant="quiet" onClick={() => download("notes.md", notebook(c))}>
                Export notes.md
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Restore replaces this campaign. Export a backup first. Hue pairing keys are never
              included.
            </p>
            <FileDropInput
              label="Restore backup"
              accept="application/json,.json"
              disabled={busy}
              onFile={(file) => {
                setBusy(true);
                stop();
                report(
                  importBackup(file)
                    .then((next) => update(() => next))
                    .finally(() => setBusy(false)),
                );
              }}
            />
          </div>
        </details>
      </DialogContent>
    </Dialog>
  );
}
