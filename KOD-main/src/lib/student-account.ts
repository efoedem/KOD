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

export function normalizeIndexNumber(indexNumber: string): string {
  return indexNumber.trim().toUpperCase();
}

/**
 * Validates index numbers starting with UEB and having 10 or 11 total characters.
 * Example: UEB1234567 (10 chars) or UEB12345678 (11 chars).
 */
export function isValidIndexNumber(indexNumber: string): boolean {
  const normalized = normalizeIndexNumber(indexNumber);
  return /^UEB[0-9A-Z]{7,8}$/.test(normalized);
}

export function studentProfile(
  id: string,
  data: {
    fullName: string;
    indexNumber: string;
    email: string;
    phone: string;
    departmentId: string;
    programmeId: string;
    level: string;
    schoolId?: string | null;
    username?: string | null;
  }
) {
  const cleanIndex = normalizeIndexNumber(data.indexNumber);
  const cleanFullName = data.fullName.trim();
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanPhone = data.phone.trim();

  return {
    id,
    full_name: cleanFullName,
    // Satisfy legacy unique not-null username constraint using the unique index number
    username: data.username ?? cleanIndex.toLowerCase(),
    email: cleanEmail,
    phone: cleanPhone,
    index_number: cleanIndex,
    programme_id: data.programmeId,
    department_id: data.departmentId,
    school_id: data.schoolId ?? null,
    level: data.level,
  };
}

export function shelfSelection(
  profile:
    | {
        school_id?: string | null;
        department_id?: string | null;
        level?: string | null;
        programme_id?: string | null;
      }
    | null
    | undefined,
  overrides: {
    school?: string | null;
    department?: string | null;
    level?: string | null;
    programme?: string | null;
  }
) {
  return {
    schoolId: overrides.school ?? profile?.school_id ?? undefined,
    departmentId: overrides.department ?? profile?.department_id ?? undefined,
    level: overrides.level ?? profile?.level ?? undefined,
    programmeId: overrides.programme ?? profile?.programme_id ?? undefined,
  };
}
