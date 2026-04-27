import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { SalesDeal, DeliveryEngagement, Interaction, Invoice } from "@/types";

export function useSalesDeals() {
  return useQuery({
    queryKey: ["sales_deals"],
    queryFn: async (): Promise<SalesDeal[]> => {
      const { data, error } = await supabase
        .from("sales_deals")
        .select("*, company:companies(id,name), contact:contacts(id,first_name,last_name)")
        .order("stage_order", { ascending: true });
      if (error) throw error;
      return data as unknown as SalesDeal[];
    },
  });
}

export function useSalesDeal(id: string) {
  return useQuery({
    queryKey: ["sales_deal", id],
    enabled: !!id,
    queryFn: async (): Promise<SalesDeal> => {
      const { data, error } = await supabase
        .from("sales_deals")
        .select("*, company:companies(id,name), contact:contacts(id,first_name,last_name,email,phone,company_id)")
        .eq("id", id)
        .single();
      if (error) throw error;

      let interactions: Interaction[] = [];
      if (data.contact_id) {
        const { data: ints } = await supabase
          .from("interactions")
          .select("*")
          .eq("contact_id", data.contact_id)
          .order("occurred_at", { ascending: false });
        interactions = (ints ?? []) as unknown as Interaction[];
      } else if (data.company_id) {
        const { data: ints } = await supabase
          .from("interactions")
          .select("*")
          .eq("company_id", data.company_id)
          .order("occurred_at", { ascending: false });
        interactions = (ints ?? []) as unknown as Interaction[];
      }

      // Fetch invoices linked directly to this deal (invoices.deal_id),
      // plus any invoices on delivery engagements that hang off this deal.
      const invoiceMap = new Map<string, Invoice>();

      const { data: directInvoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("deal_id", id)
        .order("invoice_date", { ascending: false });
      for (const inv of (directInvoices ?? []) as unknown as Invoice[]) {
        invoiceMap.set(inv.id, inv);
      }

      const { data: engagements } = await supabase
        .from("delivery_engagements")
        .select("id")
        .eq("sales_deal_id", id);
      const engagementIds = ((engagements ?? []) as { id: string }[]).map((e) => e.id);
      if (engagementIds.length > 0) {
        const { data: engInvoices } = await (supabase.from("invoices") as unknown as {
          select: (cols: string) => { in: (col: string, vals: string[]) => { order: (col: string, opts: { ascending: boolean }) => Promise<{ data: Invoice[] | null }> } };
        })
          .select("*")
          .in("engagement_id", engagementIds)
          .order("invoice_date", { ascending: false });
        for (const inv of engInvoices ?? []) {
          if (!invoiceMap.has(inv.id)) invoiceMap.set(inv.id, inv);
        }
      }

      const invoices: Invoice[] = Array.from(invoiceMap.values()).sort((a, b) => {
        const ad = a.invoice_date ?? "";
        const bd = b.invoice_date ?? "";
        return bd.localeCompare(ad);
      });

      return {
        ...data,
        interactions,
        invoices,
      } as unknown as SalesDeal;
    },
  });
}

export function useCreateSalesDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<SalesDeal>) => {
      const { company, contact, ...rest } = input as Record<string, unknown>;
      const { data, error } = await supabase.from("sales_deals").insert(rest as { title: string }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_deals"] }),
  });
}

export function useUpdateSalesDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<SalesDeal> & { id: string }) => {
      const { company, contact, ...rest } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("sales_deals")
        .update({ ...rest, updated_at: new Date().toISOString() } as { title?: string })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_deals"] }),
  });
}

export function useReorderSalesDeals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; stage: string; stage_order: number }[]) => {
      const now = new Date().toISOString();
      await Promise.all(
        updates.map(({ id, stage, stage_order }) =>
          supabase
            .from("sales_deals")
            .update({ stage, stage_order, updated_at: now } as Record<string, unknown>)
            .eq("id", id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_deals"] }),
  });
}

export function useDeleteSalesDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_deals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sales_deals"] }),
  });
}

export function useDeliveryEngagements() {
  return useQuery({
    queryKey: ["delivery_engagements"],
    queryFn: async (): Promise<DeliveryEngagement[]> => {
      const { data, error } = await supabase
        .from("delivery_engagements")
        .select("*, company:companies(id,name), contact:contacts(id,first_name,last_name)")
        .order("stage_order", { ascending: true });
      if (error) throw error;
      return data as unknown as DeliveryEngagement[];
    },
  });
}

export function useCreateDeliveryEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<DeliveryEngagement>) => {
      const { company, contact, sales_deal, invoices, ...rest } = input as Record<string, unknown>;
      const { data, error } = await supabase.from("delivery_engagements").insert(rest as { title: string }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery_engagements"] }),
  });
}

export function useReorderDeliveryEngagements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; stage: string; stage_order: number }[]) => {
      const now = new Date().toISOString();
      await Promise.all(
        updates.map(({ id, stage, stage_order }) =>
          supabase
            .from("delivery_engagements")
            .update({ stage, stage_order, updated_at: now } as Record<string, unknown>)
            .eq("id", id)
        )
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery_engagements"] }),
  });
}

export function useUpdateDeliveryEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DeliveryEngagement> & { id: string }) => {
      const { company, contact, sales_deal, invoices, ...rest } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("delivery_engagements")
        .update({ ...rest, updated_at: new Date().toISOString() } as { title?: string })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["delivery_engagements"] }),
  });
}
