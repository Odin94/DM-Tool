import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "./ui/alert-dialog";
import type { Campaign } from "@/lib/campaign";
import { archiveNote, restoreNote } from "@/lib/workspace";
import { deleteWithUndo, type DeletableKind } from "@/lib/deletion";

export function DeleteControl({
  kind,
  id,
  name,
  update,
  onDeleted,
  disabled = false,
  externalOpen,
  onExternalOpenChange,
  hideTrigger = false,
}: {
  kind: DeletableKind;
  id: string;
  name: string;
  update: (fn: (c: Campaign) => Campaign) => Promise<void>;
  onDeleted?: () => void;
  disabled?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = externalOpen ?? localOpen;
  const setOpen = onExternalOpenChange ?? setLocalOpen;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    setBusy(true);
    setError("");
    let undo: ((c: Campaign) => Campaign) | undefined;
    try {
      await update((c) => {
        if (kind === "notes") {
          undo = (current) => restoreNote(current, id);
          return archiveNote(c, id);
        }
        const deletion = deleteWithUndo(c, kind, id);
        undo = deletion.undo;
        return deletion.campaign;
      });
      const restore = () => {
        void update((c) => undo!(c))
          .then(() => toast.success(`${name} restored`))
          .catch((e) =>
            toast.error(String(e), {
              duration: Infinity,
              action: { label: "Retry undo", onClick: restore },
            }),
          );
      };
      toast.success(`${name} ${kind === "notes" ? "archived" : "deleted"}`, {
        duration: 12000,
        action: { label: "Undo", onClick: restore },
      });
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      if (kind === "notes") toast.error(`Could not archive note: ${String(e)}`);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      {!hideTrigger && (
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          disabled={disabled || busy}
          aria-label={`Delete ${name}`}
          title={`Delete ${name}`}
          onClick={() => (kind === "notes" ? void remove() : setOpen(true))}
        >
          <Trash2 />
        </Button>
      )}
      <AlertDialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
            <AlertDialogDescription>
              {kind === "scenes"
                ? "The scene will be removed. Its notes and assets will move to General."
                : "This item will be removed from your campaign."}{" "}
              You can undo this from the confirmation notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep it</AlertDialogCancel>
            <Button
              type="button"
              variant="ghost"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              aria-label={`Confirm deletion of ${name}`}
              title="Confirm deletion"
              onClick={() => void remove()}
            >
              {busy ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
