/* eslint-env jest */
import fs from "fs";
import path from "path";

/* i18n parity (27 Oct package, Final step): the admin locales, the i18n fallback snapshot (en, zh-HK), the sheet seed and
   the contract's fallback mirror move together. The copies are partial snapshots, so parity here means: a key the admin
   locales drop leaves every copy in the same commit (their older leftovers are a recorded baseline that may only shrink),
   and every Price List key (key_pl_*) is in the contract mirror with the same English.
   PL-S5 (old Fixed items form), PL-S6 (old promotion form) and PL-UI1 (the Conditional items tab) once left their
   retired keys in those copies; the list below names them. Kept: key_fixed_items, the Skills page's "Fixed Items" link. */

const ROOT = path.resolve(__dirname, "../../..");
const json = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const CONTRACT_MIRROR = path.join(contractDir, "src/i18n/fallback/en.json");
const hasContract = fs.existsSync(CONTRACT_MIRROR);
const EN = json("public/locales/en/translation.json");
const seedKeys = () => fs.readFileSync(path.join(ROOT, "scripts/admin-sheet-seed.csv"), "utf8").split("\n").map((line) => line.split(",")[0]).filter((k) => k.startsWith("key_"));
const BASELINE = json("src/__test__/settings/i18nOrphanBaseline.json");

const RETIRED = [
    "key_add_item_type", "key_enter_item_type", "key_enter_description", "key_conditional_items",
    "key_add_promotion", "key_update_promotion", "key_apply_to", "key_enter_promo_name", "key_promo_name_is_required",
    "key_promo_value", "key_promo_value_is_required", "key_promo_value_must_be_a_number", "key_promo_value_must_be_at_least_0",
    "key_promo_value_cannot_exceed_100", "key_promo_value_type_is_required", "key_worker_code_initials",
    "key_worker_code_initials_are_required", "key_invalid_worker_code_initials", "key_invalid_worker_type", "key_worker_type_is_required",
    "key_branch_location", "key_branch_location_is_required", "key_invalid_branch_location",
];

test("the retired Price List keys are gone from the locales, the fallback snapshot and the sheet seed", () => {
    const copies = {
        ...Object.fromEntries(["en", "in", "zh_CN", "zh_HK"].map((l) => [`locales/${ l }`, json(`public/locales/${ l }/translation.json`)])),
        ...Object.fromEntries(["en", "id", "zh-CN", "zh-HK"].map((l) => [`fallback/${ l }`, json(`src/i18n/fallback/${ l }.json`).strings])),
    };
    const seed = new Set(seedKeys());
    expect(RETIRED).toHaveLength(23);
    const left = [];
    for (const key of RETIRED) {
        Object.entries(copies).forEach(([name, strings]) => { if (key in strings) left.push(`${ name }: ${ key }`); });
        if (seed.has(key)) left.push(`seed: ${ key }`);
    }
    expect(left).toEqual([]);
});

test("no copy keeps a key the admin locales dropped beyond the recorded baseline (which may only shrink)", () => {
    const copies = {
        "src/i18n/fallback/en.json": Object.keys(json("src/i18n/fallback/en.json").strings),
        "src/i18n/fallback/zh-HK.json": Object.keys(json("src/i18n/fallback/zh-HK.json").strings),
        "scripts/admin-sheet-seed.csv": seedKeys(),
    };
    if (hasContract) copies["contract:src/i18n/fallback/en.json"] = Object.keys(JSON.parse(fs.readFileSync(CONTRACT_MIRROR, "utf8")).strings);
    const beyond = [];
    Object.entries(copies).forEach(([name, keys]) => {
        const known = new Set(BASELINE[name]);
        keys.filter((k) => !(k in EN) && !known.has(k)).forEach((k) => beyond.push(`${ name }: ${ k }`));
    });
    expect(beyond).toEqual([]);
});

(hasContract ? test : test.skip)("every Price List key is in the contract's fallback mirror with the same English", () => {
    const mirror = JSON.parse(fs.readFileSync(CONTRACT_MIRROR, "utf8")).strings;
    const keys = Object.keys(EN).filter((k) => k.startsWith("key_pl_"));
    expect(keys.length).toBeGreaterThan(250);
    expect(keys.filter((k) => mirror[k] !== EN[k])).toEqual([]);
    expect(Object.keys(mirror).filter((k) => k.startsWith("key_pl_") && !(k in EN))).toEqual([]);
});

test("the Skills page's Fixed Items link keeps its key", () => {
    expect(EN.key_fixed_items).toBe("Fixed Items");
    expect(fs.readFileSync(path.join(ROOT, "src/Views/Pages/SettingsPage/newui/price-list/skills/SkillsList.js"), "utf8")).toMatch(/translation\("key_fixed_items"\)/);
});
