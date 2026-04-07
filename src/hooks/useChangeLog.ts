import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export interface ChangeLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  changed_by: string | null;
  changes: Record<string, { old: string; new: string }> | null;
  summary: string | null;
  created_at: string;
}

export function useChangeLog(options?: {
  tableName?: string;
  recordId?: string;
  limit?: number;
}) {
  const { tableName, recordId, limit = 50 } = options ?? {};

  return useQuery({
    queryKey: ["change_log", { tableName, recordId, limit }],
    queryFn: async (): Promise<ChangeLogEntry[]> => {
      let q = supabase
        .from("change_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tableName) q = q.eq("table_name", tableName);
      if (recordId) q = q.eq("record_id", recordId);

      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as ChangeLogEntry[];
    },
  });
}
