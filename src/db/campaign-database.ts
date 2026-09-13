import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import wasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import { drizzle } from "drizzle-orm/sql-js";
import { asc, getTableColumns, getTableName } from "drizzle-orm";
import * as tables from "./schema";
import migration from "./migrations/0000_initial.sql?raw";
import { campaignSchema, type Campaign } from "@/lib/campaign";

let sqlite: Promise<SqlJsStatic> | undefined;
export interface DatabaseStorage {
  load: () => Promise<Uint8Array | undefined>;
  save: (bytes: Uint8Array, campaign: Campaign) => Promise<void>;
  legacy: () => Promise<Campaign>;
}

export class CampaignDatabase {
  private connection: Database | undefined;
  private opening: Promise<void> | undefined;
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: DatabaseStorage,
    private initialize = () => (sqlite ??= initSqlJs({ locateFile: () => wasmUrl })),
  ) {}
  private async open() {
    if (!this.opening)
      this.opening = this.initialize()
        .then(async (SQL) => {
          const bytes = await this.storage.load();
          const connection = new SQL.Database(bytes);
          try {
            const version = Number(connection.exec("PRAGMA user_version")[0]?.values[0]?.[0] ?? 0);
            if (version > 1)
              throw new Error("This database was created by a newer Hearthkeeper version.");
            if (version < 1) {
              const existing =
                connection.exec(
                  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
                )[0]?.values ?? [];
              if (existing.length === 0) {
                connection.run(
                  `BEGIN;${migration.replaceAll("--> statement-breakpoint", "")} PRAGMA user_version = 1; COMMIT;`,
                );
              } else {
                // Early development builds created this schema without stamping user_version.
                // Adopt only the exact known schema; never recreate or erase unfamiliar tables.
                const known = Object.values(tables);
                if (
                  existing.length !== known.length ||
                  !known.every((table) => {
                    const columns =
                      connection
                        .exec(`PRAGMA table_info('${getTableName(table)}')`)[0]
                        ?.values.map((row) => String(row[1])) ?? [];
                    const expected = Object.values(getTableColumns(table)).map(
                      (column) => column.name,
                    );
                    return (
                      columns.length === expected.length &&
                      expected.every((name) => columns.includes(name))
                    );
                  })
                )
                  throw new Error(
                    "Unrecognized SQLite schema. Your database has not been changed.",
                  );
                connection.run("PRAGMA user_version = 1");
              }
            }
            connection.run("PRAGMA foreign_keys = ON");
            this.connection = connection;
            if (!bytes) {
              const c = campaignSchema.parse(await this.storage.legacy());
              this.replace(c);
              await this.storage.save(connection.export(), c);
            } else if (version < 1) {
              await this.storage.save(connection.export(), this.readRows());
            }
          } catch (error) {
            connection.close();
            this.connection = undefined;
            throw error;
          }
        })
        .catch((error) => {
          this.opening = undefined;
          throw error;
        });
    await this.opening;
  }
  async read(): Promise<Campaign> {
    await this.open();
    await this.queue;
    return this.readRows();
  }
  private readRows(): Campaign {
    const db = drizzle(this.connection!);
    const settings = db.select().from(tables.settings).get();
    if (!settings) throw new Error("Campaign settings are missing from the database.");
    return campaignSchema.parse({
      ...settings,
      scenes: db.select().from(tables.scenes).orderBy(asc(tables.scenes.position)).all(),
      sounds: db.select().from(tables.sounds).orderBy(asc(tables.sounds.position)).all(),
      music: db.select().from(tables.music).orderBy(asc(tables.music.position)).all(),
      characters: db
        .select()
        .from(tables.characters)
        .orderBy(asc(tables.characters.position))
        .all(),
      notes: db.select().from(tables.notes).orderBy(asc(tables.notes.position)).all(),
    });
  }
  private replace(c: Campaign) {
    this.connection!.run("PRAGMA foreign_keys = ON");
    const db = drizzle(this.connection!);
    db.transaction((tx) => {
      tx.delete(tables.notes).run();
      tx.delete(tables.characters).run();
      tx.delete(tables.music).run();
      tx.delete(tables.sounds).run();
      tx.delete(tables.scenes).run();
      tx.delete(tables.settings).run();
      const { scenes, sounds, music, characters, notes, ...settings } = c;
      tx.insert(tables.settings)
        .values({ id: 1, ...settings })
        .run();
      // One insert per row avoids SQLite's bound-parameter limit on large notebooks.
      scenes.forEach((s, position) =>
        tx
          .insert(tables.scenes)
          .values({ ...s, position })
          .run(),
      );
      sounds.forEach((s, position) =>
        tx
          .insert(tables.sounds)
          .values({ ...s, position })
          .run(),
      );
      music.forEach((s, position) =>
        tx
          .insert(tables.music)
          .values({ ...s, position })
          .run(),
      );
      characters.forEach((s, position) =>
        tx
          .insert(tables.characters)
          .values({ ...s, position })
          .run(),
      );
      notes.forEach((s, position) =>
        tx
          .insert(tables.notes)
          .values({ ...s, position })
          .run(),
      );
    });
  }
  async write(value: Campaign) {
    const c = campaignSchema.parse(value);
    await this.open();
    const operation = this.queue.then(async () => {
      const previous = this.connection!.export();
      try {
        this.replace(c);
        await this.storage.save(this.connection!.export(), c);
      } catch (error) {
        this.connection!.close();
        const SQL = await this.initialize();
        this.connection = new SQL.Database(previous);
        throw error;
      }
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
