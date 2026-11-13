/* eslint-env jest */
import fs from "fs";
import path from "path";
import en from "../../i18n/fallback/en.json";
import zhHK from "../../i18n/fallback/zh-HK.json";
import baseline from "../settings/i18nOrphanBaseline.json";

const ROOT = path.resolve(__dirname, "../../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const ADMIN = JSON.parse(read("public/locales/en/translation.json"));

/* 3 Nov (CH 497): the fallback snapshot backs only the OTA t() chain and is maintained by hand between publishes, as a
   subset of the admin locale (the i18next source). The live staging publish (v1, 14 Sep) predates the code, so the
   snapshot is not regenerated from it; parity with the admin locale is the rule instead. */
describe("i18n fallback parity with the admin locale", () => {
    test("every en fallback key is in the admin locale with the same English", () => {
        const keys = Object.keys(en.strings);
        expect(keys.length).toBeGreaterThan(3000);
        expect(keys.filter((k) => !(k in ADMIN))).toEqual([]);
        expect(keys.filter((k) => en.strings[k] !== ADMIN[k])).toEqual([]);
    });
    test("every zh-HK fallback key is in the admin locale", () => {
        expect(Object.keys(zhHK.strings).filter((k) => !(k in ADMIN))).toEqual([]);
    });
    test("the orphan baseline holds nothing for the two fallback copies", () => {
        expect(baseline["src/i18n/fallback/en.json"]).toEqual([]);
        expect(baseline["src/i18n/fallback/zh-HK.json"]).toEqual([]);
    });
    test("the snapshot script defaults to the app's manifest and refuses a publish older than the snapshot", () => {
        const script = read("scripts/i18n-snapshot.js");
        const config = read("src/i18n/config.js");
        const manifest = config.match(/'(https:[^']+manifest\.json)'/)[1];
        expect(script).toContain(`'${ manifest }'`);
        expect(script).toMatch(/missingFromPublish\(lang, bundle\.strings\)/);
        expect(script).toMatch(/--force/);
    });
});
