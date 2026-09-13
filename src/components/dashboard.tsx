import { useEffect, useRef, useState } from "react";
import {
  BookOpenText,
  CircleStop,
  Flame,
  Map,
  Maximize2,
  Menu,
  Music2,
  Pause,
  Pin,
  Play,
  Plus,
  ScrollText,
  Sparkles,
  Swords,
  Trees,
  UsersRound,
  Volume2,
  X,
} from "lucide-react";
import sceneImage from "@/assets/whispering-woods.jpg";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Slider } from "./ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { cn } from "@/lib/utils";
import { useCampaign } from "@/hooks/use-campaign";
import { AudioEngine } from "@/lib/audio";
import { visibleAssets, type Campaign, type Character } from "@/lib/campaign";
import { resolveMedia } from "@/lib/storage";
import { CampaignLibrary, type Kind } from "./campaign-library";
import { Toaster } from "./ui/sonner";
import { DeleteControl } from "./delete-control";
import { HueDialog } from "./hue-dialog";

export function Dashboard() {
  const state = useCampaign();
  if (state.isPending)
    return (
      <main className="grid min-h-screen place-items-center">
        <p>Opening your campaign…</p>
      </main>
    );
  if (state.error || !state.data)
    return (
      <main className="mx-auto max-w-lg p-8">
        <h1 className="font-display text-2xl">Your campaign couldn’t be opened</h1>
        <p className="my-4">{String(state.error)}</p>
        <p className="mb-4 text-sm">
          Your saved data has not been replaced. On desktop, a previous copy is kept beside
          campaign.json in the app data folder.
        </p>
        <Button onClick={() => state.refetch()}>Retry</Button>
      </main>
    );
  return <Session campaign={state.data} update={state.update} saving={state.saving} />;
}

