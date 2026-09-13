import "fake-indexeddb/auto";
import { describe, it, expect, vi } from "vitest";
import { loadCampaign, saveCampaign, importMedia, resolveMedia, importBackup } from "./storage";
import { initialCampaign } from "./campaign";
vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => false, invoke: vi.fn() }));
describe("local persistence", () => {
  it("returns the sample campaign on first launch and retains saved notes", async () => {
    expect((await loadCampaign()).name).toBe(initialCampaign.name);
    const c = structuredClone(initialCampaign);
    c.notes.push({ id: "new", sceneId: null, text: "Persistent general note", createdAt: "Today" });
    await saveCampaign(c);
    expect((await loadCampaign()).notes.at(-1)?.text).toBe("Persistent general note");
  });
  it("does not replace valid data with a corrupt campaign", async () => {
    const before = await loadCampaign();
    await expect(saveCampaign({ ...before, activeSceneId: "missing" })).rejects.toThrow();
    expect(await loadCampaign()).toEqual(before);
  });
  it("keeps imported bytes and resolves a reusable playback URL", async () => {
    const source = await importMedia(new File(["test media"], "sample.wav", { type: "audio/wav" }));
    const url = await resolveMedia(source);
    expect(url).toMatch(/^blob:/);
    expect(await resolveMedia(source)).toBe(url);
    expect(await (await fetch(url)).text()).toBe("test media");
  });
  it("rejects missing media and non-media uploads with useful errors", async () => {
    await expect(resolveMedia("media:missing")).rejects.toThrow("missing");
    await expect(
      importMedia(new File(["script"], "script.js", { type: "text/javascript" })),
    ).rejects.toThrow("Choose an audio");
    await expect(resolveMedia("javascript:alert(1)")).rejects.toThrow("HTTP(S)");
  });
  it("restores embedded assets under fresh IDs without overwriting current media", async () => {
    const oldRef = await importMedia(new File(["original"], "a.wav", { type: "audio/wav" }));
    const c = structuredClone(initialCampaign);
    c.sounds[0]!.source = oldRef;
    const backup = new File(
      [JSON.stringify({ campaign: c, media: { [oldRef]: "data:audio/wav;base64,cmVzdG9yZWQ=" } })],
      "backup.json",
    );
    const restored = await importBackup(backup);
    expect(restored.sounds[0]!.source).not.toBe(oldRef);
    expect(await (await fetch(await resolveMedia(oldRef))).text()).toBe("original");
    expect(await (await fetch(await resolveMedia(restored.sounds[0]!.source))).text()).toBe(
      "restored",
    );
  });
});
