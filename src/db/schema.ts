import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const settings = sqliteTable("campaign", {
  id: integer("id").primaryKey(),
  version: integer("version").notNull(),
  name: text("name").notNull(),
  session: integer("session").notNull(),
  activeSceneId: text("active_scene_id").notNull(),
  pinned: text("pinned", { mode: "json" }).$type<string[]>().notNull(),
  musicVolume: integer("music_volume").notNull(),
  soundVolume: integer("sound_volume").notNull(),
});
export const scenes = sqliteTable("scenes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  chapter: text("chapter").notNull(),
  background: text("background").notNull(),
  video: integer("video", { mode: "boolean" }).notNull(),
  musicId: text("music_id"),
  lightingId: text("lighting_id"),
  position: integer("position").notNull(),
});
const assetColumns = () => ({
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  sceneId: text("scene_id").references(() => scenes.id),
  priority: integer("priority").notNull(),
  tone: text("tone").notNull(),
  position: integer("position").notNull(),
});
const audioColumns = () => ({
  ...assetColumns(),
  source: text("source").notNull(),
  loop: integer("loop", { mode: "boolean" }).notNull(),
  volume: integer("volume").notNull().default(100),
});
export const sounds = sqliteTable("sounds", audioColumns());
export const music = sqliteTable("music", audioColumns());
export const characters = sqliteTable("characters", {
  ...assetColumns(),
  role: text("role").notNull(),
  hp: text("hp").notNull(),
  detail: text("detail").notNull(),
  notes: text("notes").notNull(),
});
export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  sceneId: text("scene_id").references(() => scenes.id),
  text: text("text").notNull(),
  createdAt: text("created_at").notNull(),
  position: integer("position").notNull(),
});
