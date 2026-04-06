import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { SalesDeal, DeliveryEngagement } from "@/types";

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
