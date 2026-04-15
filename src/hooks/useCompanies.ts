import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Company } from "@/types";

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async (): Promise<Company[]> => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          company_tags(tag:tags(id, name, color)),
          contacts(count)
        `)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data as unknown as Record<string, unknown>[]).map((c) => ({
        ...c,
        tags: ((c.company_tags as { tag: unknown }[] | null) ?? []).map((ct) => ct.tag),
        contact_count: ((c.contacts as { count: number }[] | null) ?? [])[0]?.count ?? 0,
      })) as unknown as Company[];
    },
  });
}

export function useCompany(id: string) {
  return useQuery({
    queryKey: ["company", id],
    enabled: !!id,
    queryFn: async (): Promise<Company & {
      contacts: unknown[];
      interactions: unknown[];
      document_links: unknown[];
      sales_deals: unknown[];
      delivery_engagements: unknown[];
      invoices: unknown[];
      tags: unknown[];
    }> => {
      const { data, error } = await supabase
        .from("companies")
        .select(`
          *,
          company_tags(tag:tags(id, name, color)),
          contacts(id, first_name, last_name, title, email, phone, last_contacted_at, last_contact_type, contact_categories(category)),
          interactions(*)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;

      const d = data as unknown as Record<string, unknown>;

      // document_links is polymorphic (no FK) — fetch separately
      const { data: docLinks } = await supabase
        .from("document_links")
        .select("*")
        .eq("linkable_type", "company")
        .eq("linkable_id", id);

      const { data: salesDeals } = await supabase
        .from("sales_deals")
        .select("*, contact:contacts(id,first_name,last_name)")
        .eq("company_id", id)
        .order("created_at", { ascending: false });

      const { data: engagements } = await supabase
        .from("delivery_engagements")
        .select("*, contact:contacts(id,first_name,last_name)")
        .eq("company_id", id)
        .order("created_at", { ascending: false });

      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("company_id", id)
        .order("invoice_date", { ascending: false });

      const result = {
        ...d,
        tags: ((d.company_tags as { tag: unknown }[] | null) ?? []).map((ct) => ct.tag),
        contacts: ((d.contacts as Record<string, unknown>[] | null) ?? []).map((c) => ({
          ...c,
          categories: ((c.contact_categories as { category: string }[] | null) ?? []).map((cc) => cc.category),
        })),
        interactions: (d.interactions as unknown[] | null) ?? [],
        document_links: docLinks ?? [],
        sales_deals: salesDeals ?? [],
        delivery_engagements: engagements ?? [],
        invoices: invoices ?? [],
      };

      return result as unknown as Company & {
        contacts: unknown[];
        interactions: unknown[];
        document_links: unknown[];
        sales_deals: unknown[];
        delivery_engagements: unknown[];
        invoices: unknown[];
        tags: unknown[];
      };
    },
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Company>) => {
      const { tags, contact_count, ...rest } = input as Record<string, unknown>;
      const { data, error } = await supabase.from("companies").insert(rest as { name: string }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { tags, contact_count, ...rest } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("companies")
        .update({ ...rest, updated_at: new Date().toISOString() } as { name?: string })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["companies"] });
      qc.invalidateQueries({ queryKey: ["company", vars.id] });
    },
  });
}

export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
