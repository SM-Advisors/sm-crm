import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SyncStatus } from "@/types";

export function useSyncStatus() {
  return useQuery({
    queryKey: ["sync_status"],
    queryFn: async (): Promise<SyncStatus[]> => {
      const { data, error } = await supabase
        .from("sync_status")
        .select("*")
        .order("service");
      if (error) throw error;
      return data as SyncStatus[];
    },
    refetchInterval: 60_000, // re-poll every 60s so status stays fresh
  });
}

export function useManualSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (service: string) => {
      // Upserts a sync_status row to signal n8n via a Supabase realtime change.
      // n8n workflow listens to sync_status inserts/updates where last_sync_status = 'requested'.
      const { error } = await supabase
        .from("sync_status")
        .upsert(
          {
            service,
            last_sync_status: "requested",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "service" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync_status"] });
    },
  });
}
