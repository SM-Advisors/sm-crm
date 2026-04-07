import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Invoice } from "@/types";

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, company:companies(id,name)")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Invoice[];
    },
  });
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    enabled: !!id,
    queryFn: async (): Promise<Invoice> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, company:companies(id,name), line_items:invoice_line_items(*), payments(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as unknown as Invoice;
    },
  });
}

export function useUpdateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Invoice> & { id: string }) => {
      const { company, engagement, line_items, payments, ...rest } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("invoices")
        .update({ ...rest, updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["invoice", vars.id] });
    },
  });
}
