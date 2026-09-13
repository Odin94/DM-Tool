import { resolveMedia } from "./storage";
import type { Sound } from "./campaign";

export class AudioEngine {
  private effects = new Map<
    string,
    { soundId: string; audio: HTMLAudioElement; loop: boolean; gain: number }
  >();
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
      effects: [...this.effects.values()].map((x) => ({ id: x.soundId, loop: x.loop })),
      musicId: this.musicId,
      musicPlaying: !!this.music && !this.music.paused,
    };
  }
  async trigger(sound: Sound) {
    const existing = [...this.effects.entries()].find(([, v]) => v.soundId === sound.id && v.loop);
    if (existing) {
      existing[1].audio.pause();
      this.effects.delete(existing[0]);
      this.changed();
      return;
    }
    if (sound.loop && this.pendingLoops.has(sound.id)) return;
    if (sound.loop) this.pendingLoops.add(sound.id);
    const generation = this.effectGeneration;
    try {
      const src = await resolveMedia(sound.source);
      if (generation !== this.effectGeneration) return;
      const audio = this.createAudio(src);
      audio.loop = sound.loop;
      const gain = sound.volume / 100;
      audio.volume = this.soundVolume * gain;
      const id = crypto.randomUUID();
      this.effects.set(id, { soundId: sound.id, audio, loop: sound.loop, gain });
      const remove = () => {
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
    const src = await resolveMedia(sound.source);
    if (generation !== this.generation) return;
    this.music?.pause();
    const audio = this.createAudio(src);
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
    this.music?.pause();
    this.music = null;
    this.musicId = null;
    this.changed();
  }
  stopEffects() {
    this.effectGeneration++;
    this.effects.forEach((v) => v.audio.pause());
    this.effects.clear();
    this.pendingLoops.clear();
    this.changed();
  }
  stopAll() {
    this.stopMusic();
    this.stopEffects();
  }
}
