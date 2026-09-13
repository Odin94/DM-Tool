import { type Campaign, deleteScene } from "./campaign";
export type DeletableKind = "scenes" | "sounds" | "music" | "characters" | "notes";

export function deleteWithUndo(before: Campaign, kind: DeletableKind, id: string) {
  const item = before[kind].find((x) => x.id === id);
  if (!item) throw new Error("This item has already been deleted.");
  const index = before[kind].findIndex((x) => x.id === id);
  const after =
    kind === "scenes"
      ? deleteScene(before, id)
      : {
          ...before,
          [kind]: before[kind].filter((x) => x.id !== id),
          pinned: kind === "characters" ? before.pinned.filter((x) => x !== id) : before.pinned,
          scenes:
            kind === "music"
              ? before.scenes.map((s) => (s.musicId === id ? { ...s, musicId: null } : s))
              : before.scenes,
        };
  return {
    campaign: after as Campaign,
    undo: (current: Campaign): Campaign => {
      if (current[kind].some((x) => x.id === id)) return current;
      const items = [...current[kind]];
      items.splice(Math.min(index, items.length), 0, item);
      const next = { ...current, [kind]: items } as Campaign;
      // If the item's old scene was also deleted later, restore the item to General.
      if (
        kind !== "scenes" &&
        "sceneId" in item &&
        item.sceneId &&
        !current.scenes.some((s) => s.id === item.sceneId)
      ) {
        next[kind] = next[kind].map((x) => (x.id === id ? { ...x, sceneId: null } : x)) as never;
      }
      if (kind === "scenes") {
        for (const collection of ["sounds", "music", "characters", "notes"] as const) {
          const ids = new Set(before[collection].filter((x) => x.sceneId === id).map((x) => x.id));
          next[collection] = current[collection].map((x) =>
            ids.has(x.id) && x.sceneId === null ? { ...x, sceneId: id } : x,
          ) as never;
        }
        if (before.activeSceneId === id && current.activeSceneId === after.activeSceneId)
          next.activeSceneId = id;
        next.scenes = next.scenes.map((s) =>
          s.id === id && s.musicId && !next.music.some((m) => m.id === s.musicId)
            ? { ...s, musicId: null }
            : s,
        );
      }
      if (kind === "characters" && before.pinned.includes(id))
        next.pinned = [...current.pinned, id];
      if (kind === "music") {
        const ids = new Set(before.scenes.filter((s) => s.musicId === id).map((s) => s.id));
        next.scenes = current.scenes.map((s) =>
          ids.has(s.id) && s.musicId === null ? { ...s, musicId: id } : s,
        );
      }
      return next;
    },
  };
}
