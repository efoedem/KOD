import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { saleItems, salesSummary } from "@/lib/admin-model";

type AdminContext = { supabase: SupabaseClient<Database>; userId: string };
async function assertAdmin(context: AdminContext, superOnly = false) {
  const { data: roles, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
  const isSuper = roles?.some(r => r.role === "super_admin") ?? false;
  if (error || (!isSuper && (superOnly || !roles?.some(r => r.role === "admin")))) throw new Error("You do not have access to this admin action.");
  return isSuper;
}

export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const isSuper = await assertAdmin(context);
    const db = context.supabase;
    const [schools, departments, books, orders] = await Promise.all([
      db.from("schools").select("id, name, code").order("name"),
      db.from("departments").select("id, name, school_id").order("name"),
      (isSuper
        ? db.from("books").select("*")
        : db.from("books").select("*").eq("uploaded_by", context.userId)
      ).order("title"),
      db.rpc("admin_sales"),
    ]);

    for (const result of [schools, departments, books, orders]) {
      if (result.error) throw new Error("Could not load admin records. Please try again.");
    }

    // Map sales to include level, username, and full profile details for exports
    const sales = (orders.data ?? []).map((o) => ({
      ...o,
      total: Number(o.total),
      level: o.level ?? o.buyer_level ?? null, // Ensures level is present for CSV/Excel exports
      username: o.username ?? null,
      items: saleItems(o.items),
    }));

    const admins: {
      id: string;
      name: string;
      email: string;
      phone: string;
      schoolId: string | null;
      departmentId: string | null;
      bookCount: number;
      totalOrders: number;
      paidOrders: number;
      amountPaid: number;
      pending: boolean;
    }[] = [];

    if (isSuper) {
      const [roles, profiles, invitations] = await Promise.all([
        db.from("user_roles").select("user_id, role"),
        db.from("profiles").select("*"),
        db.from("admin_invitations").select("*").order("created_at", { ascending: false }),
      ]);

      for (const result of [roles, profiles, invitations]) {
        if (result.error) throw new Error("Could not load admin profiles.");
      }

      const ids = new Set(
        (roles.data ?? []).filter((r) => r.role === "admin").map((r) => r.user_id),
      );
      ids.delete(context.userId);

      for (const id of ids) {
        const profile = profiles.data?.find((p) => p.id === id);
        const invitation = invitations.data?.find((i) => i.accepted_by === id);
        const ownSales = sales
          .filter((o) => o.items.some((i) => i.seller_id === id))
          .map((o) => ({
            ...o,
            total: o.items
              .filter((i) => i.seller_id === id)
              .reduce((n, i) => n + i.unit_price * i.quantity, 0),
          }));

        admins.push({
          id,
          name: profile?.full_name || invitation?.full_name || profile?.username || "—",
          email: profile?.email || invitation?.email || "—",
          phone: profile?.phone || invitation?.phone || "—",
          schoolId: profile?.school_id ?? invitation?.school_id ?? null,
          departmentId: profile?.department_id ?? invitation?.department_id ?? null,
          bookCount: books.data?.filter((b) => b.uploaded_by === id).length ?? 0,
          ...salesSummary(ownSales),
          pending: false,
        });
      }

      for (const i of invitations.data ?? []) {
        if (!i.accepted_by) {
          admins.push({
            id: i.id,
            name: i.full_name || "—",
            email: i.email,
            phone: i.phone || "—",
            schoolId: i.school_id,
            departmentId: i.department_id,
            bookCount: 0,
            totalOrders: 0,
            paidOrders: 0,
            amountPaid: 0,
            pending: true,
          });
        }
      }
    }

    return {
      isSuper,
      schools: schools.data ?? [],
      departments: departments.data ?? [],
      books: books.data ?? [],
      orders: sales,
      admins,
      summary: salesSummary(sales),
    };
  });

export const addAdmin = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; name?: string; phone?: string; schoolId?: string; departmentId?: string }) => input)
  .handler(async ({data,context}) => {
    await assertAdmin(context,true);
    const { data: status, error } = await context.supabase.rpc("add_book_admin",{_email:data.email.trim().toLowerCase(),...(data.name ? {_name:data.name}:{}),...(data.phone ? {_phone:data.phone}:{}),...(data.schoolId ? {_school:data.schoolId}:{}),...(data.departmentId ? {_department:data.departmentId}:{})});
    if(error) throw new Error("Could not add admin. Check the email and school details.");
    return {status};
  });

