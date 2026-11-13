/* eslint-env jest */
import {
  changeDateFormate,
  changeDynamicDateFormate,
  validateEmail,
  getOrdinalSuffix,
} from "../../utils/utils";

describe("changeDateFormate", () => {
  it("formats a valid date string as MM/DD/YYYY", () => {
    expect(changeDateFormate("2024-06-15")).toBe("06/15/2024");
  });

  /* 22 Jan 2026 ("minor fixes"): an empty date formats to "" — callers print their own dash */
  it('returns "" when the date is null', () => {
    expect(changeDateFormate(null)).toBe("");
  });

  it('returns "" when the date is undefined', () => {
    expect(changeDateFormate(undefined)).toBe("");
  });
});

describe("changeDynamicDateFormate", () => {
  it("formats a date with a custom format string", () => {
    expect(changeDynamicDateFormate("2024-01-05", "YYYY/MM/DD")).toBe(
      "2024/01/05"
    );
  });

  it('returns "" for a falsy date value', () => {
    expect(changeDynamicDateFormate("", "YYYY/MM/DD")).toBe("");
  });
});

describe("validateEmail", () => {
  it("returns true for a valid email address", () => {
    expect(validateEmail("user@example.com")).toBe(true);
  });

  it("returns false for an email without a domain", () => {
    expect(validateEmail("userexample.com")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(validateEmail("")).toBe(false);
  });

  it("returns false for an email with spaces", () => {
    expect(validateEmail("user @example.com")).toBe(false);
  });
});

describe("getOrdinalSuffix", () => {
  it('returns "1st" for 1', () => {
    expect(getOrdinalSuffix(1)).toBe("1st");
  });

  it('returns "2nd" for 2', () => {
    expect(getOrdinalSuffix(2)).toBe("2nd");
  });

  it('returns "3rd" for 3', () => {
    expect(getOrdinalSuffix(3)).toBe("3rd");
  });

  it('returns "4th" for 4', () => {
    expect(getOrdinalSuffix(4)).toBe("4th");
  });

  it('returns "11th" for 11', () => {
    expect(getOrdinalSuffix(11)).toBe("11th");
  });

  it('returns "21st" for 21', () => {
    expect(getOrdinalSuffix(21)).toBe("21st");
  });
});
