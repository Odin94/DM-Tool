import { useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { useWorkspace } from "@/hooks/use-campaign";
import type { Campaign } from "@/lib/campaign";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "./ui/sheet";

export function LibraryImport({
  campaign,
  update,
  report,
}: {
  campaign: Campaign;
  update: (fn: (c: Campaign) => Campaign) => Promise<void>;
  report: (p: Promise<unknown>) => void;
}) {
  const { data } = useWorkspace();
  const [kind, setKind] = useState<"sounds" | "music" | "lighting">("music");
  const [scope, setScope] = useState(campaign.activeSceneId);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="quiet">Import from library</Button>
      </SheetTrigger>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Import from general library</SheetTitle>
          <SheetDescription>
            Creates an independent copy in {campaign.name}. The original stays in your library.
          </SheetDescription>
        </SheetHeader>
        <div className="flex gap-2">
          {(["sounds", "music", "lighting"] as const).map((k) => (
            <Button key={k} variant={k === kind ? "soft" : "ghost"} onClick={() => setKind(k)}>
              {k}
            </Button>
          ))}
        </div>
        <Input
          aria-label="Find library asset"
          placeholder="Find an asset…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {kind !== "lighting" && (
          <label className="text-sm">
            Copy into
            <select
              className="mt-1 w-full rounded-md border p-2"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
            >
              <option value="">General</option>
              {campaign.scenes.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="space-y-2">
          {data?.library[kind]
            .filter((item) => item.name.toLowerCase().includes(query.toLowerCase()))
            .map((item) => (
              <Button
                className="h-auto w-full justify-between whitespace-normal"
                key={item.id}
                variant="quiet"
                disabled={busy}
                onClick={() => {
                  setBusy(true);
                  report(
                    update((c) => ({
                      ...c,
                      [kind]: [
                        ...(c[kind] ?? []),
                        {
                          ...item,
                          id: crypto.randomUUID(),
                          ...("sceneId" in item
                            ? { sceneId: c.scenes.some((s) => s.id === scope) ? scope : null }
                            : {}),
                        },
                      ],
                    }))
                      .then(() => toast.success(`${item.name} copied into campaign`))
                      .finally(() => setBusy(false)),
                  );
                }}
              >
                {item.name}
                <span className="text-xs">Import copy</span>
              </Button>
            ))}
        </div>
        {!data?.library[kind].length && (
          <p className="text-sm text-muted-foreground">No {kind} in the general library yet.</p>
        )}
        <Button variant="ghost" asChild>
          <Link to="/" search={{ page: "library", tab: kind }}>
            Open general library
          </Link>
        </Button>
      </SheetContent>
    </Sheet>
  );
}
