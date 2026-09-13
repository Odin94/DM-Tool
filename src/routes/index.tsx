import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hearthkeeper | TTRPG Session Dashboard" },
      {
        name: "description",
        content:
          "Run scenes, sounds, notes, lighting, and characters from one focused TTRPG dashboard.",
      },
    ],
  }),
  component: Dashboard,
});
