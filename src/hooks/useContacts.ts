import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

      return contacts.map((c: any) => ({
        ...c,
        company: c.company ?? null,
        categories: c.contact_categories?.map((cc: any) => cc.category) ?? [],
        tags: c.contact_tags?.map((ct: any) => ct.tag) ?? [],
      }));
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
          interactions(* , order:occurred_at.desc),
          agent_context_notes(*),
          document_links(*)
        `)
        .eq("id", id)
        .single();

      if (error) throw error;

      // Fetch deals separately
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
        ...data,
        company: data.company ?? null,
        categories: data.contact_categories?.map((cc: any) => cc.category) ?? [],
        tags: data.contact_tags?.map((ct: any) => ct.tag) ?? [],
        interactions: data.interactions ?? [],
        sales_deals: salesDeals ?? [],
        delivery_engagements: deliveryEngagements ?? [],
        document_links: data.document_links ?? [],
        agent_context_notes: data.agent_context_notes ?? [],
      };
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Contact> & { categories?: ContactCategory[] }) => {
      const { categories, tags, company, ...rest } = input as any;
      const { data, error } = await supabase
        .from("contacts")
        .insert(rest)
        .select()
        .single();
      if (error) throw error;

      if (categories?.length) {
        await supabase.from("contact_categories").insert(
          categories.map((cat: ContactCategory) => ({ contact_id: data.id, category: cat }))
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
      const { categories, tags, company, ...rest } = updates as any;
      const { data, error } = await supabase
        .from("contacts")
        .update({ ...rest, updated_at: new Date().toISOString() })
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