function Session({
  campaign: c,
  update,
  saving,
}: {
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => Promise<void>;
  saving: boolean;
}) {
  const [soundScope, setSoundScope] = useState("scene");
  const [characterScope, setCharacterScope] = useState("scene");
  const [noteScope, setNoteScope] = useState("scene");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [library, setLibrary] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<{ kind: Kind; id: string }>({
    kind: "scenes",
    id: "",
  });
  const openLibrary = (kind: Kind = "scenes", id = "") => {
    setLibraryTarget({ kind, id });
    setLibrary(true);
  };
  const [scenePicker, setScenePicker] = useState(false);
  const [sheet, setSheet] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [background, setBackground] = useState(sceneImage);
  const [playback, setPlayback] = useState<ReturnType<AudioEngine["snapshot"]>>({
    effects: [],
    musicId: null,
    musicPlaying: false,
  });
  const engine = useRef<AudioEngine | null>(null);
  if (!engine.current)
    engine.current = new AudioEngine(() => setPlayback(engine.current!.snapshot()), setError);
  const audio = engine.current;
  const scene = c.scenes.find((s) => s.id === c.activeSceneId)!;
  const currentMusic = c.music.find((m) => m.id === playback.musicId);
  const suggestedMusic =
    c.music.find((m) => m.id === scene.musicId) ??
    visibleAssets(c.music, scene.id)[0] ??
    visibleAssets(c.music, null)[0];
  const track = currentMusic ?? suggestedMusic;
  const sounds = visibleAssets(c.sounds, soundScope === "scene" ? scene.id : null);
  const characters = (
    characterScope === "all"
      ? [...c.characters].sort((a, b) => b.priority - a.priority)
      : visibleAssets(c.characters, characterScope === "scene" ? scene.id : null)
  ).filter((x) => (x.name + " " + x.role).toLowerCase().includes(search.toLowerCase()));
  const pinned = c.pinned
    .map((id) => c.characters.find((x) => x.id === id))
    .filter((x): x is Character => !!x);
  const selected = c.characters.find((x) => x.id === sheet);
  const report = (promise: Promise<unknown>) => {
    void promise.catch((e) => setError(e instanceof Error ? e.message : String(e)));
  };
  const togglePin = (id: string) =>
    report(
      update((current) => ({
        ...current,
        pinned: current.pinned.includes(id)
          ? current.pinned.filter((x) => x !== id)
          : [...current.pinned, id],
      })),
    );
  useEffect(() => {
    audio.setVolumes(c.musicVolume, c.soundVolume);
  }, [audio, c.musicVolume, c.soundVolume]);
  useEffect(() => {
    audio.setAssetVolumes(c.sounds, c.music);
  }, [audio, c.sounds, c.music]);
  useEffect(() => () => audio.stopAll(), [audio]);
  useEffect(() => {
    let cancelled = false;
    setBackground(sceneImage);
    if (scene.background)
      resolveMedia(scene.background)
        .then((url) => {
          if (!cancelled) setBackground(url);
        })
        .catch((e) => {
          if (!cancelled) setError(String(e));
        });
    return () => {
      cancelled = true;
    };
  }, [scene.background]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ".") {
        e.preventDefault();
        audio.stopAll();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [audio]);
  const saveNote = async () => {
    const text = note.trim();
    if (!text) return;
    const sceneId = noteScope === "scene" ? scene.id : null;
    await update((current) => ({
      ...current,
      notes: [
        { id: crypto.randomUUID(), sceneId, text, createdAt: new Date().toISOString() },
        ...current.notes,
      ],
    }));
    setNote((current) => (current.trim() === text ? "" : current));
  };
  const changeScene = (id: string) =>
    report(
      update((current) => ({ ...current, activeSceneId: id })).then(() => {
        setScenePicker(false);
        setSoundScope("scene");
        setCharacterScope("scene");
      }),
    );
  const go = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  const backgroundElement = (full = false) =>
    scene.video && scene.background && background !== sceneImage ? (
      <video
        key={background}
        src={background}
        autoPlay
        loop
        muted
        playsInline
        className={
          full
            ? "max-h-[80dvh] w-full object-contain"
            : "absolute inset-0 h-full w-full object-cover"
        }
        onError={() => setError("This video could not be loaded. Check its format or URL.")}
      />
    ) : (
      <img
        src={background}
        alt={scene.name}
        width={1536}
        height={864}
        className={
          full
            ? "max-h-[80dvh] w-full object-contain"
            : "absolute inset-0 h-full w-full object-cover object-center"
        }
        onError={() => {
          setBackground(sceneImage);
          setError("This background could not be loaded.");
        }}
      />
    );
  return (
    <main className="min-h-screen pb-20 lg:pb-8">
      <Toaster position="bottom-right" offset={80} />
      <header className="border-b border-border bg-card/95">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
              <Flame className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl font-bold leading-none">Hearthkeeper</p>
              <p className="mt-1 truncate text-[11px] font-semibold uppercase text-muted-foreground">
                {c.name} · Session {c.session}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span
              role="status"
              className="hidden text-xs font-semibold text-muted-foreground sm:block"
            >
              {saving ? "Saving…" : "Local campaign"}
            </span>
            <Button
              variant="quiet"
              size="icon"
              aria-label="Open scenes"
              onClick={() => setScenePicker(true)}
            >
              <Map />
            </Button>
            <Button
              variant="quiet"
              size="icon"
              aria-label="Open campaign library"
              onClick={() => openLibrary()}
            >
              <Menu />
            </Button>
          </div>
        </div>
      </header>
      {error && (
        <div
          role="alert"
          className="mx-auto flex max-w-[1440px] items-center justify-between gap-3 bg-destructive/10 px-5 py-3 text-sm"
        >
          <p>{error}</p>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Dismiss error"
            onClick={() => setError("")}
          >
            <X />
          </Button>
        </div>
      )}
      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative min-h-[228px] overflow-hidden rounded-lg bg-scene text-scene-foreground shadow-sm">
          {backgroundElement()}
          <div className="absolute inset-0 bg-gradient-to-r from-scene via-scene/80 to-scene/15" />
          <div className="relative flex min-h-[228px] flex-col justify-between gap-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3 border-scene-foreground/25 bg-scene-foreground/15 text-scene-foreground hover:bg-scene-foreground/15">
                  {scene.chapter || "CURRENT SCENE"}
                </Badge>
                <h1 className="font-display text-3xl font-bold sm:text-4xl">{scene.name}</h1>
                <p className="mt-2 max-w-xl text-sm text-scene-foreground/80">
                  {scene.description}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-scene-foreground hover:bg-scene-foreground/15 hover:text-scene-foreground"
                aria-label="Expand scene image"
                onClick={() => setExpanded(true)}
              >
                <Maximize2 />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => setScenePicker(true)}>
                <Swords />
                Change scene
              </Button>
              <HueDialog
                key={scene.id}
                suggested={scene.lightingId}
                onSelect={(id) =>
                  update((current) => ({
                    ...current,
                    scenes: current.scenes.map((s) =>
                      s.id === scene.id ? { ...s, lightingId: id } : s,
                    ),
                  }))
                }
              />
              <div className="flex min-w-0 flex-1 basis-full items-center gap-3 rounded-md border border-scene-foreground/20 bg-scene/70 px-3 py-2 sm:max-w-sm sm:basis-auto">
                <Button
                  onClick={() =>
                    track?.source ? report(audio.playMusic(track)) : openLibrary("music", track?.id)
                  }
                  size="icon"
                  variant="ghost"
                  className="size-8 text-scene-foreground hover:bg-scene-foreground/15 hover:text-scene-foreground"
                  aria-label={playback.musicPlaying ? "Pause music" : "Play music"}
                >
                  {playback.musicPlaying ? <Pause /> : <Play />}
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="min-w-0 flex-1 text-left" aria-label="Choose music">
                      <p className="truncate text-xs font-bold">{track?.name ?? "Choose music"}</p>
                      <p className="truncate text-[11px] text-scene-foreground/65">
                        {playback.musicPlaying ? "Playing" : "BGM · Tap to choose"}
                      </p>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Background music</DialogTitle>
                      <DialogDescription>
                        One track plays at a time. Scene changes leave the current track running.
                      </DialogDescription>
                    </DialogHeader>
                    {[...visibleAssets(c.music, scene.id), ...visibleAssets(c.music, null)].map(
                      (m) => (
                        <Button
                          key={m.id}
                          variant={m.id === playback.musicId ? "soft" : "quiet"}
                          onClick={() => report(audio.playMusic(m))}
                        >
                          {m.name}{" "}
                          {m.id === playback.musicId && playback.musicPlaying ? "· Playing" : ""}
                          {!m.source ? " · Attach audio" : ""}
                        </Button>
                      ),
                    )}
                    <Button variant="quiet" onClick={() => audio.stopMusic()}>
                      Stop music
                    </Button>
                    <label className="text-sm">
                      Music volume
                      <Slider
                        defaultValue={[c.musicVolume]}
                        key={c.musicVolume}
                        aria-label="Music volume"
                        onValueChange={([v]) => audio.setVolumes(v ?? 64, c.soundVolume)}
                        onValueCommit={([v]) =>
                          report(update((current) => ({ ...current, musicVolume: v ?? 64 })))
                        }
                      />
                    </label>
                    <Button onClick={() => openLibrary("music")}>Manage music</Button>
                  </DialogContent>
                </Dialog>
                <Slider
                  defaultValue={[c.musicVolume]}
                  key={`music-${c.musicVolume}`}
                  onValueChange={([v]) => audio.setVolumes(v ?? 64, c.soundVolume)}
                  onValueCommit={([v]) =>
                    report(update((current) => ({ ...current, musicVolume: v ?? 64 })))
                  }
                  max={100}
                  className="hidden w-20 sm:flex"
                  aria-label="Music volume"
                />
                <Music2 className="size-4 text-scene-foreground/70" />
              </div>
            </div>
          </div>
        </section>
        {pinned.length > 0 && (
          <section
            className="no-scrollbar sticky top-2 z-20 mt-4 flex gap-3 overflow-x-auto rounded-lg bg-background/95 py-1"
            aria-label="Pinned characters"
          >
            {pinned.map((character) => (
              <article
                key={character.id}
                className="flex min-w-[280px] items-center gap-3 rounded-lg border border-primary/25 bg-card px-3 py-2.5 shadow-sm"
              >
                <Avatar character={character} />
                <button className="min-w-0 flex-1 text-left" onClick={() => setSheet(character.id)}>
                  <p className="text-sm font-bold">{character.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {character.hp} · {character.detail}
                  </p>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => togglePin(character.id)}
                  aria-label={`Unpin ${character.name}`}
                >
                  <X />
                </Button>
              </article>
            ))}
          </section>
        )}
        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <section
            id="sounds"
            className="scroll-mt-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <SectionHeading
              icon={Volume2}
              title="Soundboard"
              subtitle="Tap to play. Loops keep running together."
            />
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground" role="status">
                {playback.effects.length} active sounds
              </span>
              <div className="flex items-center gap-2">
                <Slider
                  aria-label="Sound effects volume"
                  className="w-20"
                  key={`effects-${c.soundVolume}`}
                  defaultValue={[c.soundVolume]}
                  onValueChange={([v]) => audio.setVolumes(c.musicVolume, v ?? 80)}
                  onValueCommit={([v]) =>
                    report(update((current) => ({ ...current, soundVolume: v ?? 80 })))
                  }
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => audio.stopAll()}
                  title="Ctrl/Cmd + ."
                >
                  <CircleStop />
                  Stop all audio
                </Button>
              </div>
            </div>
            <Tabs value={soundScope} onValueChange={setSoundScope} className="mt-3">
              <TabsList className="w-full justify-start bg-muted sm:w-auto">
                <TabsTrigger value="scene">
                  <Trees className="mr-2 size-4" />
                  This scene
                </TabsTrigger>
                <TabsTrigger value="general">
                  <Sparkles className="mr-2 size-4" />
                  General
                </TabsTrigger>
              </TabsList>
              <TabsContent
                value={soundScope}
                className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3"
              >
                {sounds.map((sound) => {
                  const active = playback.effects.some((s) => s.id === sound.id);
                  return (
                    <Button
                      key={sound.id}
                      variant="quiet"
                      onClick={() =>
                        sound.source
                          ? report(audio.trigger(sound))
                          : openLibrary("sounds", sound.id)
                      }
                      className={cn(
                        "h-auto min-h-24 justify-start whitespace-normal p-3 text-left transition-all",
                        active && "border-primary bg-secondary",
                      )}
                    >
                      <span
                        className={cn(
                          "grid size-10 shrink-0 place-items-center rounded-md text-foreground",
                          sound.tone,
                        )}
                      >
                        <Volume2 className="size-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold leading-tight">{sound.name}</span>
                        <span className="mt-1 block text-[11px] font-medium text-muted-foreground">
                          {!sound.source
                            ? "Attach audio"
                            : active
                              ? sound.loop
                                ? "Playing loop"
                                : "Playing"
                              : sound.loop
                                ? "Loop"
                                : "One-shot"}
                        </span>
                      </span>
                      {active && sound.loop ? (
                        <CircleStop className="size-4 text-primary" />
                      ) : (
                        <Play className="size-4 text-muted-foreground" />
                      )}
                    </Button>
                  );
                })}
                {sounds.length === 0 && (
                  <p className="col-span-full py-4 text-sm text-muted-foreground">
                    No sounds here yet. Add some in the campaign library.
                  </p>
                )}
              </TabsContent>
            </Tabs>
          </section>
          <section
            id="notes"
            className="scroll-mt-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 lg:row-span-2"
          >
            <SectionHeading
              icon={ScrollText}
              title="Session notes"
              subtitle="One running notebook for everything."
            />
            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <Textarea
                aria-label="New session note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    if (!saving) report(saveNote());
                  }
                }}
                placeholder="Jot down what happens next…"
                className="min-h-28 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex gap-1 rounded-md bg-muted p-1">
                  <Button
                    onClick={() => setNoteScope("scene")}
                    variant={noteScope === "scene" ? "soft" : "ghost"}
                    size="sm"
                  >
                    Scene
                  </Button>
                  <Button
                    onClick={() => setNoteScope("general")}
                    variant={noteScope === "general" ? "soft" : "ghost"}
                    size="sm"
                  >
                    General
                  </Button>
                </div>
                <Button
                  variant="warm"
                  size="sm"
                  disabled={saving || !note.trim()}
                  onClick={() => report(saveNote())}
                >
                  <Plus />
                  Add note
                </Button>
              </div>
            </div>
            <div className="mt-5 space-y-4">
              {[
                { id: scene.id, title: "This scene", tone: "bg-sage" },
                { id: null, title: "General", tone: "bg-lilac" },
              ].map((group) => {
                const notes = c.notes.filter((n) => n.sceneId === group.id);
                return (
                  <div key={group.title}>
                    <div className="mb-2 flex items-center gap-2">
                      <span className={cn("size-2 rounded-full", group.tone)} />
                      <h3 className="text-xs font-bold uppercase text-muted-foreground">
                        {group.title}
                      </h3>
                      <span className="text-[11px] text-muted-foreground">{notes.length}</span>
                    </div>
                    <div className="space-y-2">
                      {notes.map((n) => (
                        <EditableNote
                          key={n.id}
                          deleteAction={
                            <DeleteControl kind="notes" id={n.id} name="note" update={update} />
                          }
                          text={n.text}
                          save={(text) =>
                            update((current) => ({
                              ...current,
                              notes: current.notes.map((item) =>
                                item.id === n.id ? { ...item, text } : item,
                              ),
                            }))
                          }
                          report={report}
                        />
                      ))}
                      {notes.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          A fresh page. Add your first note above.
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
          <section
            id="people"
            className="scroll-mt-4 rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5"
          >
            <SectionHeading
              icon={UsersRound}
              title="Characters"
              subtitle="Keep the right details on the table."
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <select
                aria-label="Character scope"
                className="rounded-md border bg-background px-2 text-xs"
                value={characterScope}
                onChange={(e) => setCharacterScope(e.target.value)}
              >
                <option value="scene">This scene</option>
                <option value="general">General</option>
                <option value="all">All characters</option>
              </select>
              <Input
                className="min-w-0 flex-1"
                aria-label="Find character"
                placeholder="Find a character…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {characters.map((character) => (
                <article
                  key={character.id}
                  className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-background p-3"
                >
                  <Avatar character={character} />
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => setSheet(character.id)}
                  >
                    <p className="truncate text-sm font-bold">{character.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{character.role}</p>
                  </button>
                  <Button
                    variant={c.pinned.includes(character.id) ? "soft" : "ghost"}
                    size="icon"
                    className="size-8 shrink-0"
                    onClick={() => togglePin(character.id)}
                    aria-label={`${c.pinned.includes(character.id) ? "Unpin" : "Pin"} ${character.name}`}
                  >
                    <Pin />
                  </Button>
                </article>
              ))}
              {characters.length === 0 && (
                <p className="col-span-full py-3 text-sm text-muted-foreground">
                  No characters found in this scope.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card px-2 shadow-lg lg:hidden"
        aria-label="Mobile tools"
      >
        {[
          { icon: Volume2, label: "Sounds", action: () => go("sounds") },
          { icon: ScrollText, label: "Notes", action: () => go("notes") },
          { icon: UsersRound, label: "People", action: () => go("people") },
          { icon: Menu, label: "More", action: () => openLibrary() },
        ].map(({ icon: Icon, label, action }) => (
          <Button
            key={label}
            variant="ghost"
            className="h-14 min-w-16 flex-col gap-1 text-[10px] text-primary"
            onClick={action}
          >
            <Icon className="size-5" />
            {label}
          </Button>
        ))}
      </nav>
      <Dialog open={scenePicker} onOpenChange={setScenePicker}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Choose the next scene</DialogTitle>
            <DialogDescription>
              Sounds, notes, and characters follow the scene. Playing audio and pinned characters
              stay with you.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[55dvh] gap-2 overflow-auto">
            {c.scenes.map((s) => (
              <Button
                key={s.id}
                variant={s.id === scene.id ? "soft" : "quiet"}
                className="h-auto justify-start whitespace-normal p-3 text-left"
                disabled={saving}
                onClick={() => changeScene(s.id)}
              >
                <Trees />
                <span>
                  <span className="block font-bold">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">
                    {s.id === scene.id ? "Current scene" : s.chapter}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            onClick={() => {
              setScenePicker(false);
              openLibrary();
            }}
          >
            Manage scenes
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw]">
          <DialogHeader>
            <DialogTitle>{scene.name}</DialogTitle>
            <DialogDescription>Scene background</DialogDescription>
          </DialogHeader>
          {backgroundElement(true)}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSheet(null);
        }}
      >
        <DialogContent className="max-h-[85dvh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{selected?.name}</DialogTitle>
            <DialogDescription>{selected?.role}</DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <p className="rounded-md bg-secondary p-3 font-semibold">
                {selected.hp} · {selected.detail}
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {selected.notes || "No additional notes yet."}
              </p>
              <Button onClick={() => togglePin(selected.id)}>
                <Pin />
                {c.pinned.includes(selected.id) ? "Unpin from screen" : "Pin to screen"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSheet(null);
                  openLibrary("characters", selected.id);
                }}
              >
                Edit in campaign library
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>
      {library && (
        <CampaignLibrary
          initialKind={libraryTarget.kind}
          initialId={libraryTarget.id}
          campaign={c}
          update={update}
          open={library}
          onOpenChange={setLibrary}
          report={report}
          stop={() => audio.stopAll()}
        />
      )}
    </main>
  );
}
function Avatar({ character }: { character: Character }) {
  return (
    <div
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold",
        character.tone,
      )}
    >
      {character.name
        .split(" ")
        .map((x) => x[0])
        .slice(0, 2)
        .join("")}
    </div>
  );
}
function SectionHeading({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Volume2;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
        <Icon className="size-5" />
      </span>
      <div>
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
function EditableNote({
  text,
  save,
  report,
  deleteAction,
}: {
  text: string;
  save: (text: string) => Promise<void>;
  report: (promise: Promise<unknown>) => void;
  deleteAction: React.ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [busy, setBusy] = useState(false);
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-relaxed">
      {editing ? (
        <div className="space-y-2">
          <Textarea
            aria-label="Edit note"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <Button
            size="sm"
            disabled={busy || !draft.trim()}
            onClick={() => {
              setBusy(true);
              report(
                save(draft.trim())
                  .then(() => setEditing(false))
                  .finally(() => setBusy(false)),
              );
            }}
          >
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-start gap-1">
          <button
            className="flex w-full gap-2 text-left"
            title="Edit note"
            onClick={() => {
              setDraft(text);
              setEditing(true);
            }}
          >
            <BookOpenText className="mt-0.5 size-4 shrink-0 text-primary" />
            <span className="whitespace-pre-wrap">{text}</span>
          </button>
          {deleteAction}
        </div>
      )}
    </div>
  );
}
