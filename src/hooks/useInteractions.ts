import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Interaction, InteractionType } from "@/types";

export function useInteractions(contactId?: string, companyId?: string) {
  return useQuery({
    queryKey: ["interactions", { contactId, companyId }],
    queryFn: async (): Promise<Interaction[]> => {
      let q = supabase
        .from("interactions")
        .select("*, contact:contacts(id,first_name,last_name)")
        .order("occurred_at", { ascending: false });
      if (contactId) q = q.eq("contact_id", contactId);
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as Interaction[];
    },
  });
}

export function useLogInteraction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      contact_id?: string;
      company_id?: string;
      deal_id?: string;
      deal_type?: string;
      type: InteractionType;
      subject?: string;
      summary?: string;
      occurred_at: string;
      source?: string;
    }) => {
      const { data, error } = await supabase.from("interactions").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["interactions"] });
      if (vars.contact_id) qc.invalidateQueries({ queryKey: ["contact", vars.contact_id] });
      if (vars.company_id) qc.invalidateQueries({ queryKey: ["company", vars.company_id] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
