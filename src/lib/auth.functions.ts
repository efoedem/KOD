import { createServerFn } from "@tanstack/react-start";
import {
  isValidIndexNumber,
  normalizeIndexNumber,
  normalizePhone,
  studentProfile,
} from "@/lib/student-account";
import { LEVELS } from "@/lib/format";

type SessionPayload = {
  access_token: string;
  refresh_token: string;
};

type AuthResult = { ok: true; session: SessionPayload } | { ok: false; error: string };

type SignUpInput = {
  fullName: string;
  indexNumber: string;
  departmentId: string;
  programmeId: string;
  level: string;
  email: string;
  phone: string;
  password: string;
};

type SignInInput = {
  identifier: string;
  password: string;
};

function clean(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validateSignUp(data: {
  fullName: string;
  indexNumber: string;
  departmentId: string;
  programmeId: string;
  level: string;
  email: string;
  phone: string;
  password: string;
}): string | null {
  const { fullName, indexNumber, departmentId, programmeId, level, email, phone, password } = data;

  if (!fullName || fullName.length < 2) {
    return "Please enter your full name.";
  }
  if (!isValidIndexNumber(indexNumber)) {
    return "Index number must start with UEB and be 10 or 11 characters in total (e.g. UEB12345678).";
  }
  if (!clean(departmentId)) {
    return "Please select your department.";
  }
  if (!clean(programmeId)) {
    return "Please select your programme.";
  }
  if (!clean(level) || !LEVELS.some((l) => l === level)) {
    return "Please select a valid level (e.g. 100, 200, 300, 400).";
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
    return "Please enter a valid email address.";
  }
  if (!/^\+\d{9,15}$/.test(phone)) {
    return "Please enter a valid phone number, e.g. 0551234567.";
  }
  if (password.length < 8 || password.length > 72) {
    return "Password must be at least 8 characters.";
  }

  return null;
}

export const signUpStudent = createServerFn({ method: "POST" })
  .validator((input: SignUpInput) => {
    const email = clean(input.email).toLowerCase();
    const phone = normalizePhone(clean(input.phone));
    const password = typeof input.password === "string" ? input.password : "";
    const indexNumber = normalizeIndexNumber(clean(input.indexNumber));

    return {
      fullName: clean(input.fullName).slice(0, 120),
      indexNumber,
      departmentId: clean(input.departmentId),
      programmeId: clean(input.programmeId),
      level: clean(input.level),
      email,
      phone,
      password,
    };
  })
  .handler(async ({ data }): Promise<AuthResult> => {
    const invalid = validateSignUp(data);
    if (invalid) return { ok: false, error: invalid };

    if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
      return {
        ok: false,
        error: "Account creation is not configured on this server. Please use the hosted BookMarket app.",
      };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Verify Department exists and retrieve its school_id
    const { data: department, error: departmentError } = await supabaseAdmin
      .from("departments")
      .select("id, school_id")
      .eq("id", data.departmentId)
      .maybeSingle();

    if (departmentError || !department) {
      return { ok: false, error: "Please select a valid department." };
    }

    // 2. Verify Programme exists under chosen Department
    const { data: programme, error: programmeError } = await supabaseAdmin
      .from("programmes")
      .select("id")
      .eq("id", data.programmeId)
      .eq("department_id", data.departmentId)
      .maybeSingle();

    if (programmeError || !programme) {
      return { ok: false, error: "Please select a valid programme for your department." };
    }

    // 3. Check duplicate phone or index number
    const { data: taken, error: takenError } = await supabaseAdmin
      .from("profiles")
      .select("phone, index_number")
      .or(`phone.eq.${data.phone},index_number.eq.${data.indexNumber}`)
      .limit(1);

    if (takenError) {
      console.error("signUpStudent lookup failed", takenError);
      return { ok: false, error: "We could not create your account. Please try again." };
    }
    const row = taken?.[0];
    if (row) {
      return {
        ok: false,
        error:
          row.index_number === data.indexNumber
            ? "That index number is already registered."
            : "That phone number is already registered.",
      };
    }

    // 4. Create auth user
    const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      phone_confirm: false,
      user_metadata: {
        full_name: data.fullName,
        index_number: data.indexNumber,
      },
    });

    if (createError || !created.user) {
      const message = createError?.message ?? "";
      console.error("signUpStudent createUser failed", createError);
      return {
        ok: false,
        error: /already|registered|exists/i.test(message)
          ? "An account already exists with that email address."
          : /weak|easy to guess|pwned/i.test(message)
            ? "That password is too easy to guess. Please choose a stronger one."
            : "We could not create your account. Please try again.",
      };
    }

    // 5. Insert Profile record
    const profileData = studentProfile(created.user.id, {
      fullName: data.fullName,
      indexNumber: data.indexNumber,
      email: data.email,
      phone: data.phone,
      departmentId: data.departmentId,
      programmeId: data.programmeId,
      level: data.level,
      schoolId: department.school_id,
    });

    const { error: profileError } = await supabaseAdmin.from("profiles").insert(profileData);

    if (profileError) {
      console.error("signUpStudent profile insert failed", profileError);
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return {
        ok: false,
        error: /index_number/.test(profileError.message)
          ? "That index number is already registered."
          : /phone/.test(profileError.message)
            ? "That phone number is already registered."
            : "We could not save your details. Please try again.",
      };
    }

    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: "student" });

    return signInWithEmail(data.email, data.password);
  });

