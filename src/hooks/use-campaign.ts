import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadCampaign, saveCampaign } from "@/lib/storage";
import type { Campaign } from "@/lib/campaign";

export function useCampaign() {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["campaign"],
    queryFn: loadCampaign,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const mutation = useMutation({
    scope: { id: "campaign-write" },
    mutationFn: async (update: (c: Campaign) => Campaign) => {
      const current = client.getQueryData<Campaign>(["campaign"]);
      if (!current) throw new Error("Campaign is still loading.");
      const next = update(current);
      await saveCampaign(next);
      client.setQueryData(["campaign"], next);
    },
  });
  return {
    ...query,
    update: mutation.mutateAsync,
    saving: mutation.isPending,
    saveError: mutation.error,
  };
}
