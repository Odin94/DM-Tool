import { lazy, Suspense } from "react";
import { QuickNavigator } from "@/components/quick-navigator";
import { useArchiveCleanup } from "@/hooks/use-campaign";
import { createFileRoute } from "@tanstack/react-router";
import { Dashboard } from "@/components/dashboard";

const WorkspacePages = lazy(() =>
  import("@/components/workspace-pages").then((m) => ({ default: m.WorkspacePages })),
);
export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    page?: "session" | "campaigns" | "library";
    tab?: "sounds" | "music" | "lighting" | "archive";
  } => ({
    page:
      search["page"] === "campaigns" || search["page"] === "library" ? search["page"] : "session",
    tab:
      search["tab"] === "sounds" || search["tab"] === "lighting" || search["tab"] === "archive"
        ? search["tab"]
        : "music",
  }),
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
  component: WorkspaceRoute,
});

function WorkspaceRoute() {
  const { page, tab } = Route.useSearch();
  useArchiveCleanup();
  return (
    <>
      <QuickNavigator />
      {page === "campaigns" || page === "library" ? (
        <Suspense fallback={<p className="p-8">Opening workspace...</p>}>
          <WorkspacePages page={page} tab={tab ?? "music"} />
        </Suspense>
      ) : (
        <Dashboard />
      )}
    </>
  );
}
