import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AgentRun, AgentAction, AgentConfig, AgentActionStatus } from "@/types";

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
      return data as AgentRun[];
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
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_runs"] }),
  });
}

export function useAgentConfig() {
  return useQuery({
    queryKey: ["agent_config"],
    queryFn: async (): Promise<AgentConfig[]> => {
      const { data, error } = await supabase
        .from("agent_config")
        .select("*")
        .order("config_key");
      if (error) throw error;
      return data as AgentConfig[];
    },
  });
}

export function useUpdateAgentConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ config_key, config_value }: { config_key: string; config_value: Record<string, unknown> }) => {
      const { data, error } = await supabase
        .from("agent_config")
        .update({ config_value, updated_at: new Date().toISOString() })
        .eq("config_key", config_key)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agent_config"] }),
  });
}
