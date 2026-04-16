import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Reminder } from "@/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export function useReminders(contactId?: string) {
  return useQuery({
    queryKey: ["reminders", contactId],
    enabled: !!contactId,
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await sb
        .from("reminders")
        .select("*")
        .eq("contact_id", contactId!)
        .order("remind_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Reminder[];
    },
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contact_id: string;
      company_id?: string | null;
      title: string;
      description?: string | null;
      remind_at: string;
    }) => {
      const { data, error } = await sb
        .from("reminders")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reminders", vars.contact_id] });
    },
  });
}

export function useUpdateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      contact_id,
      ...updates
    }: Partial<Reminder> & { id: string; contact_id: string }) => {
      const { data, error } = await sb
        .from("reminders")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as Reminder;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reminders", vars.contact_id] });
    },
  });
}

export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contact_id }: { id: string; contact_id: string }) => {
      const { error } = await sb
        .from("reminders")
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reminders", vars.contact_id] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, contact_id }: { id: string; contact_id: string }) => {
      const { error } = await sb
        .from("reminders")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["reminders", vars.contact_id] });
    },
  });
}
