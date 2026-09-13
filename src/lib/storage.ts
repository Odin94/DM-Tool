import { invoke, isTauri } from "@tauri-apps/api/core";
import { campaignSchema, initialCampaign, notebook, type Campaign } from "./campaign";
import { CampaignDatabase } from "@/db/campaign-database";

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("hearthkeeper", 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("data");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function read<T>(key: string): Promise<T | undefined> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("data");
    const req = tx.objectStore("data").get(key);
    tx.oncomplete = () => {
      db.close();
      resolve(req.result as T | undefined);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
async function write(key: string, value: unknown) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("data", "readwrite");
    tx.objectStore("data").put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Storage could not be saved."));
    };
  });
}
async function loadLegacyCampaign(): Promise<Campaign> {
  const value = isTauri()
    ? await invoke<string | null>("load_campaign")
    : await read<Campaign>("campaign");
  return value == null
    ? structuredClone(initialCampaign)
    : campaignSchema.parse(typeof value === "string" ? JSON.parse(value) : value);
}
const campaignDatabase = new CampaignDatabase({
  load: async () => {
    const bytes = isTauri()
      ? await invoke<number[] | null>("load_database")
      : await read<Uint8Array>("sqlite");
    return bytes ? new Uint8Array(bytes) : undefined;
  },
  save: async (bytes, c) => {
    if (isTauri()) await invoke("save_database", { data: Array.from(bytes), notes: notebook(c) });
    else await write("sqlite", bytes);
  },
  legacy: loadLegacyCampaign,
});
export const loadCampaign = () => campaignDatabase.read();
export const saveCampaign = (c: Campaign) => campaignDatabase.write(c);
export async function importMedia(file: File): Promise<string> {
  if (!/^(audio|video|image)\//.test(file.type))
    throw new Error("Choose an audio, image, or video file.");
  if (file.size > 250 * 1024 * 1024) throw new Error("Choose a file smaller than 250 MB.");
  const id = crypto.randomUUID();
  await write(`media:${id}`, file);
  return `media:${id}`;
}
const urls = new Map<string, string>();
export async function resolveMedia(source: string): Promise<string> {
  if (!source) throw new Error("Attach a media file in the campaign library first.");
  if (!source.startsWith("media:")) {
    if (!/^https?:\/\//.test(source)) throw new Error("Use an HTTP(S) media URL or import a file.");
    return source;
  }
  const cached = urls.get(source);
  if (cached) return cached;
  const blob = await read<Blob>(source);
  if (!blob) throw new Error("This media file is missing. Reimport it in the library.");
  const url = URL.createObjectURL(blob);
  urls.set(source, url);
  return url;
}
export function download(name: string, content: string, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export async function exportBackup(c: Campaign) {
  const media: Record<string, string> = {};
  const refs = [...c.sounds, ...c.music]
    .map((s) => s.source)
    .concat(c.scenes.map((s) => s.background));
  for (const ref of new Set(refs.filter((r) => r.startsWith("media:")))) {
    const blob = await read<Blob>(ref);
    if (!blob) throw new Error("A media file is missing. Reimport it before backing up.");
    media[ref] = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
  download("hearthkeeper-backup.json", JSON.stringify({ campaign: c, media }), "application/json");
}
export async function importBackup(file: File) {
  const backup: unknown = JSON.parse(await file.text());
  if (!backup || typeof backup !== "object" || !("campaign" in backup) || !("media" in backup))
    throw new Error("Invalid backup.");
  const c = campaignSchema.parse(backup.campaign);
  const media = backup.media as Record<string, unknown>;
  // Give restored assets fresh IDs so a failed import cannot overwrite the current campaign's media.
  const remap = new Map<string, string>();
  for (const ref of new Set(
    [...c.sounds, ...c.music]
      .map((s) => s.source)
      .concat(c.scenes.map((s) => s.background))
      .filter((r) => r.startsWith("media:")),
  )) {
    const data = media?.[ref];
    if (typeof data !== "string" || !/^data:(audio|video|image)\/[\w.+-]+;base64,/.test(data))
      throw new Error("Backup contains missing or invalid media.");
    const blob = await (await fetch(data)).blob();
    const newRef = await importMedia(new File([blob], "restored", { type: blob.type }));
    remap.set(ref, newRef);
  }
  c.sounds.forEach((s) => {
    s.source = remap.get(s.source) ?? s.source;
  });
  c.music.forEach((s) => {
    s.source = remap.get(s.source) ?? s.source;
  });
  c.scenes.forEach((s) => {
    s.background = remap.get(s.background) ?? s.background;
  });
  return c;
}