export const signInStudent = createServerFn({ method: "POST" })
  .validator((input: SignInInput) => {
    const identifier = clean(input.identifier);
    const password = typeof input.password === "string" ? input.password : "";
    if (!identifier || !password) throw new Error("Please enter your details and password.");
    return { identifier, password };
  })
  .handler(async ({ data }): Promise<AuthResult> => {
    const identifier = data.identifier;
    let email = identifier.toLowerCase();

    if (!identifier.includes("@")) {
      if (!process.env["SUPABASE_URL"] || !process.env["SUPABASE_SERVICE_ROLE_KEY"]) {
        return {
          ok: false,
          error: "Index number and phone sign-in are not configured on this server. Try your registered email or use the hosted BookMarket app.",
        };
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      let profile: { email: string } | null = null;

      // 1. Try index number lookup first
      const indexResult = await supabaseAdmin
        .from("profiles")
        .select("email")
        .ilike("index_number", identifier)
        .maybeSingle();

      if (indexResult.error) {
        console.error("signInStudent index lookup failed", indexResult.error);
        return { ok: false, error: "Sign-in is temporarily unavailable. Please try your registered email or try again later." };
      }
      profile = indexResult.data;

      // 2. Try username lookup if not found
      if (!profile) {
        const userResult = await supabaseAdmin
          .from("profiles")
          .select("email")
          .ilike("username", identifier)
          .maybeSingle();

        if (userResult.data) {
          profile = userResult.data;
        }
      }

      // 3. Try phone lookup if still not found
      if (!profile && /^[+0-9()\s-]+$/.test(identifier)) {
        const phoneResult = await supabaseAdmin
          .from("profiles")
          .select("email")
          .eq("phone", normalizePhone(identifier))
          .maybeSingle();

        if (phoneResult.error) {
          console.error("signInStudent phone lookup failed", phoneResult.error);
          return { ok: false, error: "Sign-in is temporarily unavailable. Please try your registered email or try again later." };
        }
        profile = phoneResult.data;
      }

      if (!profile) {
        return { ok: false, error: "Those details did not match an account. Please check your index number, phone, username, or email." };
      }
      email = profile.email;
    }

    return signInWithEmail(email, data.password);
  });

async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false, error: "Sign-in is not configured on this server. Please use the hosted BookMarket app." };

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input as RequestInfo, { ...init, headers });
      },
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, error: "Those details did not match an account. Please check and try again." };
  }

  return {
    ok: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
  };
}
