import { describe, expect, it } from "vitest";
import { normalizePhone, shelfSelection, studentProfile, usernameLookup } from "@/lib/student-account";

describe("Student account rules", () => {
  it("stores exactly the school, department and Level 300 selected at signup", () => {
    const row = studentProfile("student-a", {
      username: "hlodze", email: "student@example.com", phone: "+233551234567", fullName: null,
      schoolId: "chosen-school", departmentId: "chosen-department", level: "300",
    });
    expect(row).toMatchObject({ id: "student-a", school_id: "chosen-school", department_id: "chosen-department", level: "300" });
  });
  it("uses each student's saved study selections without a Level 200 default", () => {
    expect(shelfSelection({ school_id: "school-b", department_id: "department-b", level: "400" }, {
      school: null, department: null, level: null,
    })).toEqual({ schoolId: "school-b", departmentId: "department-b", level: "400" });
    expect(shelfSelection(null, { school: null, department: null, level: null }).level).toBeUndefined();
  });
  it("does not reuse the saved department when a different school is selected", () => {
    expect(shelfSelection({ school_id: "old-school", department_id: "old-department", level: "300" }, {
      school: "new-school", department: "", level: null,
    })).toEqual({ schoolId: "new-school", departmentId: "", level: "300" });
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