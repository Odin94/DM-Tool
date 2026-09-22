import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";
import { purgeArchive, type Workspace } from "@/lib/workspace";
import type { Campaign } from "@/lib/campaign";

export function useWorkspace() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["workspace"],
    queryFn: loadWorkspace,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const mutation = useMutation({
    scope: { id: "workspace-write" },
    mutationFn: async (update: (w: Workspace) => Workspace) => {
      const current = client.getQueryData<Workspace>(["workspace"]);
      if (!current) throw new Error("Workspace is still loading.");
      const next = update(current);
      if (next === current) return;
      client.setQueryData(["workspace"], next);
      try {
        await saveWorkspace(next);
      } catch (error) {
        client.setQueryData(["workspace"], current);
        throw error;
      }
    },
  });
  return {
    ...query,
    update: mutation.mutateAsync,
    saving: mutation.isPending,
    saveError: mutation.error,
  };
}
export function useArchiveCleanup() {
  const { data, update } = useWorkspace();
  const ready = !!data;
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      void update((w) => purgeArchive(w)).catch(() => {
        /* Retry on next launch; keep notes on save failure. */
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [ready, update]);
}
export function useCampaign() {
  const state = useWorkspace();
  const id = state.data?.activeCampaignId;
  return {
    ...state,
    data: state.data?.campaigns.find((c) => c.id === id)?.campaign,
    campaignId: id,
    update: (fn: (c: Campaign) => Campaign) =>
      state.update((w) => ({
        ...w,
        campaigns: w.campaigns.map((entry) =>
          entry.id === id ? { ...entry, campaign: fn(entry.campaign) } : entry,
        ),
      })),
  };
}
