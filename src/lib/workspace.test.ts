import { describe, expect, it } from "vitest";
import { initialCampaign } from "./campaign";
import {
  archiveNote,
  archiveExpiry,
  restoreNote,
  purgeArchive,
  workspaceSchema,
  newCampaign,
  type Workspace,
} from "./workspace";
describe("campaign collections and note archive", () => {
  it("creates an independent empty campaign", () => {
    const c = newCampaign("New world", "Pathfinder", ["Mira"]);
    expect(c.sounds).toEqual([]);
    expect(c.players).toEqual(["Mira"]);
    expect(c.scenes[0]!.id).toBe(c.activeSceneId);
    expect(c.scenes).not.toBe(initialCampaign.scenes);
  });
  it("retains scene labels and restores to General when a scene no longer exists", () => {
    const c = archiveNote(
      structuredClone(initialCampaign),
      "note-0",
      new Date("2026-01-31T12:00:00Z"),
    );
    expect(c.notes.some((n) => n.id === "note-0")).toBe(false);
    expect(c.archivedNotes![0]!.sceneName).toBe("The Whispering Woods");
    c.scenes = c.scenes.filter((s) => s.id !== "woods");
    const restored = restoreNote(c, "note-0");
    expect(restored.notes.at(-1)?.sceneId).toBe(null);
    expect(restored.archivedNotes).toEqual([]);
  });
  it("expires after three calendar months with end-of-month clamping", () => {
    expect(archiveExpiry("2026-01-31T12:00:00Z").toISOString()).toBe("2026-04-30T12:00:00.000Z");
    const w: Workspace = {
      version: 1,
      activeCampaignId: "a",
      library: { music: [], sounds: [], lighting: [] },
      campaigns: [
        {
          id: "a",
          campaign: archiveNote(initialCampaign, "note-0", new Date("2026-01-31T12:00:00Z")),
        },
      ],
    };
    expect(purgeArchive(w, new Date("2026-04-30T11:59:59Z"))).toBe(w);
    expect(
      purgeArchive(w, new Date("2026-04-30T12:00:00Z")).campaigns[0]!.campaign.archivedNotes,
    ).toEqual([]);
    expect(w.campaigns[0]!.campaign.archivedNotes).toHaveLength(1);
  });
  it("rejects a missing active campaign", () => {
    expect(() =>
      workspaceSchema.parse({
        version: 1,
        activeCampaignId: "missing",
        campaigns: [{ id: "a", campaign: initialCampaign }],
        library: { music: [], sounds: [], lighting: [] },
      }),
    ).toThrow();
  });
});
