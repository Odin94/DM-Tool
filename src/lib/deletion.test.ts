import { describe, it, expect } from "vitest";
import { deleteWithUndo } from "./deletion";
import { initialCampaign, campaignSchema } from "./campaign";

describe("delete and undo", () => {
  it("restores a scene and its scopes while retaining notes added after deletion", () => {
    const result = deleteWithUndo(structuredClone(initialCampaign), "scenes", "woods");
    const current = {
      ...result.campaign,
      notes: [
        ...result.campaign.notes,
        { id: "later", text: "Later note", sceneId: null, createdAt: "Today" },
      ],
    };
    const restored = result.undo(current);
    expect(restored.scenes).toEqual(initialCampaign.scenes);
    expect(restored.notes.find((n) => n.id === "later")?.text).toBe("Later note");
    expect(restored.notes[0]?.sceneId).toBe("woods");
    expect(campaignSchema.safeParse(restored).success).toBe(true);
  });
  it("keeps subsequent scene choices and asset reassignments", () => {
    const result = deleteWithUndo(structuredClone(initialCampaign), "scenes", "woods");
    const current = {
      ...result.campaign,
      activeSceneId: "camp",
      sounds: result.campaign.sounds.map((s) => (s.id === "owl" ? { ...s, sceneId: "camp" } : s)),
    };
    const restored = result.undo(current);
    expect(restored.activeSceneId).toBe("camp");
    expect(restored.sounds.find((s) => s.id === "owl")?.sceneId).toBe("camp");
  });
  it("restores character pins without losing later character edits", () => {
    const result = deleteWithUndo(structuredClone(initialCampaign), "characters", "maelis");
    const restored = result.undo({
      ...result.campaign,
      characters: result.campaign.characters.map((c) => ({ ...c, hp: "Updated" })),
    });
    expect(restored.pinned).toContain("maelis");
    expect(restored.characters.find((c) => c.id === "orin")?.hp).toBe("Updated");
  });
  it("restores deleted notes in place and is idempotent", () => {
    const result = deleteWithUndo(structuredClone(initialCampaign), "notes", "note-0");
    expect(result.undo(result.campaign).notes).toEqual(initialCampaign.notes);
    expect(result.undo(result.undo(result.campaign)).notes).toEqual(initialCampaign.notes);
  });
});
