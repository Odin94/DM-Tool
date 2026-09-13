import { describe, it, expect, vi, beforeEach } from "vitest";
import { AudioEngine } from "./audio";
import { initialCampaign } from "./campaign";
import { resolveMedia } from "./storage";
vi.mock("./storage", () => ({ resolveMedia: vi.fn(async (source: string) => source) }));
class FakeAudio {
  paused = true;
  loop = false;
  volume = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => {
    this.paused = false;
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
}
const sound = { ...initialCampaign.sounds[0]!, source: "https://example.com/audio.mp3" };
function setup() {
  const created: FakeAudio[] = [];
  const changed = vi.fn();
  const failed = vi.fn();
  const engine = new AudioEngine(changed, failed, () => {
    const a = new FakeAudio();
    created.push(a);
    return a as unknown as HTMLAudioElement;
  });
  return { engine, created, failed };
}
beforeEach(() =>
  vi
    .mocked(resolveMedia)
    .mockReset()
    .mockImplementation(async (s) => s),
);
describe("audio channels", () => {
  it("multiplies each configured gain by the master volume", async () => {
    const { engine, created } = setup();
    await engine.trigger({ ...sound, volume: 25 });
    await engine.trigger({ ...sound, id: "loud", volume: 80 });
    engine.setVolumes(60, 50);
    expect(created[0]!.volume).toBe(0.125);
    expect(created[1]!.volume).toBe(0.4);
  });
  it("overlaps repeated one-shots and removes each on completion", async () => {
    const { engine, created } = setup();
    await engine.trigger({ ...sound, loop: false });
    await engine.trigger({ ...sound, loop: false });
    expect(engine.snapshot().effects).toHaveLength(2);
    created[0]!.onended!();
    expect(engine.snapshot().effects).toHaveLength(1);
    engine.stopAll();
    expect(created[1]!.paused).toBe(true);
    expect(engine.snapshot().effects).toHaveLength(0);
  });
  it("toggles a loop while leaving other sounds alone", async () => {
    const { engine, created } = setup();
    await engine.trigger(sound);
    await engine.trigger({ ...sound, id: "other" });
    await engine.trigger(sound);
    expect(created[0]!.paused).toBe(true);
    expect(engine.snapshot().effects).toEqual([{ id: "other", loop: true }]);
  });
  it("has one music channel with pause/resume and independent volumes", async () => {
    const { engine, created } = setup();
    await engine.playMusic(sound);
    await engine.playMusic({ ...sound, id: "second" });
    expect(created[0]!.paused).toBe(true);
    expect(created[1]!.paused).toBe(false);
    await engine.playMusic({ ...sound, id: "second" });
    expect(created[1]!.paused).toBe(true);
    await engine.playMusic({ ...sound, id: "second" });
    await engine.trigger(sound);
    engine.setVolumes(25, 75);
    expect(created[1]!.volume).toBe(0.25);
    expect(created[2]!.volume).toBe(0.75);
  });
  it("cannot start delayed sounds after stop all", async () => {
    let finish!: (s: string) => void;
    vi.mocked(resolveMedia).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { engine, created } = setup();
    const pending = engine.trigger(sound);
    engine.stopAll();
    finish("url");
    await pending;
    expect(created).toHaveLength(0);
  });
  it("ignores stale music loads when another track was selected", async () => {
    let finish!: (s: string) => void;
    vi.mocked(resolveMedia).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { engine } = setup();
    const pending = engine.playMusic(sound);
    await engine.playMusic({ ...sound, id: "new" });
    finish("old");
    await pending;
    expect(engine.snapshot().musicId).toBe("new");
  });
  it("removes failed playback instead of showing a phantom active sound", async () => {
    const engine = new AudioEngine(
      vi.fn(),
      vi.fn(),
      () =>
        ({
          play: () => Promise.reject(new Error("Unsupported codec")),
          pause: vi.fn(),
        }) as unknown as HTMLAudioElement,
    );
    await expect(engine.trigger(sound)).rejects.toThrow("Unsupported codec");
    expect(engine.snapshot().effects).toHaveLength(0);
  });
});
