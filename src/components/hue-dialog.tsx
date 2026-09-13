import { useState } from "react";
import { isTauri, invoke } from "@tauri-apps/api/core";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lightbulb } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "./ui/dialog";
type HueScene = { id: string; metadata: { name: string }; group: { rid: string } };
export function HueDialog({
  suggested,
  onSelect,
}: {
  suggested: string | null;
  onSelect: (id: string) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [ip, setIp] = useState("");
  const [active, setActive] = useState<string | null>(null);
  const client = useQueryClient();
  const desktop = isTauri();
  const query = useQuery({
    queryKey: ["hue-scenes"],
    queryFn: () => invoke<HueScene[]>("hue_scenes"),
    enabled: open && desktop,
    retry: false,
    staleTime: 30000,
  });
  const pair = useMutation({
    mutationFn: () => invoke("hue_pair", { ip }),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["hue-scenes"] });
    },
  });
  const recall = useMutation({
    mutationFn: async (id: string) => {
      await invoke("hue_recall", { id });
      setActive(id);
      await onSelect(id);
    },
  });
  const error = pair.error ?? recall.error;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="border border-scene-foreground/25 bg-scene/60 text-scene-foreground hover:bg-scene-foreground/15 hover:text-scene-foreground"
        >
          <Lightbulb />
          {active ? "Hue scene applied" : "Lighting"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Philips Hue lighting</DialogTitle>
          <DialogDescription>
            Recall scenes prepared in the Hue app. The last choice is remembered for this story
            scene.
          </DialogDescription>
        </DialogHeader>
        {!desktop ? (
          <p className="text-sm">
            Open the Tauri desktop app to pair your bridge and control lights on your local network.
          </p>
        ) : (
          <>
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                pair.mutate();
              }}
            >
              <label className="text-sm">
                Bridge IP address
                <Input
                  placeholder="192.168.1.20"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  required
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Find this in the Hue app’s bridge settings. Press the physical link button, then
                pair within 30 seconds.
              </p>
              <Button disabled={pair.isPending}>
                {pair.isPending ? "Pairing…" : "Pair bridge"}
              </Button>
            </form>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {String(error)}
              </p>
            )}
            {query.isPending ? (
              <p>Loading Hue scenes…</p>
            ) : query.error ? (
              <p className="text-sm">{String(query.error)}</p>
            ) : (
              <div className="grid max-h-64 gap-2 overflow-auto">
                {query.data?.map((s) => (
                  <Button
                    key={s.id}
                    variant={s.id === suggested ? "soft" : "quiet"}
                    className="h-auto justify-between whitespace-normal"
                    disabled={recall.isPending}
                    onClick={() => recall.mutate(s.id)}
                  >
                    {s.metadata.name}
                    {s.id === active ? " · Applied" : s.id === suggested ? " · Suggested" : ""}
                  </Button>
                ))}
                {query.data?.length === 0 && <p>Create a scene in the Hue app, then refresh.</p>}
              </div>
            )}
            <Button variant="ghost" onClick={() => query.refetch()} disabled={query.isFetching}>
              Refresh scenes
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
