export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

export function usernameLookup(identifier: string): string | null {
  const username = identifier.trim().toLowerCase();
  if (!/^[a-z0-9_.]{3,30}$/.test(username)) return null;
  // Escape LIKE wildcards: underscores are literal username characters.
  return username.replace(/_/g, "\\_");
}

export function studentProfile(id: string, data: {
  username: string; email: string; phone: string; fullName: string | null;
  schoolId: string; departmentId: string; level: string;
}) {
  return {
    id, username: data.username, email: data.email, phone: data.phone,
    full_name: data.fullName, school_id: data.schoolId,
    department_id: data.departmentId, level: data.level,
  };
}

export function shelfSelection(profile: {
  school_id: string | null; department_id: string | null; level: string | null;
} | null | undefined, overrides: {
  school: string | null; department: string | null; level: string | null;
}) {
  return {
    schoolId: overrides.school ?? profile?.school_id ?? undefined,
    departmentId: overrides.department ?? profile?.department_id ?? undefined,
    level: overrides.level ?? profile?.level ?? undefined,
  };
}