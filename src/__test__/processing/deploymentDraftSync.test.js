/* eslint-env jest */
import fs from "fs";
import path from "path";
import { withFocusedText } from "../../Views/Pages/ProcessingPage/processing-detail/deployment-tab/draftSync";
import { DEPLOYMENT_TYPED_FIELDS } from "../../Views/Pages/ProcessingPage/processingConstants";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* 4 Nov (Mubin): a document refresh landing mid-typing no longer overwrites the SIM Card Number (or any blur-saved text) */
describe("deployment draft sync (CH 503)", () => {
    const server = { sent_on: "2034-01-19", sim_card_number: "4354654399", current_location_code: "MO" };
    const typing = { ...server, sim_card_number: "43546543" };
    test("the focused blur-saved input keeps its typed text; everything else follows the server", () => {
        const out = withFocusedText({ ...server, sent_on: "2034-01-20" }, typing, DEPLOYMENT_TYPED_FIELDS.dhl_contract, { id: "dhl-sim" });
        expect(out).toEqual({ sent_on: "2034-01-20", sim_card_number: "43546543", current_location_code: "MO" });
    });
    test("no focus, an unrelated element, or an unknown id: the server draft as is", () => {
        expect(withFocusedText(server, typing, DEPLOYMENT_TYPED_FIELDS.dhl_contract, null)).toBe(server);
        expect(withFocusedText(server, typing, DEPLOYMENT_TYPED_FIELDS.dhl_contract, { id: "dhl-loc" })).toBe(server);
        expect(withFocusedText(server, typing, DEPLOYMENT_TYPED_FIELDS.dhl_contract, { id: "" })).toBe(server);
        expect(withFocusedText(server, undefined, DEPLOYMENT_TYPED_FIELDS.dhl_contract, { id: "dhl-sim" })).toBe(server);
    });
    test("the id maps cover the blur-saved inputs of the three panels", () => {
        expect(DEPLOYMENT_TYPED_FIELDS.flight_details).toEqual({ "fl-no": "flight_number", "fl-fr": "from_place", "fl-to": "to_place" });
        expect(DEPLOYMENT_TYPED_FIELDS.hkid).toEqual({ "hk-sp": "other_branch" });
        Object.entries(DEPLOYMENT_TYPED_FIELDS).forEach(([sub, map]) => {
            const file = { dhl_contract: "dhl-contract-tab/DHLContractTab.js", flight_details: "flight-details-tab/FlightDetailsTab.js", hkid: "hkid-tab/HkidTab.js" }[sub];
            const src = read(`Views/Pages/ProcessingPage/processing-detail/deployment-tab/${ file }`);
            Object.entries(map).forEach(([id, key]) => {
                expect(src).toContain(`id="${ id }"`);
                expect(src).toContain(`${ key }:`);
            });
            expect(src).toContain(`withFocusedText(pendingDraft.current ? { ...draftOf(deploymentDocument), ...pendingDraft.current } : draftOf(deploymentDocument), prev, DEPLOYMENT_TYPED_FIELDS.${ sub })`);
        });
    });
});
