import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Invoice } from "@/types";

export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: async (): Promise<Invoice[]> => {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, company:companies(id,name), engagement:delivery_engagements(id,title)")
        .order("invoice_date", { ascending: false });
      if (error) throw error;
      return data;
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
        .select(`
          *,
          company:companies(id,name),
          engagement:delivery_engagements(id,title),
          line_items:invoice_line_items(*),
          payments(*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
