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
import { deleteWithUndo, type DeletableKind } from "@/lib/deletion";

export function DeleteControl({
  kind,
  id,
  name,
  update,
  onDeleted,
  disabled = false,
}: {
  kind: DeletableKind;
  id: string;
  name: string;
  update: (fn: (c: Campaign) => Campaign) => Promise<void>;
  onDeleted?: () => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const remove = async () => {
    setBusy(true);
    setError("");
    let undo: ((c: Campaign) => Campaign) | undefined;
    try {
      await update((c) => {
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
      toast.success(`${name} deleted`, {
        duration: 12000,
        action: { label: "Undo", onClick: restore },
      });
      setOpen(false);
      onDeleted?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="size-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        disabled={disabled}
        aria-label={`Delete ${name}`}
        title={`Delete ${name}`}
        onClick={() => setOpen(true)}
      >
        <Trash2 />
      </Button>
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
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              disabled={busy}
              aria-label={`Confirm deletion of ${name}`}
              title="Confirm deletion"
              onClick={() => void remove()}
            >
              <Trash2 />
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
