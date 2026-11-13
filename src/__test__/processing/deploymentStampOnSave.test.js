/* eslint-env jest */
import fs from "fs";
import path from "path";

jest.mock("../../utils/translation", () => { const t = (k) => k; return { __esModule: true, default: t, translation: t }; });

const { lastUpdatedText, parseStamp } = require("../../components/Processing/newui/StagePanel");
const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");
const pad = (n) => String(n).padStart(2, "0");
const localClock = (d) => `${ pad(d.getDate()) }/${ pad(d.getMonth() + 1) }/${ String(d.getFullYear()).slice(2) } key_at ${ pad(d.getHours()) }:${ pad(d.getMinutes()) }`;

/* v25 §AA / backend 385: the deployment sub-stage head moves on every save; the new `*_updated_at` values are UTC */
describe("deployment sub-stage stamp (CH 498)", () => {
    test("a UTC stamp without a zone is shown as the local clock; a plain value keeps the plain parse", () => {
        const utc = new Date("2026-11-03T09:05:00Z");
        expect(lastUpdatedText("2026-11-03 09:05:00", "Mubin Shaha", true)).toBe(`key_cr_last_updated ${ localClock(utc) } key_by Mubin S.`);
        expect(parseStamp("2026-11-03 09:05:00", true).getTime()).toBe(utc.getTime());
        expect(parseStamp("2026-11-03T09:05:00+08:00", true).getTime()).toBe(new Date("2026-11-03T09:05:00+08:00").getTime());
        const plain = new Date("2026-11-03 09:05:00");
        expect(parseStamp("2026-11-03 09:05:00").getTime()).toBe(plain.getTime());
        expect(lastUpdatedText("", "x", true)).toBeNull();
        expect(lastUpdatedText("2026-11-03 09:05:00", "", true)).not.toMatch(/key_by/);
    });
    test.each([
        ["deployment-tab/dhl-contract-tab/DHLContractTab.js", "dhl_contract"],
        ["deployment-tab/flight-details-tab/FlightDetailsTab.js", "flight_details"],
        ["deployment-tab/hkid-tab/HkidTab.js", "hkid"],
        ["deployment-tab/pickup-tab/PickupTab.js", "pickup"],
    ])("%s reads the save stamp first, the status stamp as the fallback", (file, sub) => {
        const src = read(`Views/Pages/ProcessingPage/processing-detail/${ file }`);
        expect(src).toContain(`updatedAt={ deploymentDocument?.${ sub }_updated_at ?? deploymentDocument?.${ sub }_last_status_updated_at }`);
        expect(src).toContain(`updatedBy={ deploymentDocument?.${ sub }_updated_by_info ?? deploymentDocument?.${ sub }_last_status_updated_name }`);
        expect(src).toContain(`utc={ Boolean(deploymentDocument?.${ sub }_updated_at) }`);
    });
});
