import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Contact, ContactWithDetails, ContactCategory } from "@/types";

export function useContacts() {
  return useQuery({
    queryKey: ["contacts"],
    queryFn: async (): Promise<Contact[]> => {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select(`
          *,
          company:companies(id, name),
          contact_categories(category),
          contact_tags(tag:tags(id, name, color))
        `)
        .order("last_name", { ascending: true });

      if (error) throw error;

      return (contacts as unknown as Record<string, unknown>[]).map((c) => ({
        ...c,
        company: c.company ?? null,
        categories: ((c.contact_categories as { category: string }[] | null) ?? []).map((cc) => cc.category),
        tags: ((c.contact_tags as { tag: unknown }[] | null) ?? []).map((ct) => ct.tag),
      })) as unknown as Contact[];
    },
  });
}

export function useContact(id: string) {
  return useQuery({
    queryKey: ["contact", id],
    enabled: !!id,
    queryFn: async (): Promise<ContactWithDetails> => {
      const { data, error } = await supabase
        .from("contacts")
        .select(`
          *,
          company:companies(*),
          contact_categories(category),
          contact_tags(tag:tags(id, name, color)),
          interactions(*),
          agent_context_notes(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      const d = data as unknown as Record<string, unknown>;

      // document_links is polymorphic (no FK) — fetch separately
      const { data: docLinks } = await supabase
        .from("document_links")
        .select("*")
        .eq("linkable_type", "contact")
        .eq("linkable_id", id);

      const { data: salesDeals } = await supabase
        .from("sales_deals")
        .select("*, company:companies(id,name)")
        .eq("contact_id", id)
        .order("created_at", { ascending: false });

      const { data: deliveryEngagements } = await supabase
        .from("delivery_engagements")
        .select("*, company:companies(id,name)")
        .eq("contact_id", id)
        .order("created_at", { ascending: false });

      return {
        ...d,
        company: d.company ?? null,
        categories: ((d.contact_categories as { category: string }[] | null) ?? []).map((cc) => cc.category),
        tags: ((d.contact_tags as { tag: unknown }[] | null) ?? []).map((ct) => ct.tag),
        interactions: (d.interactions as unknown[] | null) ?? [],
        sales_deals: salesDeals ?? [],
        delivery_engagements: deliveryEngagements ?? [],
        document_links: docLinks ?? [],
        agent_context_notes: (d.agent_context_notes as unknown[] | null) ?? [],
      } as unknown as ContactWithDetails;
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Contact> & { categories?: ContactCategory[] }) => {
      const { categories, tags, company, ...rest } = input as Record<string, unknown>;
      const { data, error } = await supabase
        .from("contacts")
        .insert(rest as { first_name: string; last_name: string })
        .select()
        .single();
      if (error) throw error;

      if (categories && (categories as ContactCategory[]).length) {
        await supabase.from("contact_categories").insert(
          (categories as ContactCategory[]).map((cat) => ({ contact_id: (data as { id: string }).id, category: cat }))
        );
      }
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Contact> & { id: string }) => {
      const { categories, tags, company, ...rest } = updates as Record<string, unknown>;
      const { data, error } = await supabase
        .from("contacts")
        .update({ ...rest, updated_at: new Date().toISOString() } as { first_name?: string })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", vars.id] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contacts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useAddContactCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, category }: { contactId: string; category: ContactCategory }) => {
      const { error } = await supabase
        .from("contact_categories")
        .insert({ contact_id: contactId, category });
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["contact", vars.contactId] }),
  });
}

export function useRemoveContactCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ contactId, category }: { contactId: string; category: ContactCategory }) => {
      const { error } = await supabase
        .from("contact_categories")
        .delete()
        .eq("contact_id", contactId)
        .eq("category", category);
      if (error) throw error;
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ["contact", vars.contactId] }),
  });
}
