import { describe, it, expect, vi } from "vitest";
import initSqlJs from "sql.js";
import { CampaignDatabase } from "./campaign-database";
import { initialCampaign } from "@/lib/campaign";

describe("SQLite and Drizzle campaign storage", () => {
  it("adopts a complete early schema without dropping existing data", async () => {
    let bytes: Uint8Array | undefined;
    const storage = {
      load: async () => bytes,
      save: async (b: Uint8Array) => {
        bytes = b;
      },
      legacy: async () => ({ ...structuredClone(initialCampaign), name: "Existing campaign" }),
    };
    await new CampaignDatabase(storage).read();
    const SQL = await initSqlJs();
    const early = new SQL.Database(bytes);
    early.run("PRAGMA user_version=0");
    bytes = early.export();
    early.close();
    expect((await new CampaignDatabase(storage).read()).name).toBe("Existing campaign");
    const verified = new SQL.Database(bytes);
    expect(verified.exec("PRAGMA user_version")[0]?.values[0]?.[0]).toBe(1);
    verified.close();
  });
  it("migrates legacy data into relational SQLite and reopens without reading legacy again", async () => {
    let bytes: Uint8Array | undefined;
    const legacy = vi.fn(async () => structuredClone(initialCampaign));
    const storage = {
      load: async () => bytes,
      save: async (b: Uint8Array) => {
        bytes = b;
      },
      legacy,
    };
    const first = new CampaignDatabase(storage);
    expect(await first.read()).toEqual(initialCampaign);
    expect(new TextDecoder().decode(bytes!.slice(0, 15))).toBe("SQLite format 3");
    const SQL = await initSqlJs();
    const db = new SQL.Database(bytes);
    expect(db.exec("SELECT COUNT(*) FROM sounds")[0]?.values[0]?.[0]).toBe(10);
    expect(db.exec("PRAGMA user_version")[0]?.values[0]?.[0]).toBe(1);
    db.close();
    const second = new CampaignDatabase(storage);
    expect(await second.read()).toEqual(initialCampaign);
    expect(legacy).toHaveBeenCalledTimes(1);
  });
  it("rolls back the in-memory transaction when persisting the file fails", async () => {
    const save = vi.fn(async () => {});
    const db = new CampaignDatabase({
      load: async () => undefined,
      save,
      legacy: async () => structuredClone(initialCampaign),
    });
    await db.read();
    save.mockRejectedValueOnce(new Error("Disk full"));
    await expect(db.write({ ...initialCampaign, name: "Must not be saved" })).rejects.toThrow(
      "Disk full",
    );
    expect((await db.read()).name).toBe(initialCampaign.name);
    await db.write({ ...initialCampaign, name: "Recovered" });
    expect((await db.read()).name).toBe("Recovered");
  });
  it("preserves note order and sound volumes through saves", async () => {
    const db = new CampaignDatabase({
      load: async () => undefined,
      save: async () => {},
      legacy: async () => structuredClone(initialCampaign),
    });
    const c = structuredClone(initialCampaign);
    c.sounds[0]!.volume = 27;
    c.notes.reverse();
    await db.write(c);
    expect(await db.read()).toEqual(c);
  });
  it("refuses corrupt SQLite rather than replacing it with defaults", async () => {
    const legacy = vi.fn(async () => initialCampaign);
    const save = vi.fn(async () => {});
    const db = new CampaignDatabase({
      load: async () => new TextEncoder().encode("corrupt file"),
      save,
      legacy,
    });
    await expect(db.read()).rejects.toThrow();
    expect(save).not.toHaveBeenCalled();
    expect(legacy).not.toHaveBeenCalled();
  });
});
