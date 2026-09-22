import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { VirtualList } from "./virtual-list";
import { useWorkspace } from "@/hooks/use-campaign";
import { newCampaign, archiveExpiry, restoreNote, type Workspace } from "@/lib/workspace";
import type { Sound, Lighting } from "@/lib/campaign";
import { importMedia } from "@/lib/storage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Toaster } from "./ui/sonner";
import { FileDropInput } from "./file-drop-input";
import { HueDialog } from "./hue-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "./ui/alert-dialog";

export function WorkspacePages({
  page,
  tab,
}: {
  page: "campaigns" | "library";
  tab: "sounds" | "music" | "lighting" | "archive";
}) {
  const state = useWorkspace();
  const navigate = useNavigate();
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [confirm, setConfirm] = useState<{ name: string; run: (w: Workspace) => Workspace } | null>(
    null,
  );
  const report = (p: Promise<unknown>) => {
    void p.catch((e) => setError(String(e)));
  };
  if (!state.data)
    return (
      <main className="p-8">
        <p>{state.error ? String(state.error) : "Opening library…"}</p>
        <Button onClick={() => state.refetch()}>Retry</Button>
      </main>
    );
  const w = state.data;
  const entry = w.campaigns.find((c) => c.id === editing);
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-24 sm:px-8">
      <Toaster />
      <nav className="flex flex-wrap gap-2" aria-label="Workspace">
        <Button variant="quiet" asChild>
          <Link to="/" search={{ page: "session" }}>
            Session
          </Link>
        </Button>
        <Button variant={page === "campaigns" ? "soft" : "ghost"} asChild>
          <Link to="/" search={{ page: "campaigns" }}>
            Campaigns
          </Link>
        </Button>
        <Button variant={page === "library" ? "soft" : "ghost"} asChild>
          <Link to="/" search={{ page: "library", tab }}>
            General library
          </Link>
        </Button>
      </nav>
      <header>
        <h1 className="font-display text-3xl">
          {page === "campaigns" ? "Your campaigns" : "General library"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {page === "campaigns"
            ? "Prepare a world, gather your players, and pick up where you left off."
            : "Reusable audio and lighting for every table. Import a copy into any campaign."}
        </p>
      </header>
      {error && (
        <div role="alert" className="text-destructive">
          {error}
          <Button variant="ghost" onClick={() => setError("")}>
            Dismiss
          </Button>
        </div>
      )}
      {page === "campaigns" ? (
        <>
          <Button onClick={() => setEditing("new")}>Create campaign</Button>
          {editing && (
            <form
              key={editing}
              className="grid gap-3 rounded-lg bg-card p-5"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget);
                const name = String(data.get("name")).trim(),
                  game = String(data.get("game")).trim(),
                  players = String(data.get("players"))
                    .split("\n")
                    .map((p) => p.trim())
                    .filter(Boolean);
                if (!name) return;
                report(
                  state
                    .update((current) =>
                      editing === "new"
                        ? {
                            ...current,
                            campaigns: [
                              ...current.campaigns,
                              {
                                id: crypto.randomUUID(),
                                campaign: newCampaign(name, game, players),
                              },
                            ],
                          }
                        : {
                            ...current,
                            campaigns: current.campaigns.map((c) =>
                              c.id === editing
                                ? { ...c, campaign: { ...c.campaign, name, game, players } }
                                : c,
                            ),
                          },
                    )
                    .then(() => setEditing(null)),
                );
              }}
            >
              <label>
                Name
                <Input name="name" required defaultValue={entry?.campaign.name} />
              </label>
              <label>
                Game / system
                <Input
                  name="game"
                  placeholder="e.g. Dungeons & Dragons"
                  defaultValue={entry?.campaign.game}
                />
              </label>
              <label>
                Players <span className="text-xs text-muted-foreground">· one per line</span>
                <Textarea name="players" defaultValue={entry?.campaign.players?.join("\n")} />
              </label>
              <div className="flex gap-2">
                <Button disabled={state.saving}>Save campaign</Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {w.campaigns.map((c) => (
              <article key={c.id} className="space-y-3 rounded-lg bg-card p-5">
                <h2 className="font-display text-xl">{c.campaign.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {c.campaign.game || "No game specified"} · {c.campaign.players?.length ?? 0}{" "}
                  players · Session {c.campaign.session}
                </p>
                {!!c.campaign.players?.length && (
                  <p className="text-sm">{c.campaign.players.join(", ")}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    disabled={state.saving}
                    onClick={() =>
                      report(
                        state
                          .update((current) => ({ ...current, activeCampaignId: c.id }))
                          .then(() => {
                            void navigate({ to: "/", search: { page: "session" } });
                          }),
                      )
                    }
                  >
                    {w.activeCampaignId === c.id ? "Continue session" : "Open campaign"}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(c.id)}>
                    Edit
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Library sections">
            {(["sounds", "music", "lighting", "archive"] as const).map((t) => (
              <Button key={t} asChild variant={tab === t ? "soft" : "ghost"}>
                <Link to="/" search={{ page: "library", tab: t }}>
                  {t === "archive" ? "Note archive" : t[0]!.toUpperCase() + t.slice(1)}
                </Link>
              </Button>
            ))}
          </nav>
          {tab === "archive" ? (
            <>
              <p className="text-sm text-muted-foreground">
                Notes stay here for three months after deletion. Restore returns them to their
                original scene, or General if that scene no longer exists.
              </p>
              <Input
                aria-label="Search archived notes"
                placeholder="Find a note, campaign, or scene…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {[...w.campaigns]
                .sort((a, b) => a.campaign.name.localeCompare(b.campaign.name))
                .map((c) => {
                  const notes = [...(c.campaign.archivedNotes ?? [])]
                    .filter((n) =>
                      `${c.campaign.name} ${n.sceneName} ${n.text}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .sort(
                      (a, b) =>
                        a.sceneName.localeCompare(b.sceneName) ||
                        b.archivedAt.localeCompare(a.archivedAt),
                    );
                  return (
                    notes.length > 0 && (
                      <section key={c.id} className="space-y-3">
                        <h2 className="font-display text-xl">{c.campaign.name}</h2>
                        <VirtualList
                          items={notes}
                          estimate={150}
                          render={(n) => (
                            <article
                              key={n.id}
                              className="rounded-md bg-card p-4 [content-visibility:auto]"
                            >
                              <p className="text-xs text-muted-foreground">
                                {n.sceneName} · Expires{" "}
                                {archiveExpiry(n.archivedAt).toLocaleDateString()}
                              </p>
                              <p className="my-2 whitespace-pre-wrap text-sm">{n.text}</p>
                              <div className="flex gap-2">
                                <Button
                                  variant="quiet"
                                  disabled={state.saving}
                                  onClick={() =>
                                    report(
                                      state.update((current) => ({
                                        ...current,
                                        campaigns: current.campaigns.map((entry) =>
                                          entry.id === c.id
                                            ? {
                                                ...entry,
                                                campaign: restoreNote(entry.campaign, n.id),
                                              }
                                            : entry,
                                        ),
                                      })),
                                    )
                                  }
                                >
                                  Restore
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  aria-label="Permanently delete note"
                                  onClick={() =>
                                    setConfirm({
                                      name: "this note permanently",
                                      run: (current) => ({
                                        ...current,
                                        campaigns: current.campaigns.map((entry) =>
                                          entry.id === c.id
                                            ? {
                                                ...entry,
                                                campaign: {
                                                  ...entry.campaign,
                                                  archivedNotes:
                                                    entry.campaign.archivedNotes?.filter(
                                                      (note) => note.id !== n.id,
                                                    ),
                                                },
                                              }
                                            : entry,
                                        ),
                                      }),
                                    })
                                  }
                                >
                                  <Trash2 />
                                </Button>
                              </div>
                            </article>
                          )}
                        />
                      </section>
                    )
                  );
                })}
              {w.campaigns.every((c) => !c.campaign.archivedNotes?.length) && (
                <p className="py-8 text-muted-foreground">No archived notes.</p>
              )}
            </>
          ) : (
            <LibraryAssets
              key={tab}
              kind={tab}
              workspace={w}
              update={state.update}
              report={report}
              confirm={setConfirm}
            />
          )}
        </>
      )}
      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => {
          if (!open && !state.saving) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirm?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Copies already imported into campaigns are kept.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={state.saving}>Keep it</AlertDialogCancel>
            <Button
              disabled={state.saving}
              onClick={() =>
                confirm && report(state.update(confirm.run).then(() => setConfirm(null)))
              }
            >
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function LibraryAssets({
  kind,
  workspace: w,
  update,
  report,
  confirm,
}: {
  kind: "sounds" | "music" | "lighting";
  workspace: Workspace;
  update: (fn: (w: Workspace) => Workspace) => Promise<void>;
  report: (p: Promise<unknown>) => void;
  confirm: (value: { name: string; run: (w: Workspace) => Workspace }) => void;
}) {
  const [draft, setDraft] = useState<Sound | Lighting | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          aria-label="Search assets"
          placeholder="Find an asset…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          onClick={() =>
            setDraft(
              kind === "lighting"
                ? { id: crypto.randomUUID(), name: "", description: "", hueSceneId: "" }
                : {
                    id: crypto.randomUUID(),
                    name: "",
                    source: "",
                    loop: kind === "music",
                    sceneId: null,
                    volume: 100,
                    priority: 0,
                    tone: "bg-sage",
                  },
            )
          }
        >
          Create {kind === "lighting" ? "preset" : "audio"}
        </Button>
      </div>
      {draft && (
        <form
          className="grid gap-3 rounded-lg bg-card p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!draft.name.trim()) return;
            setBusy(true);
            report(
              update((current) => ({
                ...current,
                library: {
                  ...current.library,
                  [kind]: [
                    ...current.library[kind].filter((x) => x.id !== draft.id),
                    { ...draft, name: draft.name.trim() },
                  ],
                },
              }))
                .then(() => setDraft(null))
                .finally(() => setBusy(false)),
            );
          }}
        >
          <label>
            Name
            <Input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          {"source" in draft ? (
            <>
              <label>
                Audio URL
                <Input
                  value={draft.source.startsWith("media:") ? "" : draft.source}
                  type="url"
                  placeholder={
                    draft.source.startsWith("media:") ? "Local file attached" : "https://…"
                  }
                  onChange={(e) => setDraft({ ...draft, source: e.target.value })}
                />
              </label>
              <FileDropInput
                label="Import audio"
                accept="audio/*"
                disabled={busy}
                onFile={(file) => {
                  setBusy(true);
                  report(
                    importMedia(file)
                      .then((source) =>
                        setDraft((current) =>
                          current?.id === draft.id ? { ...current, source } : current,
                        ),
                      )
                      .finally(() => setBusy(false)),
                  );
                }}
              />
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={draft.loop}
                  onChange={(e) => setDraft({ ...draft, loop: e.target.checked })}
                />
                Loop
              </label>
              <label>
                Volume · {draft.volume}%
                <Input
                  type="range"
                  min={0}
                  max={100}
                  value={draft.volume}
                  onChange={(e) => setDraft({ ...draft, volume: Number(e.target.value) })}
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Description
                <Textarea
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </label>
              <label className="flex gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!draft.bluetooth}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      bluetooth: e.target.checked ? { power: true, brightness: 75 } : undefined,
                    })
                  }
                />
                Use a Bluetooth light
              </label>
              {draft.bluetooth ? (
                <>
                  <label className="flex gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={draft.bluetooth.power}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          bluetooth: { ...draft.bluetooth!, power: e.target.checked },
                        })
                      }
                    />
                    Light on
                  </label>
                  <label>
                    Brightness · {draft.bluetooth.brightness}%
                    <Input
                      type="range"
                      min={1}
                      max={100}
                      value={draft.bluetooth.brightness}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          bluetooth: { ...draft.bluetooth!, brightness: Number(e.target.value) },
                        })
                      }
                    />
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Applies to the single Hue light connected from Lighting. Connect the light
                    before applying this preset.
                  </p>
                </>
              ) : (
                <>
                  <HueDialog
                    suggested={draft.hueSceneId || null}
                    onSelect={async (id) => setDraft({ ...draft, hueSceneId: id })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {draft.hueSceneId
                      ? "Hue scene linked. This preset recalls it on the paired bridge."
                      : "You can save a lighting idea now, then link a Hue scene from the desktop app later."}
                  </p>
                </>
              )}
            </>
          )}
          <div className="flex gap-2">
            <Button disabled={busy}>Save asset</Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setDraft(null)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      <VirtualList<Sound | Lighting>
        items={w.library[kind].filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))}
        render={(item) => (
          <article
            key={item.id}
            className="flex items-center gap-3 rounded-md bg-card p-4 [content-visibility:auto]"
          >
            <span className="mr-auto">{item.name}</span>
            <Button variant="quiet" onClick={() => setDraft({ ...item })}>
              Edit
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Delete ${item.name}`}
              onClick={() =>
                confirm({
                  name: item.name,
                  run: (current) => ({
                    ...current,
                    library: {
                      ...current.library,
                      [kind]: current.library[kind].filter((x) => x.id !== item.id),
                    },
                  }),
                })
              }
            >
              <Trash2 />
            </Button>
          </article>
        )}
      />
      {w.library[kind].length === 0 && (
        <p className="py-8 text-muted-foreground">Create your first reusable asset above.</p>
      )}
    </div>
  );
}
