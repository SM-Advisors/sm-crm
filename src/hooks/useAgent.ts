import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { AgentRun, AgentActionStatus } from "@/types";

export function useAgentRuns() {
  return useQuery({
    queryKey: ["agent_runs"],
    queryFn: async (): Promise<AgentRun[]> => {
      const { data, error } = await supabase
        .from("agent_runs")
        .select("*, actions:agent_actions(*, contact:contacts(id,first_name,last_name))")
        .order("run_date", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as unknown as AgentRun[];
    },
  });
}

export function useUpdateAgentAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      dismiss_reason,
    }: {
      id: string;
      status: AgentActionStatus;
      dismiss_reason?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "approved") updates.approved_at = new Date().toISOString();
      if (status === "sent") updates.sent_at = new Date().toISOString();
      if (dismiss_reason) updates.dismiss_reason = dismiss_reason;
      const { data, error } = await supabase
        .from("agent_actions")
        .update(updates as { status: string })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_runs"] }),
  });
}

const DEFAULT_STAGE_PROBABILITIES: Record<string, number> = {
  qualification: 10,
  needs_analysis: 25,
  proposal: 50,
  cold_deal: 5,
  closed_won: 100,
  closed_lost: 0,
  service_complete: 100,
};

export function useStageProbabilities(): Record<string, number> {
  const { data: configs = [] } = useAgentConfig();
  const configMap = Object.fromEntries(configs.map((c) => [c.config_key, c.config_value]));
  const stored = (configMap["stage_probabilities"] as Record<string, number> | undefined) ?? {};
  return { ...DEFAULT_STAGE_PROBABILITIES, ...stored };
}

export function useAgentConfig() {
  return useQuery({
    queryKey: ["agent_config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agent_config")
        .select("*")
        .order("config_key");
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ config_key, config_value }: { config_key: string; config_value: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("agent_config")
        .upsert(
          { config_key, config_value: config_value as unknown as import("@/integrations/supabase/types").Json, updated_at: new Date().toISOString() },
          { onConflict: "config_key" }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_config"] }),
  });
}
