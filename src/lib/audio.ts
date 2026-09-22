import { resolveMedia } from "./storage";
import type { Sound } from "./campaign";

export class AudioEngine {
  private effects = new Map<
    string,
    { soundId: string; audio: HTMLAudioElement; loop: boolean; gain: number; source: string }
  >();
  private prepared = new Map<string, HTMLAudioElement>();
  private preparing = new Map<string, Promise<void>>();
  private preloadGeneration = 0;
  private wanted = new Set<string>();
  // Bounded warm pool: active-scene sounds first, then general sounds and music.
  async preload(sounds: Sound[]) {
    const sources = [...new Set(sounds.map((s) => s.source).filter(Boolean))].slice(0, 24);
    this.wanted = new Set(sources);
    const generation = ++this.preloadGeneration;
    for (const [source, audio] of this.prepared) {
      if (!this.wanted.has(source)) {
        audio.src = "";
        this.prepared.delete(source);
      }
    }
    let index = 0;
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        while (index < sources.length && generation === this.preloadGeneration) {
          const source = sources[index++]!;
          try {
            await this.prepare(source);
          } catch {
            /* Surface failures on play; startup stays usable. */
          }
        }
      }),
    );
  }
  private prepare(source: string): Promise<void> {
    if (this.prepared.has(source)) return Promise.resolve();
    const pending = this.preparing.get(source);
    if (pending) return pending;
    const operation = resolveMedia(source)
      .then((src) => {
        if (!this.wanted.has(source)) return;
        const audio = this.createAudio(src);
        audio.preload = "auto";
        audio.load?.();
        this.prepared.set(source, audio);
      })
      .finally(() => this.preparing.delete(source));
    this.preparing.set(source, operation);
    return operation;
  }
  private takePrepared(source: string) {
    const audio = this.prepared.get(source);
    if (audio) this.prepared.delete(source);
    return audio;
  }
  private release(audio: HTMLAudioElement, source?: string) {
    audio.pause();
    audio.currentTime = 0;
    audio.onended = null;
    audio.onerror = null;
    if (source && this.wanted.has(source) && !this.prepared.has(source))
      this.prepared.set(source, audio);
    else audio.src = "";
  }
  progress(instanceId: string) {
    const audio = instanceId === "music" ? this.music : this.effects.get(instanceId)?.audio;
    return {
      position: audio?.currentTime || 0,
      duration: Number.isFinite(audio?.duration) ? audio!.duration : 0,
      paused: audio?.paused ?? true,
    };
  }
  seek(instanceId: string, seconds: number) {
    const audio = instanceId === "music" ? this.music : this.effects.get(instanceId)?.audio;
    if (audio && Number.isFinite(audio.duration) && audio.duration > 0)
      audio.currentTime = Math.max(0, Math.min(seconds, audio.duration));
  }
  async togglePause(instanceId: string) {
    const audio = instanceId === "music" ? this.music : this.effects.get(instanceId)?.audio;
    if (!audio) return;
    if (audio.paused) await audio.play();
    else audio.pause();
    this.changed();
  }
  stop(instanceId: string) {
    if (instanceId === "music") {
      this.stopMusic();
      return;
    }
    const effect = this.effects.get(instanceId);
    if (effect) {
      this.release(effect.audio, effect.source);
      this.effects.delete(instanceId);
      this.changed();
    }
  }
  dispose() {
    this.wanted.clear();
    this.preloadGeneration++;
    this.stopAll();
    this.prepared.forEach((audio) => {
      audio.src = "";
    });
    this.prepared.clear();
  }
  private musicSource = "";
  private musicGain = 1;
  private music: HTMLAudioElement | null = null;
  private musicId: string | null = null;
  private generation = 0;
  private effectGeneration = 0;
  private pendingLoops = new Set<string>();
  musicVolume = 0.64;
  soundVolume = 0.8;
  constructor(
    private changed: () => void,
    private failed: (message: string) => void,
    private createAudio = (src: string) => new Audio(src),
  ) {}
  snapshot() {
    return {
      effects: [...this.effects.entries()].map(([instanceId, x]) => ({
        id: x.soundId,
        loop: x.loop,
        instanceId,
      })),
      musicId: this.musicId,
      musicPlaying: !!this.music && !this.music.paused,
    };
  }
  async trigger(sound: Sound) {
    const existing = [...this.effects.entries()].find(([, v]) => v.soundId === sound.id && v.loop);
    if (existing) {
      this.stop(existing[0]);
      return;
    }
    if (sound.loop && this.pendingLoops.has(sound.id)) return;
    if (sound.loop) this.pendingLoops.add(sound.id);
    const generation = this.effectGeneration;
    try {
      let audio = this.takePrepared(sound.source);
      if (!audio) {
        const src = await resolveMedia(sound.source);
        if (generation !== this.effectGeneration) return;
        audio = this.createAudio(src);
      }
      audio.loop = sound.loop;
      const gain = sound.volume / 100;
      audio.volume = this.soundVolume * gain;
      const id = crypto.randomUUID();
      this.effects.set(id, {
        soundId: sound.id,
        audio,
        loop: sound.loop,
        gain,
        source: sound.source,
      });
      const remove = () => {
        if (this.effects.has(id)) this.release(audio!, sound.source);
        this.effects.delete(id);
        this.changed();
      };
      audio.onended = remove;
      audio.onerror = () => {
        remove();
        this.failed(`Could not play ${sound.name}. Check the file or URL.`);
      };
      try {
        await audio.play();
        this.changed();
      } catch (error) {
        remove();
        throw error;
      }
    } finally {
      this.pendingLoops.delete(sound.id);
    }
  }
  async playMusic(sound: Sound) {
    const generation = ++this.generation;
    if (this.musicId === sound.id && this.music) {
      if (this.music.paused) await this.music.play();
      else this.music.pause();
      this.changed();
      return;
    }
    let audio = this.takePrepared(sound.source);
    if (!audio) {
      const src = await resolveMedia(sound.source);
      if (generation !== this.generation) return;
      audio = this.createAudio(src);
    }
    if (this.music) this.release(this.music, this.musicSource);
    this.musicSource = sound.source;
    this.music = audio;
    this.musicId = sound.id;
    audio.loop = true;
    this.musicGain = sound.volume / 100;
    audio.volume = this.musicVolume * this.musicGain;
    audio.onerror = () => {
      if (this.music === audio) {
        this.stopMusic();
        this.failed(`Could not play ${sound.name}. Check the file or URL.`);
      }
    };
    try {
      await audio.play();
    } catch (error) {
      if (this.music === audio) this.stopMusic();
      throw error;
    } finally {
      this.changed();
    }
  }
  setVolumes(music: number, sound: number) {
    this.musicVolume = music / 100;
    this.soundVolume = sound / 100;
    if (this.music) this.music.volume = this.musicVolume * this.musicGain;
    this.effects.forEach((v) => (v.audio.volume = this.soundVolume * v.gain));
  }
  setAssetVolumes(sounds: Sound[], music: Sound[]) {
    this.effects.forEach((effect) => {
      const config = sounds.find((s) => s.id === effect.soundId);
      if (config) effect.gain = config.volume / 100;
    });
    const track = music.find((m) => m.id === this.musicId);
    if (track) this.musicGain = track.volume / 100;
    this.setVolumes(this.musicVolume * 100, this.soundVolume * 100);
  }
  stopMusic() {
    this.generation++;
    if (this.music) this.release(this.music, this.musicSource);
    this.music = null;
    this.musicId = null;
    this.changed();
  }
  stopEffects() {
    this.effectGeneration++;
    this.effects.forEach((v) => this.release(v.audio, v.source));
    this.effects.clear();
    this.pendingLoops.clear();
    this.changed();
  }
  stopAll() {
    this.stopMusic();
    this.stopEffects();
  }
}
