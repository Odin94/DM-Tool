import { z } from "zod";
import {
  campaignSchema,
  initialCampaign,
  lightingSchema,
  soundSchema,
  type Campaign,
} from "./campaign";

export const workspaceSchema = z
  .object({
    version: z.literal(1),
    activeCampaignId: z.string(),
    campaigns: z.array(z.object({ id: z.string(), campaign: campaignSchema })).min(1),
    library: z.object({
      sounds: z.array(soundSchema),
      music: z.array(soundSchema),
      lighting: z.array(lightingSchema),
    }),
  })
  .superRefine((w, ctx) => {
    if (
      !w.campaigns.some((c) => c.id === w.activeCampaignId) ||
      new Set(w.campaigns.map((c) => c.id)).size !== w.campaigns.length
    )
      ctx.addIssue({ code: "custom", message: "Invalid campaign collection" });
  });
export type Workspace = z.infer<typeof workspaceSchema>;
export function newCampaign(name: string, game: string, players: string[]): Campaign {
  const id = crypto.randomUUID();
  return {
    ...structuredClone(initialCampaign),
    name,
    game,
    players,
    session: 1,
    activeSceneId: id,
    scenes: [
      {
        id,
        name: "Opening scene",
        description: "",
        chapter: "",
        background: "",
        video: false,
        musicId: null,
        lightingId: null,
      },
    ],
    sounds: [],
    music: [],
    characters: [],
    notes: [],
    archivedNotes: [],
    lighting: [],
    pinned: [],
  };
}
export function archiveNote(c: Campaign, id: string, now = new Date()): Campaign {
  const note = c.notes.find((n) => n.id === id);
  if (!note) return c;
  return {
    ...c,
    notes: c.notes.filter((n) => n.id !== id),
    archivedNotes: [
      ...(c.archivedNotes ?? []),
      {
        ...note,
        archivedAt: now.toISOString(),
        sceneName: c.scenes.find((s) => s.id === note.sceneId)?.name ?? "General",
      },
    ],
  };
}
export function restoreNote(c: Campaign, id: string): Campaign {
  const note = c.archivedNotes?.find((n) => n.id === id);
  if (!note) return c;
  return {
    ...c,
    archivedNotes: c.archivedNotes!.filter((n) => n.id !== id),
    notes: [
      ...c.notes,
      {
        id: c.notes.some((n) => n.id === id) ? crypto.randomUUID() : id,
        text: note.text,
        createdAt: note.createdAt,
        sceneId: c.scenes.some((s) => s.id === note.sceneId) ? note.sceneId : null,
      },
    ],
  };
}
export function archiveExpiry(archivedAt: string): Date {
  const date = new Date(archivedAt);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 3);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date;
}
export function purgeArchive(w: Workspace, now = new Date()): Workspace {
  let changed = false;
  const campaigns = w.campaigns.map((entry) => {
    const notes = entry.campaign.archivedNotes;
    if (!notes) return entry;
    const kept = notes.filter((n) => archiveExpiry(n.archivedAt).getTime() > now.getTime());
    if (kept.length === notes.length) return entry;
    changed = true;
    return { ...entry, campaign: { ...entry.campaign, archivedNotes: kept } };
  });
  return changed ? { ...w, campaigns } : w;
}
