import { describe, it, expect } from "vitest";
import { campaignSchema, initialCampaign, deleteScene, visibleAssets, notebook } from "./campaign";

describe("campaign integrity", () => {
  it("roundtrips a saved campaign and preserves scene/general scope", () => {
    const c = campaignSchema.parse(JSON.parse(JSON.stringify(initialCampaign)));
    expect(visibleAssets(c.sounds, "woods")).toHaveLength(6);
    expect(visibleAssets(c.sounds, null)).toHaveLength(4);
    expect(visibleAssets(c.sounds, "ruins")).toHaveLength(0);
  });
  it("moves all assets and notes to General when deleting a scene", () => {
    const c = deleteScene(structuredClone(initialCampaign), "woods");
    expect(c.activeSceneId).toBe("ruins");
    expect(c.notes).toHaveLength(4);
    expect(c.notes.every((n) => n.sceneId === null)).toBe(true);
    expect(c.sounds.every((n) => n.sceneId === null)).toBe(true);
    expect(campaignSchema.safeParse(c).success).toBe(true);
    expect(() => deleteScene({ ...c, scenes: [c.scenes[0]!] }, "ruins")).toThrow();
  });
  it("rejects corrupt versions, references and duplicate IDs", () => {
    expect(campaignSchema.safeParse({ ...initialCampaign, version: 2 }).success).toBe(false);
    expect(campaignSchema.safeParse({ ...initialCampaign, activeSceneId: "missing" }).success).toBe(
      false,
    );
    expect(
      campaignSchema.safeParse({
        ...initialCampaign,
        sounds: [initialCampaign.sounds[0], initialCampaign.sounds[0]],
      }).success,
    ).toBe(false);
  });
  it("sorts priority without mutating and includes every note in one notebook", () => {
    const assets = [
      { sceneId: null, priority: 1 },
      { sceneId: null, priority: 5 },
    ];
    expect(visibleAssets(assets, null)[0]!.priority).toBe(5);
    expect(assets[0]!.priority).toBe(1);
    const text = notebook(initialCampaign);
    initialCampaign.notes.forEach((n) => expect(text).toContain(n.text));
    expect(text).toContain("General");
    expect(text).toContain("The Whispering Woods");
  });
});
