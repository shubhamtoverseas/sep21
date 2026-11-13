/* eslint-env jest */
import { normalizeLineBreaks, renderLineBreaks } from "../../i18n/text";

describe("normalizeLineBreaks", () => {
  it("converts literal \\n sequences to real newlines", () => {
    expect(normalizeLineBreaks("line one\\nline two")).toBe(
      "line one\nline two"
    );
  });

  it("converts <br> tags in any casing/form to newlines", () => {
    expect(normalizeLineBreaks("a<br>b<br/>c<br />d<BR>e")).toBe(
      "a\nb\nc\nd\ne"
    );
  });

  it("keeps real newlines as-is", () => {
    expect(normalizeLineBreaks("a\nb")).toBe("a\nb");
  });

  it("never throws on null/undefined", () => {
    expect(normalizeLineBreaks(null)).toBe("");
    expect(normalizeLineBreaks(undefined)).toBe("");
  });
});

describe("renderLineBreaks", () => {
  it("returns the plain string when there are no breaks", () => {
    expect(renderLineBreaks("no breaks")).toBe("no breaks");
  });

  it("splits into text nodes separated by <br /> elements", () => {
    const nodes = renderLineBreaks("one\\ntwo<br>three");
    expect(Array.isArray(nodes)).toBe(true);
    expect(nodes).toHaveLength(5);
    expect(nodes[0]).toBe("one");
    expect(nodes[1].type).toBe("br");
    expect(nodes[2]).toBe("two");
    expect(nodes[3].type).toBe("br");
    expect(nodes[4]).toBe("three");
  });

  it("does not use dangerouslySetInnerHTML (text stays text)", () => {
    const nodes = renderLineBreaks("<b>bold</b>\\nnext");
    expect(nodes[0]).toBe("<b>bold</b>");
  });
});
