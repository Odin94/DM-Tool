import { useState, type ReactNode } from "react";
import type { Campaign } from "@/lib/campaign";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "./ui/context-menu";
import { DeleteControl } from "./delete-control";

export function AssetMenu({
  children,
  campaign,
  kind,
  id,
  edit,
  update,
  report,
  actions = [],
  onDeleted,
}: {
  children: ReactNode;
  campaign: Campaign;
  kind: "sounds" | "characters";
  id: string;
  edit: () => void;
  update: (fn: (c: Campaign) => Campaign) => Promise<void>;
  report: (p: Promise<unknown>) => void;
  actions?: { label: string; run: () => void }[];
  onDeleted?: (() => void) | undefined;
}) {
  const [deleting, setDeleting] = useState(false);
  const item = campaign[kind].find((x) => x.id === id)!;
  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent>
          {actions.map((action) => (
            <ContextMenuItem key={action.label} onSelect={action.run}>
              {action.label}
            </ContextMenuItem>
          ))}
          <ContextMenuItem onSelect={edit}>
            Edit {kind === "sounds" ? "sound" : "character"}
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              report(
                update((c) => ({
                  ...c,
                  [kind]: [
                    ...c[kind],
                    {
                      ...c[kind].find((x) => x.id === id)!,
                      id: crypto.randomUUID(),
                      name: `${item.name} (copy)`,
                    },
                  ],
                })),
              )
            }
          >
            Duplicate
          </ContextMenuItem>
          <ContextMenuItem
            onSelect={() =>
              report(
                update((c) => ({
                  ...c,
                  [kind]: c[kind].map((x) =>
                    x.id === id
                      ? { ...x, sceneId: item.sceneId === null ? c.activeSceneId : null }
                      : x,
                  ),
                })),
              )
            }
          >
            {item.sceneId === null ? "Move to this scene" : "Move to General"}
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem className="text-destructive" onSelect={() => setDeleting(true)}>
            Delete…
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <DeleteControl
        kind={kind}
        id={id}
        name={item.name}
        update={update}
        externalOpen={deleting}
        onExternalOpenChange={setDeleting}
        hideTrigger
        onDeleted={onDeleted ?? (() => {})}
      />
    </>
  );
}
