/* eslint-env jest */
import fs from "fs";
import path from "path";
import { listingTrackStyle, listingTableWidth } from "../../services/commonService";

const read = (rel) => fs.readFileSync(path.join(__dirname, "../../", rel), "utf8");

/* Shubham, 2 Nov 2026: listing tables fill the card; the spare width is shared in proportion to the tracks */
describe("listing tables fill the card width", () => {
    test("a track is the column's share and floor, not a cap", () => {
        const style = listingTrackStyle({ trackRole: "ref", trackWidth: 140 });
        expect(style.width).toBe(140);
        expect(style.minWidth).toBe(140);
        expect(style).not.toHaveProperty("maxWidth");
        expect(listingTableWidth([{ trackRole: "ref", trackWidth: 140 }, { trackRole: "name", trackWidth: 200 }])).toBe(340);
    });
    test("the shared track rule stretches the table; the tables set only the minimum width inline", () => {
        expect(read("components/ui/listing-tracks.css")).toMatch(/table\.mc-tracks \{[^}]*width: 100%/);
        [
            "components/common-table/CommonTable.js",
            "components/common-table/CommonTableCollapsible.js",
            "Views/Pages/Employer/newui/EmployerDashboardTable.js",
            "Views/Pages/JobOfferPage/newui/dashboard/JobOfferDashboardTable.js",
        ].forEach((rel) => {
            const src = read(rel);
            expect(src).toMatch(/\{ minWidth: trackedWidth \}/);
            expect(src).not.toMatch(/width: trackedWidth, minWidth/);
        });
        /* tables with more than one pinned column keep the capped width so the summed sticky offsets stay true */
        ["Views/Pages/Contract/dashboard/DashboardTable.js", "Views/Pages/Contract/dashboard/PaosRoster.js"].forEach((rel) => {
            expect(read(rel)).toMatch(/keepsCap \? \{ width: tableWidth, minWidth: tableWidth \} : \{ minWidth: tableWidth \}/);
        });
    });
    test("Job Offer applicants: the tracks are the minimum, the table fills the panel", () => {
        const css = read("Views/Pages/JobOfferPage/newui/record/job-offer-record.css");
        expect(css).toMatch(/\.jor \.wtable \{ width: 100%; min-width: calc\(/);
        expect(css).not.toMatch(/\.jor \.wtable \{ width: auto/);
        expect(css).not.toMatch(/\.nm \{[^}]*max-width: var\(--mc-colc-name-max\)/);
    });
});
