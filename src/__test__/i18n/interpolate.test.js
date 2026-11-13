/* eslint-env jest */
import { interpolate } from "../../i18n/interpolate";

describe("interpolate", () => {
  it("replaces positional string placeholders", () => {
    expect(interpolate("Hello %1$s, meet %2$s", "Anna", "Budi")).toBe(
      "Hello Anna, meet Budi"
    );
  });

  it("replaces positional placeholders used out of order", () => {
    expect(interpolate("%2$s then %1$s", "first", "second")).toBe(
      "second then first"
    );
  });

  it("replaces repeated positional placeholders", () => {
    expect(interpolate("%1$s and %1$s again", "same")).toBe(
      "same and same again"
    );
  });

  it("replaces numeric positional placeholders (%1$d)", () => {
    expect(
      interpolate("Maximum salary should be not greater than %1$d HKD.", 25000)
    ).toBe("Maximum salary should be not greater than 25000 HKD.");
  });

  it("replaces bare %s placeholders sequentially", () => {
    expect(interpolate("%s of %s", 3, 10)).toBe("3 of 10");
  });

  it("renders %% as a literal percent sign", () => {
    expect(interpolate("100%% sure")).toBe("100% sure");
  });

  it("renders missing arguments as empty string, never 'undefined'", () => {
    const result = interpolate("Hello %1$s and %2$s", "Anna");
    expect(result).toBe("Hello Anna and ");
    expect(result).not.toContain("undefined");
  });

  it("returns strings without placeholders unchanged", () => {
    expect(interpolate("Date of Birth")).toBe("Date of Birth");
  });

  it("keeps a lone % that is not a placeholder", () => {
    expect(interpolate("50% off")).toBe("50% off");
  });

  it("never throws on null/undefined templates", () => {
    expect(interpolate(null)).toBe("");
    expect(interpolate(undefined)).toBe("");
  });

  it("stringifies non-string arguments", () => {
    expect(interpolate("%1$s", 0)).toBe("0");
    expect(interpolate("%1$s", false)).toBe("false");
  });
});