export const saveSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; name: string; code?: string }) => {
    const name = String(input.name ?? "").trim();
    if (name.length < 2) throw new Error("Enter the school name.");
    return { id: input.id, name, code: String(input.code ?? "").trim().toUpperCase() || null };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context, true);
    const supabaseAdmin = context.supabase;
    const payload = { name: data.name, code: data.code };
    const { error } = data.id
      ? await supabaseAdmin.from("schools").update(payload).eq("id", data.id)
      : await supabaseAdmin.from("schools").insert(payload);
    if (error) throw new Error("Could not save that school. The name may already exist.");
    return { ok: true };
  });

export const saveDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id?: string; name: string; schoolId: string }) => {
    const name = String(input.name ?? "").trim();
    const schoolId = String(input.schoolId ?? "").trim();
    if (name.length < 2) throw new Error("Enter the department name.");
    if (!schoolId) throw new Error("Choose the school this department belongs to.");
    return { id: input.id, name, schoolId };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context, true);
    const supabaseAdmin = context.supabase;
    const payload = { name: data.name, school_id: data.schoolId };
    const { error } = data.id
      ? await supabaseAdmin.from("departments").update(payload).eq("id", data.id)
      : await supabaseAdmin.from("departments").insert(payload);
    if (error) throw new Error("Could not save that department.");
    return { ok: true };
  });

export const saveBook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      id?: string | undefined;
      title: string;
      author: string;
      departmentId: string;
      level: string;
      price: number;
      stock: number;
      courseCode?: string;
      edition?: string;
      description?: string;
      coverUrl?: string;
      isActive?: boolean;
    }) => {
      const title = String(input.title ?? "").trim();
      const author = String(input.author ?? "").trim();
      const departmentId = String(input.departmentId ?? "").trim();
      const level = String(input.level ?? "").trim();
      const price = Number(input.price);
      if (title.length < 2) throw new Error("Enter the book title.");
      if (author.length < 2) throw new Error("Enter the author.");
      if (!departmentId) throw new Error("Choose a department.");
      if (!level) throw new Error("Choose a level.");
      if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid price.");
      return {
        id: input.id,
        title,
        author,
        departmentId,
        level,
        price,
        stock: Math.max(Math.trunc(Number(input.stock) || 0), 0),
        courseCode: String(input.courseCode ?? "").trim() || null,
        edition: String(input.edition ?? "").trim() || null,
        description: String(input.description ?? "").trim() || null,
        coverUrl: String(input.coverUrl ?? "").trim() || null,
        isActive: input.isActive !== false,
      };
    },
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const supabaseAdmin = context.supabase;
    const payload = {
      ...(!data.id ? { uploaded_by: context.userId } : {}),
      title: data.title,
      author: data.author,
      department_id: data.departmentId,
      level: data.level,
      price: data.price,
      stock: data.stock,
      course_code: data.courseCode,
      edition: data.edition,
      description: data.description,
      cover_url: data.coverUrl,
      is_active: data.isActive,
    };
    const { error } = data.id
      ? await supabaseAdmin.from("books").update(payload).eq("id", data.id).select("id").single()
      : await supabaseAdmin.from("books").insert(payload).select("id").single();
    if (error) {
      console.error("saveBook failed", error);
      throw new Error("Could not save that book.");
    }
    return { ok: true };
  });

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { table: "schools" | "departments" | "books"; id: string }) => {
    if (!["schools", "departments", "books"].includes(input.table)) throw new Error("Unknown record.");
    const id = String(input.id ?? "").trim();
    if (!id) throw new Error("Missing record.");
    return { table: input.table, id };
  })
  .handler(async ({ data, context }) => {
    await assertAdmin(context, data.table !== "books");
    const supabaseAdmin = context.supabase;
    const { error } = await supabaseAdmin.from(data.table).delete().eq("id", data.id).select("id").single();
    if (error) throw new Error("Could not remove that record. It may still be in use.");
    return { ok: true };
  });
