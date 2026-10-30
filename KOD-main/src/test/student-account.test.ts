import { describe, expect, it } from "vitest";
import {
  isValidIndexNumber,
  normalizeIndexNumber,
  normalizePhone,
  shelfSelection,
  studentProfile,
  usernameLookup,
} from "@/lib/student-account";

describe("Student account rules", () => {
  it("validates index numbers starting with UEB with 10 or 11 total characters", () => {
    // Exactly 10 characters (UEB + 7 chars)
    expect(isValidIndexNumber("UEB1234567")).toBe(true);
    expect(isValidIndexNumber("ueb1234567")).toBe(true);

    // Exactly 11 characters (UEB + 8 chars)
    expect(isValidIndexNumber("UEB12345678")).toBe(true);
    expect(isValidIndexNumber("ueb12345678")).toBe(true);

    // Invalid lengths or prefixes
    expect(isValidIndexNumber("UEB123456")).toBe(false); // 9 chars (too short)
    expect(isValidIndexNumber("UEB123456789")).toBe(false); // 12 chars (too long)
    expect(isValidIndexNumber("1234567890")).toBe(false); // Missing UEB
    expect(isValidIndexNumber("KNUST12345")).toBe(false); // Wrong prefix
  });

  it("normalizes index numbers to uppercase and trimmed", () => {
    expect(normalizeIndexNumber("  ueb2024101  ")).toBe("UEB2024101");
  });

  it("stores full name, index number, department, programme and level", () => {
    const row = studentProfile("student-a", {
      fullName: "Ama Mensah",
      indexNumber: "UEB12345678",
      email: "ama@example.com",
      phone: "+233551234567",
      departmentId: "dept-electrical",
      programmeId: "prog-computer-eng",
      level: "300",
      schoolId: "uenr-school",
    });

    expect(row).toMatchObject({
      id: "student-a",
      full_name: "Ama Mensah",
      index_number: "UEB12345678",
      username: "ueb12345678",
      email: "ama@example.com",
      phone: "+233551234567",
      department_id: "dept-electrical",
      programme_id: "prog-computer-eng",
      school_id: "uenr-school",
      level: "300",
    });
  });

  it("uses each student's saved study selections without a Level 200 default", () => {
    expect(
      shelfSelection(
        { school_id: "school-b", department_id: "department-b", level: "400", programme_id: "prog-1" },
        { school: null, department: null, level: null, programme: null }
      )
    ).toEqual({
      schoolId: "school-b",
      departmentId: "department-b",
      level: "400",
      programmeId: "prog-1",
    });
    expect(shelfSelection(null, { school: null, department: null, level: null, programme: null }).level).toBeUndefined();
  });

  it("accepts uppercase returning usernames, including numeric usernames", () => {
    expect(usernameLookup(" HLODZE ")).toBe("hlodze");
    expect(usernameLookup("12345")).toBe("12345");
    expect(usernameLookup("ama_student")).toBe("ama\\_student");
  });

  it("matches the signup phone when signing in with local or international formatting", () => {
    expect(normalizePhone("0551234567")).toBe("+233551234567");
    expect(normalizePhone("+233 55 123 4567")).toBe("+233551234567");
    expect(normalizePhone("00233551234567")).toBe("+233551234567");
  });
});
