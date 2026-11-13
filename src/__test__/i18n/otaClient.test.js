/* eslint-env jest */
import {
  compareVersions,
  fetchBundle,
  fetchManifest,
  isValidBundle,
  isValidManifest,
  loadCachedBundle,
  resolveKey,
  saveCachedBundle,
} from "../../i18n/otaClient";
import { STORAGE_KEYS } from "../../i18n/config";

let warn;
beforeEach(() => {
  warn = jest.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  warn.mockRestore();
});

describe("compareVersions", () => {
  it("compares plain numeric versions", () => {
    expect(compareVersions(10, 9)).toBe(1);
    expect(compareVersions(9, 10)).toBe(-1);
    expect(compareVersions(9, 9)).toBe(0);
  });

  it("compares numeric strings numerically, not lexically", () => {
    expect(compareVersions("10", "9")).toBe(1);
  });

  it("compares dotted versions segment by segment", () => {
    expect(compareVersions("1.2.10", "1.2.9")).toBe(1);
    expect(compareVersions("1.10", "1.9.5")).toBe(1);
    expect(compareVersions("2.0", "2.0.0")).toBe(0);
  });

  it("treats garbage as version 0 without throwing", () => {
    expect(compareVersions(undefined, 1)).toBe(-1);
    expect(compareVersions("abc", 0)).toBe(0);
    expect(compareVersions(null, null)).toBe(0);
  });
});

describe("resolveKey (fallback chain order)", () => {
  const otaCurrent = { greeting: "OTA current", only_current: "current" };
  const otaEn = { greeting: "OTA en", only_en: "en" };
  const snapCurrent = { greeting: "SNAP current", only_snap: "snap" };
  const snapEn = { greeting: "SNAP en", only_snap_en: "snap en" };
  const chain = [otaCurrent, otaEn, snapCurrent, snapEn];

  it("prefers the OTA bundle for the current language", () => {
    expect(resolveKey("greeting", chain)).toBe("OTA current");
  });

  it("falls through OTA en, snapshot current, snapshot en in order", () => {
    expect(resolveKey("only_en", chain)).toBe("en");
    expect(resolveKey("only_snap", chain)).toBe("snap");
    expect(resolveKey("only_snap_en", chain)).toBe("snap en");
  });

  it("returns the key itself when nothing matches", () => {
    expect(resolveKey("missing_everywhere", chain)).toBe("missing_everywhere");
  });

  it("skips null maps and non-string values without throwing", () => {
    expect(resolveKey("greeting", [null, undefined, { greeting: 42 }, otaEn])).toBe(
      "OTA en"
    );
  });

  it("returns empty string for null/undefined keys", () => {
    expect(resolveKey(null, chain)).toBe("");
    expect(resolveKey(undefined, chain)).toBe("");
  });
});

describe("bundle cache (corrupted-cache recovery)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a valid bundle", () => {
    const bundle = { version: 9, language: "en", strings: { a: "b" } };
    saveCachedBundle("en", bundle);
    expect(loadCachedBundle("en")).toEqual(bundle);
  });

  it("drops corrupted JSON and clears the cache entry", () => {
    localStorage.setItem(STORAGE_KEYS.bundle("en"), "{not valid json");
    expect(loadCachedBundle("en")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.bundle("en"))).toBeNull();
  });

  it("drops cached data with the wrong shape", () => {
    localStorage.setItem(
      STORAGE_KEYS.bundle("en"),
      JSON.stringify({ version: 9 }) // no "strings"
    );
    expect(loadCachedBundle("en")).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.bundle("en"))).toBeNull();
  });

  it("returns null when nothing is cached", () => {
    expect(loadCachedBundle("id")).toBeNull();
  });
});

describe("validators", () => {
  it("accepts the published bundle shape", () => {
    expect(isValidBundle({ strings: { k: "v" } })).toBe(true);
  });

  it("rejects non-bundle shapes", () => {
    expect(isValidBundle(null)).toBe(false);
    expect(isValidBundle([])).toBe(false);
    expect(isValidBundle({ strings: [] })).toBe(false);
    expect(isValidBundle({ strings: "nope" })).toBe(false);
  });

  it("accepts the published manifest shape", () => {
    expect(
      isValidManifest({ version: 9, languages: { en: { url: "http://x" } } })
    ).toBe(true);
    expect(isValidManifest({ version: 9 })).toBe(false);
  });
});

describe("fetchManifest / fetchBundle failure handling", () => {
  afterEach(() => {
    delete global.fetch;
  });

  it("returns null on non-200 responses (silently, warn only)", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
    expect(await fetchManifest()).toBeNull();
    expect(await fetchBundle("http://x")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("returns null on malformed JSON", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new Error("bad json")),
    });
    expect(await fetchManifest()).toBeNull();
  });

  it("returns null on network errors", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("offline"));
    expect(await fetchManifest()).toBeNull();
    expect(await fetchBundle("http://x")).toBeNull();
  });

  it("returns null when the payload shape is wrong", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ unexpected: true }),
    });
    expect(await fetchManifest()).toBeNull();
    expect(await fetchBundle("http://x")).toBeNull();
  });

  it("requests with cache: no-store", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ version: 9, languages: {} }),
    });
    await fetchManifest();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ cache: "no-store" })
    );
  });
});
