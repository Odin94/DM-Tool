import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  BookOpenText,
  Check,
  ChevronDown,
  CircleStop,
  Flame,
  Lightbulb,
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
  UserRound,
  UsersRound,
  Volume2,
  Waves,
  Wind,
  X,
  Zap,
} from "lucide-react";

import sceneImage from "@/assets/whispering-woods.jpg";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearthkeeper | TTRPG Session Dashboard" },
      {
        name: "description",
        content: "Run scenes, sounds, notes, lighting, and characters from one focused TTRPG dashboard.",
      },
      { property: "og:title", content: "Hearthkeeper | TTRPG Session Dashboard" },
      {
        property: "og:description",
        content: "A warm, focused tabletop roleplaying game session dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

type Sound = { id: string; name: string; detail: string; icon: typeof Wind; loop?: boolean; tone: string };

const sceneSounds: Sound[] = [
  { id: "leaves", name: "Rustling leaves", detail: "0:18", icon: Wind, loop: true, tone: "bg-sage" },
  { id: "owl", name: "Distant owl", detail: "0:04", icon: Trees, tone: "bg-lilac" },
  { id: "twig", name: "Twig snap", detail: "0:02", icon: Zap, tone: "bg-peach" },
  { id: "stream", name: "Forest stream", detail: "1:24", icon: Waves, loop: true, tone: "bg-sky" },
  { id: "whisper", name: "Faint whisper", detail: "0:07", icon: Sparkles, tone: "bg-lilac" },
  { id: "wolves", name: "Wolves nearby", detail: "0:09", icon: Volume2, tone: "bg-peach" },
];

const generalSounds: Sound[] = [
  { id: "dice", name: "Dice tumble", detail: "0:03", icon: Sparkles, tone: "bg-lilac" },
  { id: "door", name: "Heavy door", detail: "0:05", icon: Zap, tone: "bg-peach" },
  { id: "fire", name: "Campfire", detail: "2:10", icon: Flame, loop: true, tone: "bg-sage" },
  { id: "cheer", name: "Tavern cheer", detail: "0:06", icon: UsersRound, tone: "bg-sky" },
];

const characters = [
  { id: "maelis", initials: "MS", name: "Maelis Thorn", role: "Wood-elf scout", hp: "31 / 38 HP", detail: "AC 15 · Passive 17", tone: "bg-sage" },
  { id: "bramble", initials: "BR", name: "Bramble", role: "Curious sprite", hp: "12 / 12 HP", detail: "AC 13 · Fly 40 ft", tone: "bg-lilac" },
  { id: "orin", initials: "OK", name: "Orin Kest", role: "Human fighter", hp: "44 / 52 HP", detail: "AC 18 · Passive 12", tone: "bg-peach" },
];

function Dashboard() {
  const [soundScope, setSoundScope] = useState("scene");
  const [looping, setLooping] = useState<string[]>(["leaves"]);
  const [flashes, setFlashes] = useState<string[]>([]);
  const [musicPlaying, setMusicPlaying] = useState(true);
  const [note, setNote] = useState("");
  const [savedNotes, setSavedNotes] = useState<string[]>([]);
  const [noteScope, setNoteScope] = useState("scene");
  const [pinned, setPinned] = useState<string[]>(["maelis"]);
  const sounds = soundScope === "scene" ? sceneSounds : generalSounds;

  const pinnedCharacters = useMemo(
    () => characters.filter((character) => pinned.includes(character.id)),
    [pinned],
  );

  function triggerSound(sound: Sound) {
    if (sound.loop) {
      setLooping((current) => current.includes(sound.id) ? current.filter((id) => id !== sound.id) : [...current, sound.id]);
      return;
    }
    setFlashes((current) => [...current, sound.id]);
    window.setTimeout(() => setFlashes((current) => current.filter((id) => id !== sound.id)), 900);
  }

  function saveNote() {
    if (!note.trim()) return;
    setSavedNotes((current) => [note.trim(), ...current]);
    setNote("");
  }

  function togglePin(id: string) {
    setPinned((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  return (
    <main className="min-h-screen pb-20 lg:pb-8">
      <header className="border-b border-border bg-card/95">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Flame className="size-5" /></div>
            <div>
              <p className="font-display text-xl font-bold leading-none">Hearthkeeper</p>
              <p className="mt-1 text-[11px] font-semibold uppercase text-muted-foreground">The Hollow Crown · Session 14</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="mr-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><span className="size-2 rounded-full bg-accent-foreground" />3 players connected</span>
            <Button variant="quiet" size="icon" aria-label="Open campaign map"><Map /></Button>
            <Button variant="quiet" size="icon" aria-label="Open menu"><Menu /></Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8">
        <section className="relative min-h-[228px] overflow-hidden rounded-lg bg-scene text-scene-foreground shadow-sm">
          <img src={sceneImage} alt="Moonlit forest clearing prepared for the current adventure scene" width={1536} height={864} className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute inset-0 bg-gradient-to-r from-scene via-scene/80 to-scene/15" />
          <div className="relative flex min-h-[228px] flex-col justify-between p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Badge className="mb-3 border-scene-foreground/25 bg-scene-foreground/15 text-scene-foreground hover:bg-scene-foreground/15">ACT II · SCENE 4</Badge>
                <h1 className="font-display text-3xl font-bold sm:text-4xl">The Whispering Woods</h1>
                <p className="mt-2 max-w-xl text-sm text-scene-foreground/80">A silver path winds beneath ancient boughs. Something unseen is keeping pace.</p>
              </div>
              <Button variant="ghost" size="icon" className="text-scene-foreground hover:bg-scene-foreground/15 hover:text-scene-foreground" aria-label="Expand scene image"><Maximize2 /></Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SceneDialog />
              <LightingDialog />
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-md border border-scene-foreground/20 bg-scene/70 px-3 py-2 sm:max-w-sm">
                <Button onClick={() => setMusicPlaying(!musicPlaying)} size="icon" variant="ghost" className="size-8 text-scene-foreground hover:bg-scene-foreground/15 hover:text-scene-foreground" aria-label={musicPlaying ? "Pause music" : "Play music"}>{musicPlaying ? <Pause /> : <Play />}</Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold">Moonlit Canopy</p>
                  <p className="truncate text-[11px] text-scene-foreground/65">BGM · Elowen Vale</p>
                </div>
                <Slider defaultValue={[64]} max={100} className="hidden w-20 sm:flex" aria-label="Music volume" />
                <Music2 className="size-4 text-scene-foreground/70" />
              </div>
            </div>
          </div>
        </section>

        {pinnedCharacters.length > 0 && (
          <section className="mt-4 flex gap-3 overflow-x-auto pb-1 no-scrollbar" aria-label="Pinned characters">
            {pinnedCharacters.map((character) => <PinnedCharacter key={character.id} character={character} onClose={() => togglePin(character.id)} />)}
          </section>
        )}

        <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,.65fr)]">
          <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
            <SectionHeading icon={Volume2} title="Soundboard" subtitle="Tap to play. Loops keep running together." />
            <Tabs value={soundScope} onValueChange={setSoundScope} className="mt-4">
              <TabsList className="w-full justify-start bg-muted sm:w-auto">
                <TabsTrigger value="scene"><Trees className="mr-2 size-4" />This scene</TabsTrigger>
                <TabsTrigger value="general"><Sparkles className="mr-2 size-4" />General</TabsTrigger>
              </TabsList>
              <TabsContent value={soundScope} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {sounds.map((sound) => {
                  const active = looping.includes(sound.id);
                  const justPlayed = flashes.includes(sound.id);
                  const Icon = sound.icon;
                  return (
                    <Button key={sound.id} variant="quiet" onClick={() => triggerSound(sound)} className={cn("h-auto min-h-24 justify-start whitespace-normal p-3 text-left transition-all", active && "border-primary bg-secondary", justPlayed && "border-primary bg-peach")}> 
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-md text-foreground", sound.tone)}><Icon className="size-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold leading-tight">{sound.name}</span>
                        <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-muted-foreground">{active ? <><span className="size-1.5 animate-pulse rounded-full bg-primary" />Playing loop</> : sound.loop ? `Loop · ${sound.detail}` : justPlayed ? "Played" : `One-shot · ${sound.detail}`}</span>
                      </span>
                      {active ? <CircleStop className="size-4 text-primary" /> : <Play className="size-4 text-muted-foreground" />}
                    </Button>
                  );
                })}
              </TabsContent>
            </Tabs>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5 lg:row-span-2">
            <SectionHeading icon={ScrollText} title="Session notes" subtitle="One running notebook for everything." />
            <div className="mt-4 rounded-md border border-border bg-background p-3">
              <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Jot down what happens next…" className="min-h-28 resize-none border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0" />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                <div className="flex gap-1 rounded-md bg-muted p-1">
                  <Button onClick={() => setNoteScope("scene")} variant={noteScope === "scene" ? "soft" : "ghost"} size="sm">Scene</Button>
                  <Button onClick={() => setNoteScope("general")} variant={noteScope === "general" ? "soft" : "ghost"} size="sm">General</Button>
                </div>
                <Button variant="warm" size="sm" onClick={saveNote}><Plus />Add note</Button>
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <NoteGroup title="This scene" count={2 + savedNotes.length} tone="bg-sage">
                {savedNotes.map((item, index) => <Note key={`${item}-${index}`} text={item} fresh />)}
                <Note text="The raven speaks only when no one looks directly at it." />
                <Note text="Perception 15: footprints stop at the standing stone." />
              </NoteGroup>
              <NoteGroup title="General" count={2} tone="bg-lilac">
                <Note text="The silver key belongs to the east tower archive." />
                <Note text="Orin still owes Mira a favor from Briarwick." />
              </NoteGroup>
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
            <SectionHeading icon={UsersRound} title="Characters" subtitle="Keep the right details on the table." action={<Button variant="ghost" size="sm">All characters <ChevronDown /></Button>} />
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {characters.map((character) => (
                <article key={character.id} className="flex min-w-0 items-center gap-3 rounded-md border border-border bg-background p-3">
                  <div className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold", character.tone)}>{character.initials}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{character.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{character.role}</p>
                  </div>
                  <Button variant={pinned.includes(character.id) ? "soft" : "ghost"} size="icon" className="size-8 shrink-0" onClick={() => togglePin(character.id)} aria-label={`${pinned.includes(character.id) ? "Unpin" : "Pin"} ${character.name}`}><Pin /></Button>
                </article>
              ))}
            </div>
          </section>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border bg-card px-2 shadow-lg lg:hidden" aria-label="Mobile tools">
        <MobileNav icon={Volume2} label="Sounds" active />
        <MobileNav icon={ScrollText} label="Notes" />
        <MobileNav icon={UsersRound} label="People" />
        <MobileNav icon={Menu} label="More" />
      </nav>
    </main>
  );
}

function SectionHeading({ icon: Icon, title, subtitle, action }: { icon: typeof Volume2; title: string; subtitle: string; action?: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground"><Icon className="size-5" /></span><div><h2 className="font-display text-xl font-bold">{title}</h2><p className="text-xs text-muted-foreground">{subtitle}</p></div></div>{action}</div>;
}

function NoteGroup({ title, count, tone, children }: { title: string; count: number; tone: string; children: React.ReactNode }) {
  return <div><div className="mb-2 flex items-center gap-2"><span className={cn("size-2 rounded-full", tone)} /><h3 className="text-xs font-bold uppercase text-muted-foreground">{title}</h3><span className="text-[11px] text-muted-foreground">{count}</span></div><div className="space-y-2">{children}</div></div>;
}

function Note({ text, fresh = false }: { text: string; fresh?: boolean }) {
  return <div className="rounded-md border border-border bg-background px-3 py-2.5 text-sm leading-relaxed"><div className="flex gap-2"><BookOpenText className="mt-0.5 size-4 shrink-0 text-primary" /><p>{text}</p>{fresh && <Badge variant="secondary" className="ml-auto self-start">New</Badge>}</div></div>;
}

function PinnedCharacter({ character, onClose }: { character: typeof characters[number]; onClose: () => void }) {
  return <article className="flex min-w-[280px] items-center gap-3 rounded-lg border border-primary/25 bg-card px-3 py-2.5 shadow-sm"><div className={cn("grid size-10 shrink-0 place-items-center rounded-full font-display text-sm font-bold", character.tone)}>{character.initials}</div><div className="min-w-0 flex-1"><p className="text-sm font-bold">{character.name}</p><p className="text-[11px] text-muted-foreground">{character.hp} · {character.detail}</p></div><Button variant="ghost" size="icon" className="size-8" onClick={onClose} aria-label={`Unpin ${character.name}`}><X /></Button></article>;
}

function SceneDialog() {
  return <Dialog><DialogTrigger asChild><Button variant="secondary"><Swords />Change scene</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl">Choose the next scene</DialogTitle><DialogDescription>Changing scenes updates the focused sounds, notes, and characters.</DialogDescription></DialogHeader><div className="grid gap-2"><Choice icon={Trees} title="The Whispering Woods" detail="Current scene" selected /><Choice icon={Map} title="Ruins of Greywatch" detail="3 sounds · 2 NPCs" /><Choice icon={Flame} title="Camp at Briar Hollow" detail="4 sounds · 4 characters" /></div></DialogContent></Dialog>;
}

function LightingDialog() {
  return <Dialog><DialogTrigger asChild><Button variant="ghost" className="border border-scene-foreground/25 bg-scene/60 text-scene-foreground hover:bg-scene-foreground/15 hover:text-scene-foreground"><Lightbulb />Moonlit grove</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle className="font-display text-2xl">Lighting scene</DialogTitle><DialogDescription>Set the mood across connected lights.</DialogDescription></DialogHeader><div className="grid grid-cols-2 gap-2"><Choice icon={Sparkles} title="Moonlit grove" detail="Cool · 35%" selected /><Choice icon={Flame} title="Warm campfire" detail="Amber · 55%" /><Choice icon={Zap} title="Storm warning" detail="Blue · 20%" /><Choice icon={Lightbulb} title="Table clear" detail="Warm white · 80%" /></div></DialogContent></Dialog>;
}

function Choice({ icon: Icon, title, detail, selected = false }: { icon: typeof Trees; title: string; detail: string; selected?: boolean }) {
  return <Button variant="quiet" className={cn("h-auto justify-start whitespace-normal p-3 text-left", selected && "border-primary bg-secondary")}><span className="grid size-9 shrink-0 place-items-center rounded-md bg-muted"><Icon /></span><span className="flex-1"><span className="block font-bold">{title}</span><span className="block text-xs text-muted-foreground">{detail}</span></span>{selected && <Check className="text-primary" />}</Button>;
}

function MobileNav({ icon: Icon, label, active = false }: { icon: typeof Volume2; label: string; active?: boolean }) {
  return <Button variant="ghost" className={cn("h-14 min-w-16 flex-col gap-1 text-[10px]", active ? "text-primary" : "text-muted-foreground")}><Icon className="size-5" />{label}</Button>;
}