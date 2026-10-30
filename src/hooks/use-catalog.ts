import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useSchools() {
  return useQuery({
    queryKey: ["schools"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id, name, code").order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useDepartments(schoolId?: string) {
  return useQuery({
    queryKey: ["departments", schoolId ?? "all"],
    queryFn: async () => {
      let query = supabase.from("departments").select("id, name, school_id").order("name");
      if (schoolId) {
        query = query.eq("school_id", schoolId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useProgrammes(departmentId?: string) {
  return useQuery({
    queryKey: ["programmes", departmentId ?? "none"],
    enabled: Boolean(departmentId),
    queryFn: async () => {
      if (!departmentId) return [];
      const { data, error } = await supabase
        .from("programmes")
        .select("id, name, department_id, code")
        .eq("department_id", departmentId)
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["profile", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, email, phone, full_name, level, school_id, department_id, programme_id, index_number")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useBooks(departmentId: string | undefined, level: string | undefined) {
  return useQuery({
    queryKey: ["books", departmentId, level],
    enabled: Boolean(departmentId && level),
    queryFn: async () => {
      if (!departmentId || !level) return [];
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, isbn, course_code, edition, description, price, stock, cover_url, level")
        .eq("department_id", departmentId)
        .eq("level", level)
        .eq("is_active", true)
        .order("title");
      if (error) throw error;
      return data;
    },
  });
}

export function useFeaturedBooks() {
  return useQuery({
    queryKey: ["featured-books"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("books")
        .select("id, title, author, price, level, course_code")
        .eq("is_active", true)
        .order("created_at")
        .limit(8);
      if (error) throw error;
      return data;
    },
  });
}

export function useIsAdmin(userId: string | undefined) {
  return useQuery({
    queryKey: ["is-admin", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      if (!userId) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .in("role", ["admin", "super_admin"]);
      if (error) throw error;
      return Boolean(data?.length);
    },
  });
}
