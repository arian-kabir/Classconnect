import { describe, it, expect } from "vitest";
import { parseRawRows, computeSourceRowHash } from "./parser";

describe("parseRawRows", () => {
  it("parses rows without header", () => {
    const rows = [
      ["CSE471", "01", "R101", "Mon", "09:00-10:30", "ABC"],
      ["CSE471", "02", "R102", "Tue", "11:00-12:30", "DEF"],
    ];
    const result = parseRawRows(rows);
    expect(result.rows).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
    expect(result.rows[0].courseCode).toBe("CSE471");
    expect(result.rows[0].day).toBe(2);
    expect(result.rows[0].startTime).toBe("09:00");
    expect(result.rows[0].endTime).toBe("10:30");
  });

  it("skips header row", () => {
    const rows = [
      ["Course", "Sec", "Room", "Day", "Time", "Teacher"],
      ["CSE471", "01", "R101", "Mon", "09:00-10:30", "ABC"],
    ];
    const result = parseRawRows(rows);
    expect(result.rows).toHaveLength(1);
  });

  it("rejects bad timeslot", () => {
    const rows = [["CSE471", "01", "R101", "Mon", "bad-time", "ABC"]];
    const result = parseRawRows(rows);
    expect(result.rows).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
  });

  it("rejects unknown day", () => {
    const rows = [["CSE471", "01", "R101", "Funday", "09:00-10:30", "ABC"]];
    const result = parseRawRows(rows);
    expect(result.rows).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
  });

  it("uppercases teacher initials", () => {
    const rows = [["CSE471", "01", "R101", "Mon", "09:00-10:30", "abc"]];
    const result = parseRawRows(rows);
    expect(result.rows[0].teacherInitials).toBe("ABC");
  });
});

describe("computeSourceRowHash", () => {
  it("produces stable hash", () => {
    const row = {
      courseCode: "CSE471",
      sectionNo: "01",
      roomNumber: "R101",
      day: 2 as const,
      startTime: "09:00",
      endTime: "10:30",
      teacherInitials: "ABC",
    };
    const a = computeSourceRowHash(row);
    const b = computeSourceRowHash(row);
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });
});
