/* eslint-env jest */
import en from "../../i18n/fallback/en.json";
import id from "../../i18n/fallback/id.json";
import zhHK from "../../i18n/fallback/zh-HK.json";
import zhCN from "../../i18n/fallback/zh-CN.json";

/* I18nProvider reads `snapshot.strings` only: a key appended at the top level of the file never resolves (31 Oct: five
   keys added during the week sat outside `strings` and rendered as their key text wherever the OTA bundle lacked them) */
describe("fallback locale snapshots", () => {
    test.each([["en", en], ["id", id], ["zh-HK", zhHK], ["zh-CN", zhCN]])("%s has only schema / version / language / strings at the top level", (_, snap) => {
        expect(Object.keys(snap).sort()).toEqual(["language", "schema", "strings", "version"]);
        expect(typeof snap.strings).toBe("object");
    });
    test("the keys added this week live inside en.strings", () => {
        ["key_comment_should_not_exceed_1000_characters", "key_hrms_to_time_after_from", "key_hkid_format_invalid", "key_encash_type_is_required", "key_cr_reason_required_after_release", "key_version", "key_hide_history", "key_as_issued", "key_after_corrections", "key_correction", "key_release"]
            .forEach((key) => expect(typeof en.strings[key]).toBe("string"));
    });
});
