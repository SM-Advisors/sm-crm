import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EngagementLetterService, EngagementLetter } from "@/types";

// ── Services (catalog) ─────────────────────────────────────────────────────────

export function useEngagementLetterServices() {
  return useQuery({
    queryKey: ["engagement_letter_services"],
    queryFn: async (): Promise<EngagementLetterService[]> => {
      const { data, error } = await supabase
        .from("engagement_letter_services")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as EngagementLetterService[];
    },
  });
}

export function useCreateEngagementLetterService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<EngagementLetterService, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("engagement_letter_services")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement_letter_services"] }),
  });
}

export function useUpdateEngagementLetterService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EngagementLetterService> & { id: string }) => {
      const { data, error } = await supabase
        .from("engagement_letter_services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement_letter_services"] }),
  });
}

export function useDeleteEngagementLetterService() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("engagement_letter_services")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement_letter_services"] }),
  });
}

// ── Executed Letters ───────────────────────────────────────────────────────────

export function useEngagementLetters() {
  return useQuery({
    queryKey: ["engagement_letters"],
    queryFn: async (): Promise<EngagementLetter[]> => {
      const { data, error } = await supabase
        .from("engagement_letters")
        .select("*, company:companies(id, name), service:engagement_letter_services(id, category_name, service_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as EngagementLetter[];
    },
  });
}

export function useCreateEngagementLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<EngagementLetter, "id" | "created_at" | "updated_at" | "company" | "service">) => {
      const { data, error } = await supabase
        .from("engagement_letters")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement_letters"] }),
  });
}

export function useUpdateEngagementLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EngagementLetter> & { id: string }) => {
      const { company, service, ...rest } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("engagement_letters")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement_letters"] }),
  });
}

export function useDeleteEngagementLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("engagement_letters")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["engagement_letters"] }),
  });
}
