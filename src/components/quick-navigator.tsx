import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useWorkspace } from "@/hooks/use-campaign";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
export function QuickNavigator() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const { data, update } = useWorkspace();
  const navigate = useNavigate();
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
        setQuery("");
      }
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  const go = async (page: "session" | "campaigns" | "library", id?: string) => {
    try {
      if (id) await update((w) => ({ ...w, activeCampaignId: id }));
      await navigate({ to: "/", search: { page } });
      setOpen(false);
    } catch (e) {
      setError(String(e));
    }
  };
  const options = [
    ...(["session", "campaigns", "library"] as const).map((page) => ({
      label: page[0]!.toUpperCase() + page.slice(1),
      run: () => void go(page),
    })),
    ...(data?.campaigns ?? []).map((c) => ({
      label: c.campaign.name,
      run: () => void go("session", c.id),
    })),
  ].filter((x) => x.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Go to…</DialogTitle>
          <DialogDescription>Find a page or campaign · Ctrl / Cmd + K</DialogDescription>
        </DialogHeader>
        <Input
          autoFocus
          aria-label="Search pages and campaigns"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") options[0]?.run();
          }}
        />
        <div className="max-h-80 overflow-auto">
          {options.map((option) => (
            <Button
              key={option.label}
              className="w-full justify-start"
              variant="ghost"
              onClick={option.run}
            >
              {option.label}
            </Button>
          ))}
        </div>
        {error && <p role="alert">{error}</p>}
      </DialogContent>
    </Dialog>
  );
}
