import { z } from "zod";

const scope = z.string().nullable();
const base = {
  id: z.string().min(1),
  name: z.string().min(1),
  sceneId: scope,
  priority: z.number().default(0),
};
export const soundSchema = z.object({
  ...base,
  source: z.string(),
  loop: z.boolean(),
  volume: z.number().min(0).max(100).default(100),
  tone: z.string().default("bg-sage"),
});
export const characterSchema = z.object({
  ...base,
  role: z.string(),
  hp: z.string(),
  detail: z.string(),
  notes: z.string(),
  tone: z.string().default("bg-sage"),
});
export const sceneSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  chapter: z.string(),
  background: z.string(),
  video: z.boolean(),
  musicId: z.string().nullable(),
  lightingId: z.string().nullable(),
});
export const campaignSchema = z
  .object({
    version: z.literal(1),
    name: z.string().min(1),
    session: z.number().int().positive(),
    activeSceneId: z.string(),
    scenes: z.array(sceneSchema).min(1),
    sounds: z.array(soundSchema),
    music: z.array(soundSchema),
    characters: z.array(characterSchema),
    notes: z.array(
      z.object({ id: z.string(), sceneId: scope, text: z.string(), createdAt: z.string() }),
    ),
    pinned: z.array(z.string()),
    musicVolume: z.number().min(0).max(100),
    soundVolume: z.number().min(0).max(100),
  })
  .superRefine((c, ctx) => {
    const ids = c.scenes.map((s) => s.id);
    if (!ids.includes(c.activeSceneId))
      ctx.addIssue({ code: "custom", message: "Active scene is missing" });
    for (const items of [c.scenes, c.sounds, c.music, c.characters, c.notes]) {
      if (new Set(items.map((x) => x.id)).size !== items.length)
        ctx.addIssue({ code: "custom", message: "Duplicate IDs" });
    }
    for (const item of [...c.sounds, ...c.music, ...c.characters, ...c.notes]) {
      if (item.sceneId !== null && !ids.includes(item.sceneId))
        ctx.addIssue({ code: "custom", message: "Unknown scene reference" });
    }
    if (c.pinned.some((id) => !c.characters.some((ch) => ch.id === id)))
      ctx.addIssue({ code: "custom", message: "Pinned character is missing" });
    if (c.scenes.some((s) => s.musicId !== null && !c.music.some((m) => m.id === s.musicId)))
      ctx.addIssue({ code: "custom", message: "Suggested music is missing" });
  });
export type Campaign = z.infer<typeof campaignSchema>;
export type Sound = z.infer<typeof soundSchema>;
export type Character = z.infer<typeof characterSchema>;
export type Scene = z.infer<typeof sceneSchema>;
export const visibleAssets = <T extends { sceneId: string | null; priority: number }>(
  items: T[],
  sceneId: string | null,
) => items.filter((x) => x.sceneId === sceneId).sort((a, b) => b.priority - a.priority);
export function notebook(c: Campaign) {
  return (
    `# ${c.name}\n\n` +
    c.notes
      .map(
        (n) =>
          `## ${n.sceneId ? (c.scenes.find((s) => s.id === n.sceneId)?.name ?? "Scene") : "General"} · ${n.createdAt}\n\n${n.text}\n`,
      )
      .join("\n")
  );
}
export function deleteScene(c: Campaign, id: string): Campaign {
  if (c.scenes.length === 1) throw new Error("Keep at least one scene.");
  const scenes = c.scenes.filter((s) => s.id !== id);
  const generalize = <T extends { sceneId: string | null }>(items: T[]) =>
    items.map((x) => (x.sceneId === id ? { ...x, sceneId: null } : x));
  return {
    ...c,
    scenes,
    activeSceneId: c.activeSceneId === id ? scenes[0]!.id : c.activeSceneId,
    sounds: generalize(c.sounds),
    music: generalize(c.music),
    characters: generalize(c.characters),
    notes: generalize(c.notes),
  };
}
export const initialCampaign: Campaign = {
  version: 1,
  name: "The Hollow Crown",
  session: 14,
  activeSceneId: "woods",
  scenes: [
    {
      id: "woods",
      name: "The Whispering Woods",
      description: "A silver path winds beneath ancient boughs. Something unseen is keeping pace.",
      chapter: "ACT II · SCENE 4",
      background: "",
      video: false,
      musicId: "canopy",
      lightingId: null,
    },
    {
      id: "ruins",
      name: "Ruins of Greywatch",
      description: "Broken towers keep their secrets beneath a restless sky.",
      chapter: "ACT II · SCENE 5",
      background: "",
      video: false,
      musicId: null,
      lightingId: null,
    },
    {
      id: "camp",
      name: "Camp at Briar Hollow",
      description: "The fire burns low. For a moment, the road can wait.",
      chapter: "ACT II · SCENE 6",
      background: "",
      video: false,
      musicId: null,
      lightingId: null,
    },
  ],
  sounds: [
    ["leaves", "Rustling leaves", "woods", true, "bg-sage"],
    ["owl", "Distant owl", "woods", false, "bg-lilac"],
    ["twig", "Twig snap", "woods", false, "bg-peach"],
    ["stream", "Forest stream", "woods", true, "bg-sky"],
    ["whisper", "Faint whisper", "woods", false, "bg-lilac"],
    ["wolves", "Wolves nearby", "woods", false, "bg-peach"],
    ["dice", "Dice tumble", null, false, "bg-lilac"],
    ["door", "Heavy door", null, false, "bg-peach"],
    ["fire", "Campfire", null, true, "bg-sage"],
    ["cheer", "Tavern cheer", null, false, "bg-sky"],
  ].map(([id, name, sceneId, loop, tone]) => ({
    id: id as string,
    name: name as string,
    sceneId: sceneId as string | null,
    loop: loop as boolean,
    tone: tone as string,
    source: "",
    volume: 100,
    priority: 0,
  })),
  music: [
    {
      id: "canopy",
      name: "Moonlit Canopy",
      source: "",
      volume: 100,
      sceneId: "woods",
      loop: true,
      tone: "bg-sage",
      priority: 0,
    },
  ],
  characters: [
    {
      id: "maelis",
      name: "Maelis Thorn",
      role: "Wood-elf scout",
      hp: "31 / 38 HP",
      detail: "AC 15 · Passive 17",
      notes: "A watchful guide who knows the old forest paths.",
      tone: "bg-sage",
      sceneId: "woods",
      priority: 0,
    },
    {
      id: "bramble",
      name: "Bramble",
      role: "Curious sprite",
      hp: "12 / 12 HP",
      detail: "AC 13 · Fly 40 ft",
      notes: "Collects bright things and inconvenient secrets.",
      tone: "bg-lilac",
      sceneId: "woods",
      priority: 0,
    },
    {
      id: "orin",
      name: "Orin Kest",
      role: "Human fighter",
      hp: "44 / 52 HP",
      detail: "AC 18 · Passive 12",
      notes: "Owes Mira a favor from Briarwick.",
      tone: "bg-peach",
      sceneId: null,
      priority: 0,
    },
  ],
  notes: [
    "The raven speaks only when no one looks directly at it.",
    "Perception 15: footprints stop at the standing stone.",
    "The silver key belongs to the east tower archive.",
    "Orin still owes Mira a favor from Briarwick.",
  ].map((text, i) => ({
    id: `note-${i}`,
    sceneId: i < 2 ? "woods" : null,
    text,
    createdAt: "Before the session",
  })),
  pinned: ["maelis"],
  musicVolume: 64,
  soundVolume: 80,
};
