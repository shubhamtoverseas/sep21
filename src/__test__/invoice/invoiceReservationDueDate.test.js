import fs from "fs";
import path from "path";
import {
    RESERVATION_FEE_MIN_DUE_HOURS, reservationDueTooSoon, reservationMinDate, reservationTimeAllowed,
} from "../../Views/Pages/Invoice/reservationDueDate";

/* Reservation Fee — the Remaining Balance Due Date and time are at least 48 hours from now (user ruling 26 Oct 2026,
   Contract Invoice flow). The date picker starts on the first allowed day, the time list hides the slots under 48 hours,
   a too-soon pick is not sent (Confirm stays disabled) and the fields say why. The Invoice API refuses it too. */

const SRC = path.resolve(__dirname, "../..");
const read = (rel) => fs.readFileSync(path.join(SRC, rel), "utf8").replace(/\r\n/g, "\n");
const EN = JSON.parse(fs.readFileSync(path.resolve(SRC, "../public/locales/en/translation.json"), "utf8"));
const FALLBACK = JSON.parse(fs.readFileSync(path.resolve(SRC, "i18n/fallback/en.json"), "utf8")).strings;
const MESSAGE = "Remaining Balance Due Date must be at least 48 hours from now.";

const contractDir = process.env.CONTRACT_API_DIR || path.resolve(__dirname, "../../../../maidmatch-contract");
const hasContract = fs.existsSync(path.join(contractDir, "src/domain/invoice/reservationFee.ts"));

/* now: 14 Oct 2026 18:22, the user's own time (the screenshot's session) */
const now = new Date(2026, 9, 14, 18, 22, 0);
const slot = (h, m) => new Date(1970, 0, 1, h, m);

describe("Reservation Fee due date: at least 48 hours from now", () => {
    test("the earliest pick is now + 48 hours; exactly 48 hours is allowed", () => {
        expect(RESERVATION_FEE_MIN_DUE_HOURS).toBe(48);
        expect(reservationDueTooSoon("2026-10-14", "22:00", now)).toBe(true);
        expect(reservationDueTooSoon("2026-10-15", "18:30", now)).toBe(true);
        expect(reservationDueTooSoon("2026-10-16", "18:15", now)).toBe(true);
        expect(reservationDueTooSoon("2026-10-16", "18:22", now)).toBe(false);
        expect(reservationDueTooSoon("2026-10-16", "18:30", now)).toBe(false);
        expect(reservationDueTooSoon("2026-10-17", "00:00", now)).toBe(false);
        // nothing to judge until both are picked
        expect(reservationDueTooSoon("", "18:30", now)).toBe(false);
        expect(reservationDueTooSoon("2026-10-16", "", now)).toBe(false);
    });

    test("the date picker starts on the first day with an allowed time; the time list hides that day's earlier slots", () => {
        expect(reservationMinDate(now)).toEqual(new Date(2026, 9, 16));
        expect(reservationTimeAllowed("2026-10-16", slot(0, 0), now)).toBe(false);
        expect(reservationTimeAllowed("2026-10-16", slot(18, 15), now)).toBe(false);
        expect(reservationTimeAllowed("2026-10-16", slot(18, 30), now)).toBe(true);
        expect(reservationTimeAllowed("2026-10-17", slot(0, 0), now)).toBe(true);
        expect(reservationTimeAllowed("", slot(0, 0), now)).toBe(true);
    });

    test("the Contract Invoice review applies it: pickers, a too-soon pick not sent, the reason under the fields", () => {
        const src = read("Views/Pages/Invoice/add-contract-invoice/InvoiceReview.js");
        expect(src).toMatch(/minDate=\{ reservationMinDate\(\) \}/);
        expect(src).not.toMatch(/minDate=\{ new Date\(\) \}/);
        expect(src).toMatch(/filterTime=\{ \(slot\) => reservationTimeAllowed\(resDate, slot\) \}/);
        // INV-C4 Review: a too-soon pick is not sent (no due date), the reason stays under the fields
        expect(src).toMatch(/resDate && resTime && !reservationDueTooSoon\(resDate, resTime\) \? `\$\{ resDate \} \$\{ resTime \}:00` : ""/);
        expect(src).toMatch(/\{ reservationDueTooSoon\(resDate, resTime\) && <div className="err span2" role="alert">\{ t\("key_reservation_due_min_48_hours"\) \}<\/div> \}/);
        expect(EN.key_reservation_due_min_48_hours).toBe(MESSAGE);
        expect(FALLBACK.key_reservation_due_min_48_hours).toBe(MESSAGE);
        expect(read("Views/Pages/Invoice/new-ui-create.css")).toMatch(/\.invd \.res-grid \.err \{ color: var\(--st-danger\);/);
    });

    (hasContract ? test : test.skip)("the Invoice API has the same rule and message", () => {
        const domain = fs.readFileSync(path.join(contractDir, "src/domain/invoice/reservationFee.ts"), "utf8");
        expect(domain).toMatch(/export const RESERVATION_FEE_MIN_DUE_HOURS = 48;/);
        const api = JSON.parse(fs.readFileSync(path.join(contractDir, "src/locales/en.json"), "utf8"));
        expect(api.RESERVATION_FEE_DUE_DATE_TOO_SOON).toBe(MESSAGE);
    });
});
